import { describe, expect, it } from "vitest";
import { programHealth } from "@/domain/health";

/** The overview's colour follows from the data and nothing else. */

const calm = { overloaded: 0, highRisks: 0, warnings: 0, slipping: 0 };

describe("programme health", () => {
  it("is green when nothing needs attention", () => {
    expect(programHealth(calm)).toBe("good");
  });

  it("is amber for warnings in the backlog or a slipping milestone", () => {
    expect(programHealth({ ...calm, warnings: 2 })).toBe("watch");
    expect(programHealth({ ...calm, slipping: 1 })).toBe("watch");
  });

  it("is red for an overloaded quarter or a high risk, whatever else", () => {
    expect(programHealth({ ...calm, overloaded: 1, warnings: 3 })).toBe("bad");
    expect(programHealth({ ...calm, highRisks: 1 })).toBe("bad");
  });
});
