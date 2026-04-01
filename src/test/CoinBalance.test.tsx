import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CoinBalance } from "@/components/CoinBalance";

describe("CoinBalance", () => {
  it("renders amount with locale formatting", () => {
    render(<CoinBalance amount={1500} />);
    // 1500 → "1,500" (en locale)
    expect(screen.getByText("1,500")).toBeInTheDocument();
  });

  it("renders zero amount", () => {
    render(<CoinBalance amount={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders large numbers correctly", () => {
    render(<CoinBalance amount={1000000} />);
    expect(screen.getByText("1,000,000")).toBeInTheDocument();
  });

  it("BUG CHECK: negative amount renders (no crash)", () => {
    // If DB returns negative balance due to race condition
    render(<CoinBalance amount={-50} />);
    expect(screen.getByText("-50")).toBeInTheDocument();
  });

  it("size prop changes rendering without crash", () => {
    const { rerender } = render(<CoinBalance amount={100} size="sm" />);
    expect(screen.getByText("100")).toBeInTheDocument();

    rerender(<CoinBalance amount={100} size="lg" />);
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("animated prop renders without crash", () => {
    render(<CoinBalance amount={500} animated />);
    expect(screen.getByText("500")).toBeInTheDocument();
  });
});
