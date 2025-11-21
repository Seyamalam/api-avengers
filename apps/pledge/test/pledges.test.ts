import { describe, test, expect, mock } from "bun:test";
import { pledgeRoutes } from "../src/routes/pledges";

// Mock DB
mock.module("@careforall/db", () => ({
  db: {
    transaction: (cb: any) => cb({
      insert: () => ({
        values: () => ({
          returning: () => Promise.resolve([{ id: 1, amount: 100, status: 'PENDING' }])
        })
      })
    }),
    query: {
      pledges: {
        findMany: () => Promise.resolve([{ id: 1, amount: 100, status: 'PENDING' }])
      }
    }
  },
  pledges: {},
  outbox: {}
}));

describe("Pledge Routes", () => {
  test("POST / creates a pledge", async () => {
    const res = await pledgeRoutes.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: 1,
        userId: 1,
        amount: 100
      })
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBe(1);
  });

  test("GET /user/:userId returns user pledges", async () => {
    const res = await pledgeRoutes.request("/user/1");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].id).toBe(1);
  });
});
