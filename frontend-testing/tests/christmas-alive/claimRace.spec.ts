import { test, expect } from "@playwright/test";
// @ts-ignore -- plain ESM helper, no type declarations
import { createContext, callWebApi, getSubmission } from "../../christmas-alive/fixtures.mjs";

/**
 * The claim lock.
 *
 * Two sponsors opening the browse list at the same time and clicking the same
 * family is the one race in this system that matters: the loser must be told
 * clearly, not silently handed a family someone else is already shopping for.
 *
 * The lock is a unique index on the claim row, so the platform — not
 * application logic — decides the winner. These tests exist to prove that is
 * still true after any change to the claim WebAPI or the index.
 *
 * Fixtures live in an isolated TEST- season and are deleted afterwards; see
 * christmas-alive/fixtures.mjs for why that is safe to run against production.
 */
test.describe("Christmas Alive claim race", () => {
  let ctx: any;

  test.beforeAll(async () => {
    ctx = await createContext();
  });

  test.afterAll(async () => {
    await ctx?.teardown();
  });

  test("five simultaneous claims produce exactly one winner", async () => {
    const { sponsorshipId } = await ctx.seedFamily({ adults: 1, children: 2 });

    // Fire together. Sequential calls would pass even with no lock at all.
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        callWebApi("christmas-alive-claim", { sponsorshipId }),
      ),
    );

    const bodies = results.map(r => r.body);
    const winners = bodies.filter(b => b?.ok === true);
    const losers = bodies.filter(b => b?.ok === false);

    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(4);
    for (const loser of losers) {
      expect(loser.reason).toBe("ALREADY_CLAIMED");
    }

    // The record itself must agree with the response the winner was given.
    const row = await getSubmission(sponsorshipId);
    expect(row.values["Status"]).toBe("Adopted");
    expect(row.values["Sponsor Username"]).toBeTruthy();
    expect(row.values["Claimed At"]).toBeTruthy();
  });

  test("a family that is not Approved cannot be claimed at all", async () => {
    // Pending is the state a nomination sits in before review. Claiming one
    // would hand a sponsor a family nobody has vetted.
    const { sponsorshipId } = await ctx.seedFamily({ status: "Pending" });

    const { body } = await callWebApi("christmas-alive-claim", {
      sponsorshipId,
    });

    expect(body.ok).toBe(false);
    expect(body.reason).toBe("NOT_AVAILABLE");

    const row = await getSubmission(sponsorshipId);
    expect(row.values["Status"]).toBe("Pending");
    expect(row.values["Sponsor Username"] ?? "").toBe("");
  });

  test("claiming an already-adopted family is refused, not silently re-assigned", async () => {
    const { sponsorshipId } = await ctx.seedFamily({
      status: "Adopted",
      sponsorUsername: "someone.else@example.invalid",
    });

    const { body } = await callWebApi("christmas-alive-claim", {
      sponsorshipId,
    });

    expect(body.ok).toBe(false);

    // The original sponsor must survive the attempt untouched.
    const row = await getSubmission(sponsorshipId);
    expect(row.values["Sponsor Username"]).toBe("someone.else@example.invalid");
  });
});
