import { describe, expect, it } from "vitest";

// ── Helper tests (no DB required) ─────────────────────────────────────────────

function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "E" {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "E";
}

describe("scoreToGrade", () => {
  it("returns A for score >= 85", () => {
    expect(scoreToGrade(85)).toBe("A");
    expect(scoreToGrade(100)).toBe("A");
    expect(scoreToGrade(90)).toBe("A");
  });

  it("returns B for score 70–84", () => {
    expect(scoreToGrade(70)).toBe("B");
    expect(scoreToGrade(80)).toBe("B");
    expect(scoreToGrade(84)).toBe("B");
  });

  it("returns C for score 55–69", () => {
    expect(scoreToGrade(55)).toBe("C");
    expect(scoreToGrade(65)).toBe("C");
    expect(scoreToGrade(69)).toBe("C");
  });

  it("returns D for score 40–54", () => {
    expect(scoreToGrade(40)).toBe("D");
    expect(scoreToGrade(50)).toBe("D");
    expect(scoreToGrade(54)).toBe("D");
  });

  it("returns E for score < 40", () => {
    expect(scoreToGrade(0)).toBe("E");
    expect(scoreToGrade(39)).toBe("E");
  });
});

// ── Total score calculation ────────────────────────────────────────────────────

function calcTotalScore(scores: (number | undefined)[]): number | undefined {
  const valid = scores.filter((s): s is number => s !== undefined);
  if (valid.length === 0) return undefined;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

describe("calcTotalScore", () => {
  it("returns average of provided scores", () => {
    expect(calcTotalScore([80, 70, 90, 60, 100])).toBe(80);
  });

  it("ignores undefined scores", () => {
    expect(calcTotalScore([80, undefined, 60])).toBe(70);
  });

  it("returns undefined when no scores provided", () => {
    expect(calcTotalScore([])).toBeUndefined();
    expect(calcTotalScore([undefined, undefined])).toBeUndefined();
  });

  it("rounds correctly", () => {
    expect(calcTotalScore([71, 72])).toBe(72); // 71.5 rounds to 72
  });
});

// ── Auth logout test ──────────────────────────────────────────────────────────

import { appRouter } from "./routers";
import { COOKIE_NAME } from "./context";
import type { TrpcContext } from "./context";

type CookieCall = { name: string; options: Record<string, unknown> };
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    email: "test@example.com",
    name: "Test User",
    role: "admin",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
  });
});

// ── Shared constants ──────────────────────────────────────────────────────────

import {
  SUBSCRIPTION_LABELS, GRADE_LABELS, GRADE_COLORS,
  PLAN_FEATURES, SUBSCRIPTION_TIERS, SUBSCRIPTION_PRICES,
} from "../shared/const";

describe("shared constants", () => {
  it("SUBSCRIPTION_LABELS has all 5 subscription types", () => {
    expect(Object.keys(SUBSCRIPTION_LABELS)).toHaveLength(5);
    expect(SUBSCRIPTION_LABELS.free).toBe("Free");
    expect(SUBSCRIPTION_LABELS.digital).toBe("Digital");
    expect(SUBSCRIPTION_LABELS.basis).toBe("Basis");
    expect(SUBSCRIPTION_LABELS.plus).toBe("Plus");
    expect(SUBSCRIPTION_LABELS.premium).toBe("Premium");
  });

  it("SUBSCRIPTION_TIERS has 5 tiers in correct order", () => {
    expect(SUBSCRIPTION_TIERS).toEqual(["free", "digital", "basis", "plus", "premium"]);
  });

  it("Free tier has no paid features", () => {
    const free = PLAN_FEATURES.free;
    expect(free.woningpaspoort).toBe(true);
    expect(free.woningScore).toBe(false);
    expect(free.documenten).toBe(false);
    expect(free.onderhoud).toBe(false);
    expect(free.planning).toBe(false);
  });

  it("Premium tier has all features", () => {
    const premium = PLAN_FEATURES.premium;
    Object.values(premium).forEach((v) => expect(v).toBe(true));
  });

  it("Tier features are cumulative (higher tiers have more features)", () => {
    const countFeatures = (tier: typeof SUBSCRIPTION_TIERS[number]) =>
      Object.values(PLAN_FEATURES[tier]).filter(Boolean).length;
    const counts = SUBSCRIPTION_TIERS.map(countFeatures);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    }
  });

  it("Free tier price is 0", () => {
    expect(SUBSCRIPTION_PRICES.free).toBe(0);
  });

  it("Premium tier price is highest", () => {
    const prices = SUBSCRIPTION_TIERS.map((t) => SUBSCRIPTION_PRICES[t]);
    expect(prices[prices.length - 1]).toBeGreaterThan(prices[0]);
  });

  it("GRADE_LABELS covers A through E", () => {
    ["A", "B", "C", "D", "E"].forEach((grade) => {
      expect(GRADE_LABELS[grade]).toBeDefined();
    });
  });

  it("GRADE_COLORS covers A through E with valid hex colors", () => {
    ["A", "B", "C", "D", "E"].forEach((grade) => {
      expect(GRADE_COLORS[grade]).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});
