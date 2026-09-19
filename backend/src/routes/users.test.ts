import test from "node:test";
import assert from "node:assert/strict";
import router from "./users";
import { pool } from "../config/db";

function getDeleteHandler() {
  const layer = router.stack.find(
    (entry: any) =>
      entry.route &&
      entry.route.path === "/:id" &&
      Boolean(entry.route.methods.delete),
  );
  if (!layer?.route) throw new Error("DELETE /:id route not found");
  return layer.route.stack[layer.route.stack.length - 1].handle as any;
}

function createResponse() {
  return {
    statusCode: 200,
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload;
      return this;
    },
  } as any;
}

test("admin cannot delete their own account", async () => {
  const handler = getDeleteHandler();
  const res = createResponse();

  await handler({ params: { id: "7" }, user: { id: 7, role: "admin" } }, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.payload, {
    error: "Admins cannot delete their own account",
  });
});

test("admin receives 404 when deleting an unknown user", async () => {
  const originalQuery = (pool as any).query;
  (pool as any).query = async () => ({ rowCount: 0, rows: [] });
  try {
    const res = createResponse();
    await getDeleteHandler()(
      { params: { id: "99" }, user: { id: 7, role: "admin" } },
      res,
    );
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.payload, { error: "User not found" });
  } finally {
    (pool as any).query = originalQuery;
  }
});
