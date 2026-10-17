import { describe, expect, it } from "vitest";
import { basename, dirname, joinPath, windowsToLinuxPath } from "../src/lib/path";

describe("path utils", () => {
  it("basename extracts last segment", () => {
    expect(basename("/home/user/projects/vision")).toBe("vision");
    expect(basename("C:\\Users\\HP\\Projects")).toBe("Projects");
  });

  it("dirname extracts parent", () => {
    expect(dirname("/home/user/projects/vision")).toBe("/home/user/projects");
    expect(dirname("C:\\Users\\HP\\Projects")).toBe("C:\\Users\\HP");
  });

  it("joinPath appends child", () => {
    expect(joinPath("/home/user", "projects")).toBe("/home/user/projects");
    expect(joinPath("C:\\Users", "Projects")).toBe("C:\\Users\\Projects");
  });

  it("joinPath with .. returns parent", () => {
    expect(joinPath("/home/user/projects", "..")).toBe("/home/user");
  });

  it("windowsToLinuxPath converts wsl.localhost UNC", () => {
    expect(windowsToLinuxPath("\\\\wsl.localhost\\Ubuntu\\home\\hp\\projects")).toBe(
      "/home/hp/projects"
    );
    expect(windowsToLinuxPath("\\\\wsl$\\Ubuntu\\home\\hp")).toBe("/home/hp");
  });

  it("windowsToLinuxPath returns null for non-UNC", () => {
    expect(windowsToLinuxPath("C:\\Users\\HP")).toBeNull();
  });
});
