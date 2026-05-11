import { normalizeStageStatus } from "@/lib/data";

describe("normalizeStageStatus", () => {
  it("treats live/done labels as the canonical completed status", () => {
    expect(normalizeStageStatus("live")).toBe("active");
    expect(normalizeStageStatus("done")).toBe("active");
    expect(normalizeStageStatus("completed")).toBe("active");
    expect(normalizeStageStatus("active")).toBe("active");
  });

  it("keeps canonical open statuses stable", () => {
    expect(normalizeStageStatus("concept")).toBe("concept");
    expect(normalizeStageStatus("planned")).toBe("planned");
    expect(normalizeStageStatus("in-progress")).toBe("in-progress");
    expect(normalizeStageStatus("blocked")).toBe("blocked");
  });
});
