import test from "node:test";
import assert from "node:assert/strict";
import type { Request, Response, NextFunction } from "express";
import router from "./uploads";

function getRouteHandler(path: string, method: "post") {
  const layer = router.stack.find(
    (entry: any) =>
      entry.route &&
      entry.route.path === path &&
      Boolean(entry.route.methods[method]),
  );

  if (!layer || !layer.route) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  return layer.route.stack[layer.route.stack.length - 1].handle as (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<void>;
}

test("POST /video exists for authenticated video uploads", async () => {
  const handler = getRouteHandler("/video", "post");

  assert.equal(typeof handler, "function");
  assert.doesNotThrow(() => getRouteHandler("/video", "post"));
});
