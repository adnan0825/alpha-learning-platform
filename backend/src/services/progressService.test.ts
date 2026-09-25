import test from "node:test";
import assert from "node:assert/strict";

import { isVideoCompletionReached } from "./progressService";

test("marks a video complete once the user has watched at least 90% of the video", () => {
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
      watchedSeconds: 8.9,
      durationSeconds: 10,
      positionSeconds: 8.9,
      ended: false,
    }),
    false,
  );

  assert.equal(
    isVideoCompletionReached({
      watchedSeconds: 9,
      durationSeconds: 10,
      positionSeconds: 9,
      ended: false,
    }),
    true,
  );

  assert.equal(
    isVideoCompletionReached({
      watchedSeconds: 9,
      durationSeconds: 10,
      positionSeconds: 10,
      ended: true,
    }),
    true,
  );
});
