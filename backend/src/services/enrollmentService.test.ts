import test from "node:test";
import assert from "node:assert/strict";

import { validateReviewInput } from "./enrollmentService";

test("validateReviewInput accepts a valid review and trims the comment", () => {
  assert.deepEqual(validateReviewInput(5, "  Great course overall!  "), {
    rating: 5,
    comment: "Great course overall!",
  });
});

test("validateReviewInput rejects invalid ratings", () => {
  assert.throws(() => validateReviewInput(0, "Nope"), /between 1 and 5/i);
  assert.throws(() => validateReviewInput(6, "Nope"), /between 1 and 5/i);
  assert.throws(() => validateReviewInput(NaN, "Nope"), /between 1 and 5/i);
});
