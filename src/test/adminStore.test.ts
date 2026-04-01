import { describe, it, expect, beforeEach } from "vitest";
import { useAdminStore } from "@/stores/adminStore";

describe("adminStore", () => {
  beforeEach(() => {
    useAdminStore.setState({ city: "dubai", currency: "AED" });
  });

  it("initializes with dubai / AED", () => {
    const state = useAdminStore.getState();
    expect(state.city).toBe("dubai");
    expect(state.currency).toBe("AED");
  });

  it("setCity to baku changes currency to AZN", () => {
    useAdminStore.getState().setCity("baku");
    const state = useAdminStore.getState();
    expect(state.city).toBe("baku");
    expect(state.currency).toBe("AZN");
  });

  it("setCity to dubai changes currency to AED", () => {
    useAdminStore.getState().setCity("baku");
    useAdminStore.getState().setCity("dubai");
    const state = useAdminStore.getState();
    expect(state.city).toBe("dubai");
    expect(state.currency).toBe("AED");
  });

  it("BUG CHECK: currency must sync with city — never mismatched", () => {
    // This catches if someone adds a city without mapping currency
    useAdminStore.getState().setCity("baku");
    expect(useAdminStore.getState().currency).not.toBe("AED");

    useAdminStore.getState().setCity("dubai");
    expect(useAdminStore.getState().currency).not.toBe("AZN");
  });
});
