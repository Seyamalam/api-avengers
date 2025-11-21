import { describe, test, expect, mock } from "bun:test";
import { campaignRoutes } from "../src/routes/campaigns";

// Mock DB and Redis
mock.module("@careforall/db", () => ({
  db: {
    insert: () => ({
      values: () => ({
        returning: () => Promise.resolve([{ id: 1, title: "Test", goalAmount: 100 }])
      })
    }),
    query: {
      campaigns: {
        findMany: () => Promise.resolve([]),
        findFirst: () => Promise.resolve({ id: 1, title: "Test" })
      }
    },
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([{ id: 1, title: "Updated" }])
        })
      })
    })
  },
  campaigns: {}
}));

mock.module("ioredis", () => {
  return class Redis {
    get() { return Promise.resolve(null); }
    set() { return Promise.resolve("OK"); }
    del() { return Promise.resolve(1); }
  };
});

mock.module("@careforall/events", () => ({
  natsClient: {
    publish: () => Promise.resolve()
  }
}));

describe("Campaign Routes", () => {
  test("POST / creates a campaign", async () => {
    const res = await campaignRoutes.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test Campaign",
        description: "Description",
        goalAmount: 1000
      })
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBe(1);
  });

  test("GET /:id returns a campaign", async () => {
    const res = await campaignRoutes.request("/1");
    expect(res.status).toBe(200);
  });
  
  test("PUT /:id updates a campaign", async () => {
      const res = await campaignRoutes.request("/1", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Updated Title" })
      });
      expect(res.status).toBe(200);
  });

  test("DELETE /:id deactivates a campaign", async () => {
      const res = await campaignRoutes.request("/1", {
          method: "DELETE"
      });
      expect(res.status).toBe(200);
  });
});
