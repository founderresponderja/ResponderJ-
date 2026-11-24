// RJ-4.7: modo de publicação por plataforma.
import { test } from "node:test";
import assert from "node:assert/strict";
import { publishModeFor, assistedUrlFor } from "../shared/publish-modes.ts";

test("Google e Facebook sincronizados publicam pela API", () => {
  assert.equal(publishModeFor("google", "accounts/1/locations/2/reviews/3"), "google");
  assert.equal(publishModeFor("facebook", "123_456"), "facebook");
});

test("TripAdvisor, Booking e reviews manuais são assistidas", () => {
  assert.equal(publishModeFor("tripadvisor", "abc"), "assisted");
  assert.equal(publishModeFor("booking", "abc"), "assisted");
  assert.equal(publishModeFor("google", "manual:uuid"), "assisted");
  assert.equal(publishModeFor("google", null), "assisted");
});

test("cada plataforma assistida abre a página certa", () => {
  assert.match(assistedUrlFor("tripadvisor"), /tripadvisor\.com\/Owners/);
  assert.match(assistedUrlFor("booking"), /admin\.booking\.com/);
});
