import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";
import { useAuthStore } from "@/stores/authStore";
import type { UserRole } from "@/lib/constants";

// Mock supabase to prevent real DB calls
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          is: () => Promise.resolve({ count: 0 }),
        }),
      }),
    }),
  },
}));

function renderNav(role: UserRole, path = "/") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuthStore.setState({ user: { id: "u1" } as any, role, isLoading: false });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <BottomNav role={role} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("BottomNav", () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it("renders correct nav items for admin role", () => {
    renderNav("admin");
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Coaches")).toBeInTheDocument();
    expect(screen.getByText("Clients")).toBeInTheDocument();
    expect(screen.getByText("Bookings")).toBeInTheDocument();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
  });

  it("renders correct nav items for student role", () => {
    renderNav("student");
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Duels")).toBeInTheDocument();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Learn")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("renders correct nav items for coach role", () => {
    renderNav("coach");
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Schedule")).toBeInTheDocument();
    expect(screen.getByText("Students")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("renders correct nav items for parent role", () => {
    renderNav("parent");
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Book")).toBeInTheDocument();
    expect(screen.getByText("Shop")).toBeInTheDocument();
    expect(screen.getByText("Coins")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
  });

  it("renders correct nav items for pro_athlete role", () => {
    renderNav("pro_athlete");
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Arena")).toBeInTheDocument();
    expect(screen.getByText("Shop")).toBeInTheDocument();
    expect(screen.getByText("Records")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("renders correct nav items for personal_manager role", () => {
    renderNav("personal_manager");
    expect(screen.getByText("Clients")).toBeInTheDocument();
    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.getByText("Earnings")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("BUG CHECK: unknown role falls back to student nav (not crash)", () => {
    // If DB returns unexpected role string
    renderNav("unknown_role" as UserRole);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Duels")).toBeInTheDocument();
  });

  it("renders 5 nav items for most roles (UX consistency)", () => {
    const fiveItemRoles: UserRole[] = ["admin", "coach", "parent", "student", "pro_athlete"];
    for (const role of fiveItemRoles) {
      const { unmount } = renderNav(role);
      const links = screen.getAllByRole("link");
      expect(links.length).toBe(5);
      unmount();
    }
  });

  it("personal_manager has 4 nav items", () => {
    renderNav("personal_manager");
    const links = screen.getAllByRole("link");
    expect(links.length).toBe(4);
  });
});
