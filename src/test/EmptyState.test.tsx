import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmptyState } from "@/components/EmptyState";
import { Calendar, Swords, Users } from "lucide-react";

describe("EmptyState", () => {
  it("renders title and icon", () => {
    render(<EmptyState icon={Calendar} title="No lessons today" />);
    expect(screen.getByText("No lessons today")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <EmptyState
        icon={Users}
        title="No students"
        description="Students will appear after bookings"
      />
    );
    expect(screen.getByText("Students will appear after bookings")).toBeInTheDocument();
  });

  it("renders action button and calls onAction", () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        icon={Swords}
        title="No challenges"
        actionLabel="Go to Duels"
        onAction={onAction}
      />
    );
    const btn = screen.getByText("Go to Duels");
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("does not render button when no actionLabel", () => {
    render(<EmptyState icon={Calendar} title="Empty" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
