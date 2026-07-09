import { getPermissionsForRole, hasPermission, sanitizeString, safeEqual, generateToken } from "../packages/security";
import { Role } from "../packages/shared-types";

describe("RBAC", () => {
  it("returns correct permissions for admin role", () => {
    const perms = getPermissionsForRole("admin");
    expect(perms).toContain("read");
    expect(perms).toContain("write");
    expect(perms).toContain("execute");
    expect(perms).toContain("admin");
  });

  it("returns limited permissions for viewer", () => {
    const perms = getPermissionsForRole("viewer");
    expect(perms).toContain("read");
    expect(perms).not.toContain("write");
    expect(perms).not.toContain("admin");
  });

  it("hasPermission returns true when role grants it", () => {
    expect(hasPermission(["operator"] as Role[], "execute")).toBe(true);
    expect(hasPermission(["viewer"] as Role[], "execute")).toBe(false);
  });

  it("hasPermission returns true for any matching role in list", () => {
    expect(hasPermission(["viewer", "admin"] as Role[], "admin")).toBe(true);
  });
});

describe("sanitizeString", () => {
  it("removes HTML tags — entity-encodes angle brackets", () => {
    const result = sanitizeString("<script>alert(1)</script>");
    // The sanitizer entity-encodes < and > so no raw tags remain
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
  });

  it("entity-encodes angle brackets", () => {
    const result = sanitizeString("<b>bold</b>");
    expect(result).not.toContain("<b>");
    expect(result).toContain("&lt;");
    expect(result).toContain("&gt;");
  });

  it("trims whitespace", () => {
    expect(sanitizeString("  hello  ")).toBe("hello");
  });
});

describe("safeEqual", () => {
  it("returns true for identical strings", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
  });

  it("returns false for different strings", () => {
    expect(safeEqual("abc", "xyz")).toBe(false);
  });

  it("returns false for different lengths", () => {
    expect(safeEqual("abc", "ab")).toBe(false);
  });
});

describe("generateToken", () => {
  it("generates a hex string of double the requested byte length", () => {
    const token = generateToken(16);
    expect(token.length).toBe(32);
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it("generates unique tokens", () => {
    const t1 = generateToken();
    const t2 = generateToken();
    expect(t1).not.toBe(t2);
  });
});
