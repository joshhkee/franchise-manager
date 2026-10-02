import { describe, expect, it } from "vitest";
import { decideAdmission } from "../lib/auth/allowlist";
import { githubIdentityFromUser, type SupabaseUserLike } from "../lib/auth/identity";
import { safeNextPath } from "../lib/auth/redirect";

const GITHUB_USER: SupabaseUserLike = {
  app_metadata: { provider: "github" },
  user_metadata: { user_name: "joshhkee" },
  identities: [
    {
      provider: "github",
      id: "21141160",
      identity_data: { sub: "21141160", user_name: "joshhkee", email: "owner@example.com" },
    },
  ],
};

describe("GitHub identity extraction", () => {
  it("reads the numeric provider id and login", () => {
    expect(githubIdentityFromUser(GITHUB_USER)).toEqual({
      githubUserId: 21141160,
      githubLogin: "joshhkee",
    });
  });

  it("prefers the numeric identity id over the login when only metadata is present", () => {
    const user: SupabaseUserLike = {
      identities: [{ provider: "github", id: "42", identity_data: { preferred_username: "someone" } }],
    };
    expect(githubIdentityFromUser(user)).toEqual({ githubUserId: 42, githubLogin: "someone" });
  });

  it("returns null for a non-GitHub account", () => {
    const user: SupabaseUserLike = {
      app_metadata: { provider: "email" },
      identities: [{ provider: "email", id: "not-a-number", identity_data: { email: "a@b.c" } }],
    };
    expect(githubIdentityFromUser(user)).toBeNull();
  });

  it("returns null when the id is not numeric and never guesses one", () => {
    const user: SupabaseUserLike = {
      identities: [{ provider: "github", id: "octocat", identity_data: { user_name: "octocat" } }],
    };
    expect(githubIdentityFromUser(user)).toBeNull();
    expect(githubIdentityFromUser(null)).toBeNull();
  });
});

describe("allowlist admission", () => {
  it("admits an allowlisted numeric id", () => {
    const decision = decideAdmission({ githubUserId: 21141160, githubLogin: "joshhkee" }, [
      { github_user_id: 21141160 },
    ]);
    expect(decision.allowed).toBe(true);
  });

  it("refuses an identity that is not on the list", () => {
    const decision = decideAdmission({ githubUserId: 999, githubLogin: "intruder" }, [
      { github_user_id: 21141160 },
    ]);
    expect(decision).toEqual({ allowed: false, reason: "not_allowlisted" });
  });

  it("refuses an unverifiable identity rather than defaulting to allowed", () => {
    expect(decideAdmission(null, [{ github_user_id: 21141160 }])).toEqual({
      allowed: false,
      reason: "no_github_identity",
    });
  });
});

describe("post-sign-in redirect guard", () => {
  it("keeps relative destinations and rejects external or protocol-relative ones", () => {
    expect(safeNextPath("/gm?view=assets")).toBe("/gm?view=assets");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("https://evil.example.com")).toBe("/");
    expect(safeNextPath("//evil.example.com")).toBe("/");
    expect(safeNextPath("/\\evil.example.com")).toBe("/");
  });
});
