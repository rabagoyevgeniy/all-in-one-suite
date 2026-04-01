import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SwimBeltBadge } from "@/components/SwimBeltBadge";
import { SWIM_BELTS } from "@/lib/constants";

describe("SwimBeltBadge", () => {
  it("renders correct belt name for valid belt id", () => {
    render(<SwimBeltBadge belt="sky_blue" />);
    expect(screen.getByText("Water Explorer")).toBeInTheDocument();
  });

  it("renders all belt ids without crash", () => {
    for (const belt of SWIM_BELTS) {
      const { unmount } = render(<SwimBeltBadge belt={belt.id} />);
      expect(screen.getByText(belt.name)).toBeInTheDocument();
      unmount();
    }
  });

  it("BUG CHECK: unknown belt id falls back to white belt, not crash", () => {
    // This catches if fallback logic breaks
    render(<SwimBeltBadge belt="nonexistent_belt" />);
    expect(screen.getByText(SWIM_BELTS[0].name)).toBeInTheDocument();
  });

  it("BUG CHECK: empty string belt id falls back gracefully", () => {
    render(<SwimBeltBadge belt="" />);
    expect(screen.getByText(SWIM_BELTS[0].name)).toBeInTheDocument();
  });

  it("renders different sizes without crash", () => {
    const { rerender } = render(<SwimBeltBadge belt="green" size="sm" />);
    expect(screen.getByText("Wave Rider")).toBeInTheDocument();

    rerender(<SwimBeltBadge belt="green" size="md" />);
    expect(screen.getByText("Wave Rider")).toBeInTheDocument();

    rerender(<SwimBeltBadge belt="green" size="lg" />);
    expect(screen.getByText("Wave Rider")).toBeInTheDocument();
  });
});
