import { completionByDay, dailyPointsForUser, dailyStreak, shiftDay, parseDailyKey } from "@/lib/dailyChecklist";

const K = (u: string, d: string, i: number | string) => `${u}::${d}::${i}`;

describe("parseDailyKey", () => {
  it("splits userId / day / itemId (userId has no ::)", () => {
    expect(parseDailyKey("abhishek::2026-07-22::1782")).toEqual({ userId: "abhishek", day: "2026-07-22", itemId: "1782" });
  });
  it("returns null for malformed keys", () => {
    expect(parseDailyKey("nope")).toBeNull();
    expect(parseDailyKey("a::b")).toBeNull();
  });
});

describe("completionByDay", () => {
  it("buckets a user's completions by day and ignores other users", () => {
    const done = {
      [K("abhishek", "2026-07-20", 1)]: 2,
      [K("abhishek", "2026-07-20", 2)]: 3,
      [K("abhishek", "2026-07-21", 1)]: 2,
      [K("anna", "2026-07-20", 9)]: 5, // different user — ignored
    };
    const byDay = completionByDay("abhishek", done);
    expect(byDay.get("2026-07-20")).toEqual({ count: 2, points: 5 });
    expect(byDay.get("2026-07-21")).toEqual({ count: 1, points: 2 });
    expect(byDay.has("anna")).toBe(false);
  });
});

describe("dailyPointsForUser (per-day cap)", () => {
  it("sums uncapped when a day is under the cap", () => {
    const done = { [K("u", "2026-07-20", 1)]: 2, [K("u", "2026-07-20", 2)]: 3, [K("u", "2026-07-21", 1)]: 1 };
    expect(dailyPointsForUser("u", done, 20)).toBe(6);
  });
  it("caps each day independently", () => {
    const done = {
      [K("u", "2026-07-20", 1)]: 15,
      [K("u", "2026-07-20", 2)]: 15, // day total 30 → capped to 20
      [K("u", "2026-07-21", 1)]: 5,  // 5 → uncapped
    };
    expect(dailyPointsForUser("u", done, 20)).toBe(25);
  });
  it("is 0 for a user with no completions", () => {
    expect(dailyPointsForUser("ghost", { [K("u", "2026-07-20", 1)]: 5 }, 20)).toBe(0);
  });
});

describe("shiftDay", () => {
  it("steps calendar days, crossing month boundaries", () => {
    expect(shiftDay("2026-07-01", -1)).toBe("2026-06-30");
    expect(shiftDay("2026-07-31", 1)).toBe("2026-08-01");
  });
});

describe("dailyStreak", () => {
  const days = (...ds: string[]) => ds.reduce((acc, d, i) => ({ ...acc, [K("u", d, i)]: 1 }), {} as Record<string, number>);

  it("counts consecutive days ending today", () => {
    expect(dailyStreak("u", days("2026-07-20", "2026-07-21", "2026-07-22"), "2026-07-22")).toBe(3);
  });
  it("does not break when today isn't done yet (counts from yesterday)", () => {
    expect(dailyStreak("u", days("2026-07-20", "2026-07-21"), "2026-07-22")).toBe(2);
  });
  it("breaks after a fully missed day", () => {
    // 07-22 today empty, 07-21 empty (missed) → streak dead even though 07-20 done
    expect(dailyStreak("u", days("2026-07-20"), "2026-07-22")).toBe(0);
  });
  it("is 0 with no completions", () => {
    expect(dailyStreak("u", {}, "2026-07-22")).toBe(0);
  });
});
