import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuthStore } from "@/stores/authStore";

function renderWithRouter(ui: React.ReactElement, initialRoute = "/") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>{ui}</MemoryRouter>
  );
}

describe("RoleGuard", () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it("shows loading spinner when isLoading is true", () => {
    useAuthStore.setState({ isLoading: true });
    renderWithRouter(
      <RoleGuard allowedRoles={["admin"]}>
        <div>Protected</div>
      </RoleGuard>
    );
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  });

  it("redirects to login when no user", () => {
    useAuthStore.setState({ isLoading: false, user: null });
    renderWithRouter(
      <RoleGuard allowedRoles={["admin"]}>
        <div>Protected</div>
      </RoleGuard>
    );
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  });

  it("renders children when user has allowed role", () => {
    useAuthStore.setState({
      isLoading: false,
      user: { id: "1" } as any,
      role: "admin",
    });
    renderWithRouter(
      <RoleGuard allowedRoles={["admin", "head_manager"]}>
        <div>Protected Content</div>
      </RoleGuard>
    );
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("redirects when user role is not in allowedRoles", () => {
    useAuthStore.setState({
      isLoading: false,
      user: { id: "1" } as any,
      role: "student",
    });
    renderWithRouter(
      <RoleGuard allowedRoles={["admin"]}>
        <div>Admin Only</div>
      </RoleGuard>
    );
    expect(screen.queryByText("Admin Only")).not.toBeInTheDocument();
  });

  it("user exists but role is null — redirects away (no access)", () => {
    useAuthStore.setState({
      isLoading: false,
      user: { id: "1" } as any,
      role: null,
    });
    renderWithRouter(
      <RoleGuard allowedRoles={["admin"]}>
        <div>Should Not Show</div>
      </RoleGuard>
    );
    // role is null → !role is true → Navigate to /
    expect(screen.queryByText("Should Not Show")).not.toBeInTheDocument();
  });

  it("allows multiple roles", () => {
    useAuthStore.setState({
      isLoading: false,
      user: { id: "1" } as any,
      role: "coach",
    });
    renderWithRouter(
      <RoleGuard allowedRoles={["coach", "parent", "student"]}>
        <div>Multi-Role Content</div>
      </RoleGuard>
    );
    expect(screen.getByText("Multi-Role Content")).toBeInTheDocument();
  });
});
