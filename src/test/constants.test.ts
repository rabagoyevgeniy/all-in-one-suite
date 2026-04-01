import { describe, it, expect } from "vitest";
import {
  calculateXP,
  getBeltByXP,
  getBeltIndex,
  SWIM_BELTS,
  ROLE_ROUTES,
} from "@/lib/constants";

describe("calculateXP", () => {
  it("returns 0 for empty student", () => {
    expect(calculateXP({})).toBe(0);
  });

  it("gives 15 XP per win + 5 per duel played", () => {
    expect(calculateXP({ wins: 1, losses: 0 })).toBe(20); // 15 + 5
  });

  it("gives 5 XP per loss (participation)", () => {
    expect(calculateXP({ wins: 0, losses: 1 })).toBe(5);
  });

  it("adds 0.05x coins earned", () => {
    expect(calculateXP({ total_coins_earned: 1000 })).toBe(50);
  });

  it("combines all factors correctly", () => {
    const xp = calculateXP({ wins: 10, losses: 5, total_coins_earned: 2000 });
    // 10*15 + 15*5 + 2000*0.05 = 150 + 75 + 100 = 325
    expect(xp).toBe(325);
  });

  it("handles null values as zero", () => {
    expect(calculateXP({ wins: null, losses: null, total_coins_earned: null })).toBe(0);
  });
});

describe("getBeltByXP", () => {
  it("returns white belt for 0 XP", () => {
    expect(getBeltByXP(0).id).toBe("white");
  });

  it("returns sky_blue belt at 1500 XP", () => {
    expect(getBeltByXP(1500).id).toBe("sky_blue");
  });

  it("returns black belt at 30000+ XP", () => {
    expect(getBeltByXP(30000).id).toBe("black");
    expect(getBeltByXP(50000).id).toBe("black");
  });

  it("returns correct belt at each threshold", () => {
    for (const belt of SWIM_BELTS) {
      expect(getBeltByXP(belt.minXP).id).toBe(belt.id);
    }
  });

  it("stays in previous belt just below threshold", () => {
    expect(getBeltByXP(1499).id).toBe("white");
    expect(getBeltByXP(3999).id).toBe("sky_blue");
  });
});

describe("getBeltIndex", () => {
  it("returns 0 for 0 XP", () => {
    expect(getBeltIndex(0)).toBe(0);
  });

  it("returns last index for max XP", () => {
    expect(getBeltIndex(50000)).toBe(SWIM_BELTS.length - 1);
  });
});

describe("ROLE_ROUTES", () => {
  it("maps admin and head_manager to /admin", () => {
    expect(ROLE_ROUTES.admin).toBe("/admin");
    expect(ROLE_ROUTES.head_manager).toBe("/admin");
  });

  it("has route for every role", () => {
    const roles = ["admin", "head_manager", "personal_manager", "coach", "parent", "student", "pro_athlete"] as const;
    for (const role of roles) {
      expect(ROLE_ROUTES[role]).toBeDefined();
      expect(ROLE_ROUTES[role].startsWith("/")).toBe(true);
    }
  });
});
