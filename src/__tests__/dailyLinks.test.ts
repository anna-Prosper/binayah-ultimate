import { mergeStateWithPatch } from "@/lib/pipelineStateMerge";
import { PatchBodySchema } from "@/lib/patchSchema";

const KEY = "abhishek::2026-09-10::1784692711135";
const url1 = "https://www.tumblr.com/binayahpropertyhub/827259096667488256/lawncrest";
const url2 = "https://share.google/7TKeZMTiQklSrkzCq";
const url3 = "https://medium.com/@binayah/some-article";

describe("dailyLinks end-to-end (schema + server merge) — the exact user flow", () => {
  test("schema accepts a multi-link dailyLinks patch", () => {
    const r = PatchBodySchema.safeParse({ dailyLinks: { [KEY]: [url1, url2, url3] }, updatedAt: 1 });
    expect(r.success).toBe(true);
  });

  test("add link1, then add link2 (full array) → BOTH persist (the reported bug)", () => {
    // 1) user adds first link — client sends dailyLinks with [url1]
    let state = mergeStateWithPatch({}, { dailyLinks: { [KEY]: [url1] } });
    expect((state.dailyLinks as Record<string,string[]>)[KEY]).toEqual([url1]);
    // 2) user adds second link — with the buildFullState fix the client now sends the
    //    FRESH full array [url1, url2]; merge must keep both.
    state = mergeStateWithPatch(state, { dailyLinks: { [KEY]: [url1, url2] } });
    expect((state.dailyLinks as Record<string,string[]>)[KEY]).toEqual([url1, url2]);
  });

  test("links for other items are untouched when one item's links change", () => {
    const other = "abhishek::2026-09-10::1784692711136";
    let state = mergeStateWithPatch({}, { dailyLinks: { [KEY]: [url1], [other]: [url2] } });
    state = mergeStateWithPatch(state, { dailyLinks: { [KEY]: [url1, url3] } });
    const dl = state.dailyLinks as Record<string,string[]>;
    expect(dl[KEY]).toEqual([url1, url3]);
    expect(dl[other]).toEqual([url2]); // untouched
  });

  test("removing the last link clears the key via _deletes", () => {
    let state = mergeStateWithPatch({}, { dailyLinks: { [KEY]: [url1] } });
    state = mergeStateWithPatch(state, {}, { dailyLinks: [KEY] });
    expect((state.dailyLinks as Record<string,string[]>)[KEY]).toBeUndefined();
  });
});
