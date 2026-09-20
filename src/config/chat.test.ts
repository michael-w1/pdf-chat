import { describe, it, expect } from "vitest";
import { parseSourcePages } from "./chat";

describe("parseSourcePages", () => {
    it("returns an empty list for a missing or empty header", () => {
        expect(parseSourcePages(null)).toEqual([]);
        expect(parseSourcePages(undefined)).toEqual([]);
        expect(parseSourcePages("")).toEqual([]);
    });

    it("parses, de-duplicates, and sorts page numbers", () => {
        expect(parseSourcePages("7, 3,3,1")).toEqual([1, 3, 7]);
    });

    it("ignores values that are not positive integers", () => {
        expect(parseSourcePages("2,abc,0,-1,2.5,4")).toEqual([2, 4]);
    });
});
