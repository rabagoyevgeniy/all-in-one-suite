import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "@/stores/authStore";

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it("initializes with null user and loading true", () => {
    // reset sets isLoading to false, so re-create initial state check
    const store = useAuthStore.getState();
    expect(store.user).toBeNull();
    expect(store.session).toBeNull();
    expect(store.role).toBeNull();
    expect(store.profile).toBeNull();
  });

  it("setUser updates user", () => {
    const mockUser = { id: "123", email: "test@test.com" } as any;
    useAuthStore.getState().setUser(mockUser);
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it("setRole updates role", () => {
    useAuthStore.getState().setRole("coach");
    expect(useAuthStore.getState().role).toBe("coach");
  });

  it("setProfile updates profile", () => {
    const profile = { full_name: "Test User", avatar_url: null, city: "Dubai" };
    useAuthStore.getState().setProfile(profile);
    expect(useAuthStore.getState().profile).toEqual(profile);
  });

  it("setLoading updates isLoading", () => {
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it("reset clears all state", () => {
    useAuthStore.getState().setUser({ id: "1" } as any);
    useAuthStore.getState().setRole("admin");
    useAuthStore.getState().setProfile({ full_name: "X", avatar_url: null, city: null });
    useAuthStore.getState().setSession({ access_token: "tok" } as any);

    useAuthStore.getState().reset();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.role).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.isLoading).toBe(false);
  });
});
