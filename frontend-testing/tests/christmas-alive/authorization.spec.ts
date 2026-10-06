import { test, expect } from "@playwright/test";
// @ts-ignore -- plain ESM helper, no type declarations
import { createContext, callWebApi } from "../../christmas-alive/fixtures.mjs";

/**
 * The PII boundary.
 *
 * A sponsored family's name, street address and phone number are the most
 * sensitive data in this application, and the whole design rests on one rule:
 * you only see them once you are the sponsor of record. These tests attack that
 * rule directly rather than trusting the UI to hide things, because the UI is
 * not what protects it — the packet WebAPI is.
 *
 * A second, non-admin account is needed to prove the negative case. Set
 * PW_OTHER_USERNAME / PW_OTHER_PASSWORD to a plain authenticated user with no
 * Christmas Alive admin membership. Without it the impersonation tests skip
 * rather than passing vacuously, because a test that cannot fail is worse than
 * no test.
 */
const OTHER = {
  username: process.env.PW_OTHER_USERNAME || "",
  password: process.env.PW_OTHER_PASSWORD || "",
};
const haveOther = Boolean(OTHER.username && OTHER.password);

/** Anything that would identify a real family. */
const PII_KEYS = [
  "First Name",
  "Last Name",
  "Address Line 1",
  "Address Line 2",
  "Phone Number",
  "Email",
  "Zip",
];

test.describe("Christmas Alive authorization", () => {
  let ctx: any;

  test.beforeAll(async () => {
    ctx = await createContext();
  });

  test.afterAll(async () => {
    await ctx?.teardown();
  });

  test("the browse list carries no identifying detail for anyone", async () => {
    await ctx.seedFamily({ adults: 2, children: 3 });

    const { body } = await callWebApi("christmas-alive-packet", {
      listOnly: true,
    }).catch(() => ({ body: null }));

    // The browse list is what every signed-in user can see. Whatever shape it
    // returns, it must never carry a name, a street or a phone number.
    const serialized = JSON.stringify(body ?? {});
    for (const key of PII_KEYS) {
      expect(
        serialized.includes(key),
        `browse payload must not contain "${key}"`,
      ).toBe(false);
    }
    expect(serialized).not.toMatch(/\d{3}-\d{3}-\d{4}/); // a phone number
  });

  test.describe("as a different signed-in user", () => {
    test.skip(
      !haveOther,
      "Set PW_OTHER_USERNAME / PW_OTHER_PASSWORD to run the impersonation tests.",
    );

    test("a non-sponsor cannot read a packet, and gets no family data", async () => {
      const { sponsorshipId } = await ctx.seedFamily({
        status: "Adopted",
        sponsorUsername: "sponsor.of.record@example.invalid",
      });

      const { body, raw } = await callWebApi(
        "christmas-alive-packet",
        { sponsorshipId },
        OTHER,
      );

      expect(body?.ok).toBe(false);
      expect(body?.reason).toBe("NOT_AUTHORIZED");

      // Refusing is not enough — the refusal must not leak the payload it
      // refused to serve.
      for (const key of PII_KEYS) {
        expect(
          raw.includes(key),
          `refusal must not contain "${key}"`,
        ).toBe(false);
      }
    });

    test("a non-admin cannot approve a nomination", async () => {
      const { sponsorshipId } = await ctx.seedFamily({ status: "Pending" });

      const { body } = await callWebApi(
        "christmas-alive-approve",
        { sponsorshipId, action: "approve" },
        OTHER,
      );

      // However it refuses, it must not have approved anything.
      expect(body?.ok).not.toBe(true);
    });

    test("claiming is attributed to the caller, not to a spoofed username", async () => {
      const { sponsorshipId } = await ctx.seedFamily();

      // The claim tree reads @requested_by['username'] and ignores the body,
      // so a supplied username must have no effect.
      await callWebApi(
        "christmas-alive-claim",
        {
          sponsorshipId,
          sponsorUsername: "victim@example.invalid",
          // Valid contact, so the claim reaches the attribution step rather
          // than being refused as CONTACT_REQUIRED before it.
          sponsorName: "Test Sponsor",
          sponsorPhone: "301-555-0100",
        },
        OTHER,
      );

      // @ts-ignore
      const { getSubmission } = await import(
        "../../christmas-alive/fixtures.mjs"
      );
      const row = await getSubmission(sponsorshipId);
      expect(row.values["Sponsor Username"]).not.toBe("victim@example.invalid");
      if (row.values["Sponsor Username"]) {
        expect(row.values["Sponsor Username"]).toBe(OTHER.username);
      }
    });
  });
});
