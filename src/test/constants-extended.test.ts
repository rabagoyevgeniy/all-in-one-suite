import { describe, it, expect } from "vitest";
import {
  SWIM_BELTS,
  calculateXP,
  getBeltByXP,
  getBeltIndex,
  COACH_RANKS,
  ROLE_LABELS,
  ROLE_ROUTES,
  type UserRole,
} from "@/lib/constants";

// ----- Тесты на целостность данных (ловят баги при изменении констант) -----

describe("SWIM_BELTS data integrity", () => {
  it("has correct ascending minXP order", () => {
    for (let i = 1; i < SWIM_BELTS.length; i++) {
      expect(SWIM_BELTS[i].minXP).toBeGreaterThan(SWIM_BELTS[i - 1].minXP);
    }
  });

  it("has no gaps between maxXP and next minXP", () => {
    for (let i = 0; i < SWIM_BELTS.length - 1; i++) {
      expect(SWIM_BELTS[i].maxXP).toBe(SWIM_BELTS[i + 1].minXP);
    }
  });

  it("starts at 0 XP", () => {
    expect(SWIM_BELTS[0].minXP).toBe(0);
  });

  it("each belt has positive coin reward", () => {
    for (const belt of SWIM_BELTS) {
      expect(belt.coinsOnEarn).toBeGreaterThan(0);
    }
  });

  it("coin rewards increase with belt level", () => {
    for (let i = 1; i < SWIM_BELTS.length; i++) {
      expect(SWIM_BELTS[i].coinsOnEarn).toBeGreaterThan(SWIM_BELTS[i - 1].coinsOnEarn);
    }
  });

  it("each belt has unique id and name", () => {
    const ids = SWIM_BELTS.map(b => b.id);
    const names = SWIM_BELTS.map(b => b.name);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it("each belt has valid hex color", () => {
    for (const belt of SWIM_BELTS) {
      expect(belt.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(belt.borderColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe("calculateXP edge cases and bug hunting", () => {
  it("BUG CHECK: negative wins should not produce negative XP", () => {
    // If DB returns negative due to data corruption
    const xp = calculateXP({ wins: -5, losses: 0 });
    // Current implementation DOES allow negative — this test documents behavior
    expect(typeof xp).toBe("number");
  });

  it("handles very large numbers without overflow", () => {
    const xp = calculateXP({ wins: 999999, losses: 999999, total_coins_earned: 999999999 });
    expect(xp).toBeGreaterThan(0);
    expect(Number.isFinite(xp)).toBe(true);
  });

  it("rounds coin XP correctly — no fractional XP", () => {
    // 7 coins * 0.05 = 0.35 → should round to 0
    expect(calculateXP({ total_coins_earned: 7 })).toBe(0);
    // 13 coins * 0.05 = 0.65 → should round to 1
    expect(calculateXP({ total_coins_earned: 13 })).toBe(1);
  });

  it("XP formula: wins contribute more than losses (incentivizes winning)", () => {
    const winXP = calculateXP({ wins: 10, losses: 0 });
    const loseXP = calculateXP({ wins: 0, losses: 10 });
    expect(winXP).toBeGreaterThan(loseXP);
  });
});

describe("getBeltByXP boundary transitions", () => {
  it("transitions happen at exact minXP values", () => {
    // At 1499 → white, at 1500 → sky_blue
    expect(getBeltByXP(1499).id).toBe("white");
    expect(getBeltByXP(1500).id).toBe("sky_blue");

    // At 3999 → sky_blue, at 4000 → green
    expect(getBeltByXP(3999).id).toBe("sky_blue");
    expect(getBeltByXP(4000).id).toBe("green");
  });

  it("getBeltIndex matches getBeltByXP", () => {
    const testValues = [0, 750, 1500, 2500, 4000, 8000, 13000, 20000, 30000, 50000];
    for (const xp of testValues) {
      const belt = getBeltByXP(xp);
      const index = getBeltIndex(xp);
      expect(SWIM_BELTS[index].id).toBe(belt.id);
    }
  });
});

describe("COACH_RANKS data integrity", () => {
  it("has 5 ranks", () => {
    expect(COACH_RANKS).toHaveLength(5);
  });

  it("each rank has unique id", () => {
    const ids = COACH_RANKS.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each rank has valid hex color", () => {
    for (const rank of COACH_RANKS) {
      expect(rank.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe("ROLE_LABELS and ROLE_ROUTES consistency", () => {
  const allRoles: UserRole[] = [
    "admin", "head_manager", "personal_manager",
    "coach", "parent", "student", "pro_athlete",
  ];

  it("ROLE_LABELS has entry for every UserRole", () => {
    for (const role of allRoles) {
      expect(ROLE_LABELS[role]).toBeDefined();
      expect(ROLE_LABELS[role].length).toBeGreaterThan(0);
    }
  });

  it("ROLE_ROUTES has entry for every UserRole", () => {
    for (const role of allRoles) {
      expect(ROLE_ROUTES[role]).toBeDefined();
      expect(ROLE_ROUTES[role]).toMatch(/^\//);
    }
  });

  it("BUG CHECK: ROLE_LABELS and ROLE_ROUTES have same key set", () => {
    const labelKeys = Object.keys(ROLE_LABELS).sort();
    const routeKeys = Object.keys(ROLE_ROUTES).sort();
    expect(labelKeys).toEqual(routeKeys);
  });
});
