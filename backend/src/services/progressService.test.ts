import test from "node:test";
import assert from "node:assert/strict";

import { isVideoCompletionReached } from "./progressService";

test("marks a video complete only after actual watching reaches the required threshold", () => {
  assert.equal(
    isVideoCompletionReached({
      watchedSeconds: 0,
      durationSeconds: 10,
      positionSeconds: 10,
      ended: true,
    }),
    false,
  );

  assert.equal(
    isVideoCompletionReached({
      watchedSeconds: 9.5,
      durationSeconds: 10,
      positionSeconds: 9.9,
      ended: false,
    }),
    true,
  );

  assert.equal(
    isVideoCompletionReached({
      watchedSeconds: 9.5,
      durationSeconds: 10,
      positionSeconds: 10,
      ended: true,
    }),
    true,
  );
});
