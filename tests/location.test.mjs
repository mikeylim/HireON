import test from "node:test";
import assert from "node:assert/strict";
import { matchesSearchLocation } from "../src/lib/location.ts";

test("accepts common Toronto location formats", () => {
  assert.equal(matchesSearchLocation("Toronto, ON", "Toronto, ON"), true);
  assert.equal(matchesSearchLocation("Toronto, Ontario", "Toronto, ON"), true);
  assert.equal(matchesSearchLocation("Toronto, Canada", "Toronto, ON"), true);
  assert.equal(matchesSearchLocation("Toronto (ON)", "Toronto, ON"), true);
  assert.equal(matchesSearchLocation("Toronto", "Toronto, ON"), true);
});

test("rejects results outside the requested city", () => {
  assert.equal(matchesSearchLocation("Brazil", "Toronto, ON"), false);
  assert.equal(matchesSearchLocation("East Liverpool, OH", "Toronto, ON"), false);
  assert.equal(matchesSearchLocation("Remote - Brazil", "Toronto, ON", "remote"), false);
  assert.equal(matchesSearchLocation("Worldwide", "Toronto, ON", "remote"), false);
  assert.equal(matchesSearchLocation("", "Toronto, ON"), false);
});

test("rejects an explicitly conflicting region for the same city name", () => {
  assert.equal(matchesSearchLocation("London, ON", "London, ON"), true);
  assert.equal(matchesSearchLocation("London, UK", "London, ON"), false);
});

test("supports province-wide searches without matching Ontario, California", () => {
  assert.equal(matchesSearchLocation("Toronto, Ontario", "Ontario"), true);
  assert.equal(matchesSearchLocation("Ottawa (ON)", "ON"), true);
  assert.equal(matchesSearchLocation("Ontario, CA", "Ontario"), false);
});

test("includes remote roles only when Remote is explicitly requested", () => {
  assert.equal(matchesSearchLocation("Worldwide", "Remote", "remote"), true);
  assert.equal(matchesSearchLocation("Americas, Europe", "Remote", "remote"), true);
  assert.equal(matchesSearchLocation("Toronto, ON", "Remote", "onsite"), false);
});
