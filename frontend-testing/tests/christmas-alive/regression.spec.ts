import { test, expect } from "@playwright/test";
import {
  // @ts-ignore -- plain ESM helper, no type declarations
  createContext,
  getSubmission,
  updateSubmission,
  buildRoster,
  // @ts-ignore
} from "../../christmas-alive/fixtures.mjs";

/**
 * The household counting rules, as the WORKFLOW implements them.
 *
 * WHY THESE EXIST SEPARATELY FROM THE UNIT TESTS: the counting rules are
 * written twice. `householdCounts()` in portal/src/helpers/christmasAlive.js is
 * covered by frontend-testing/christmas-alive/helpers.test.mjs and is what the
 * portal renders from. The "Sync Family To Sponsorship" workflow has a second,
 * independent Ruby translation of the same rules, and that is what the browse
 * list and the packet email end up showing. Nothing structural keeps the two in
 * step — only these tests do. A sponsor being told a family has three children
 * when it has four is a real failure, not a cosmetic one.
 *
 * Each test edits a fixture family and waits for the workflow to write the
 * sponsorship row, which is asynchronous.
 */

/** Poll until `check` passes or we give up. Workflows are not instant. */
const waitFor = async (
  read: () => Promise<any>,
  check: (v: any) => boolean,
  { attempts = 20, intervalMs = 1500 } = {},
) => {
  let last: any = null;
  for (let i = 0; i < attempts; i += 1) {
    last = await read();
    if (check(last)) return last;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(
    `Condition never met after ${attempts} attempts. Last value:\n${JSON.stringify(last?.values ?? last, null, 2)}`,
  );
};

const countsOf = (row: any) => ({
  members: row.values["Total Members"],
  adults: row.values["Total Adults"],
  children: row.values["Total Children"],
});

test.describe("Christmas Alive count sync", () => {
  let ctx: any;

  test.beforeAll(async () => {
    ctx = await createContext();
  });

  test.afterAll(async () => {
    await ctx?.teardown();
  });

  test("editing the roster updates the sponsorship snapshot", async () => {
    const { familyId, sponsorshipId } = await ctx.seedFamily({
      adults: 1,
      children: 1,
    });

    // Two adults besides the head, plus three children.
    const roster = buildRoster({ adults: 2, children: 3 });
    await updateSubmission(familyId, {
      "Family Members JSON": JSON.stringify(roster),
    });

    const row = await waitFor(
      () => getSubmission(sponsorshipId),
      r => r.values["Total Children"] === "3",
    );

    // The head of household is a field on the record, not a roster row, so it
    // is added back: 5 roster rows + 1 head = 6 members, 2 + 1 = 3 adults.
    expect(countsOf(row)).toEqual({
      members: "6",
      adults: "3",
      children: "3",
    });
  });

  test("18 is a child and 19 is an adult", async () => {
    const { familyId, sponsorshipId } = await ctx.seedFamily({ children: 1 });

    await updateSubmission(familyId, {
      "Family Members JSON": JSON.stringify(
        buildRoster({ adults: 0, children: 2, ages: [18, 19] }),
      ),
    });

    const row = await waitFor(
      () => getSubmission(sponsorshipId),
      r => r.values["Total Members"] === "3",
    );

    // Both rows are typed Child, but the rule is age, not label: the 19 year
    // old counts as an adult.
    expect(countsOf(row)).toEqual({
      members: "3",
      adults: "2",
      children: "1",
    });
  });

  test("a newborn counts as a child and a missing age does not", async () => {
    const { familyId, sponsorshipId } = await ctx.seedFamily();

    // Age 0 is the case a naive truthiness check gets wrong; a blank age is
    // the case a naive Number() coercion gets wrong (Number('') === 0).
    const roster = [
      { type: "Child", firstName: "Baby", lastName: "ZZTEST-R", age: "0" },
      { type: "Adult", firstName: "Unknown", lastName: "ZZTEST-R", age: "" },
    ];
    await updateSubmission(familyId, {
      "Family Members JSON": JSON.stringify(roster),
    });

    const row = await waitFor(
      () => getSubmission(sponsorshipId),
      r => r.values["Total Members"] === "3",
    );

    expect(countsOf(row)).toEqual({
      members: "3",
      adults: "2",
      children: "1",
    });
  });

  test("a stray Head of Household row is not counted twice", async () => {
    const { familyId, sponsorshipId } = await ctx.seedFamily();

    // Rosters written before the head became a record field contain this row.
    // Counting it would inflate every household by one and show the head twice.
    const roster = [
      { type: "Head of Household", firstName: "Fixture", lastName: "ZZTEST-R", age: "40" },
      { type: "Child", firstName: "Kid", lastName: "ZZTEST-R", age: "9" },
    ];
    await updateSubmission(familyId, {
      "Family Members JSON": JSON.stringify(roster),
    });

    const row = await waitFor(
      () => getSubmission(sponsorshipId),
      r => r.values["Total Children"] === "1",
    );

    expect(countsOf(row)).toEqual({
      members: "2",
      adults: "1",
      children: "1",
    });
  });

  test("an empty roster is a one-person household, but a missing one holds the counts", async () => {
    const { familyId, sponsorshipId } = await ctx.seedFamily({
      adults: 2,
      children: 2,
    });
    const before = countsOf(await getSubmission(sponsorshipId));

    // Explicitly empty: the family really is one person.
    await updateSubmission(familyId, { "Family Members JSON": "[]" });
    const emptied = await waitFor(
      () => getSubmission(sponsorshipId),
      r => r.values["Total Members"] === "1",
    );
    expect(countsOf(emptied)).toEqual({
      members: "1",
      adults: "1",
      children: "0",
    });

    // Absent: some family records predate the roster field while their
    // sponsorship holds correct counts taken from the nomination. Deriving from
    // nothing would overwrite those with 1/1/0, so the counts must be left
    // alone — only the location fields sync.
    await updateSubmission(sponsorshipId, {
      "Total Members": before.members,
      "Total Adults": before.adults,
      "Total Children": before.children,
    });
    await updateSubmission(familyId, {
      "Family Members JSON": "",
      City: "Thurmont",
    });

    const held = await waitFor(
      () => getSubmission(sponsorshipId),
      r => r.values["City"] === "Thurmont",
    );
    expect(countsOf(held)).toEqual(before);
  });

  test("location corrections reach the sponsorship row", async () => {
    const { familyId, sponsorshipId } = await ctx.seedFamily({
      city: "Frederick",
      county: "Frederick County",
      nativeLanguage: "English",
    });

    await updateSubmission(familyId, {
      City: "Brunswick",
      County: "Washington County",
      "Native Language": "Spanish",
    });

    const row = await waitFor(
      () => getSubmission(sponsorshipId),
      r => r.values["City"] === "Brunswick",
    );

    expect(row.values["County"]).toBe("Washington County");
    expect(row.values["Native Language"]).toBe("Spanish");
  });
});
