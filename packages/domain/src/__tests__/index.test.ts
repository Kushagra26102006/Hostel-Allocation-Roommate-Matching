import { describe, it, expect } from "vitest";
import { createHostelId, type Hostel } from "../index.js";

describe("@hostelhub/domain", () => {
  it("createHostelId returns a branded string", () => {
    const id = createHostelId("h-001");
    expect(id).toBe("h-001");
  });

  it("Hostel type can be constructed correctly", () => {
    const hostel: Hostel = {
      id: createHostelId("h-001"),
      name: "Sunrise Hostel",
      city: "Bangalore",
      totalBeds: 50,
    };
    expect(hostel.name).toBe("Sunrise Hostel");
  });
});
