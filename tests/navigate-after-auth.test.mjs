import test from "node:test";
import assert from "node:assert/strict";
import { navigateAfterAuth } from "../src/lib/supabase/navigate-after-auth.ts";

test("authenticated navigation requests a fresh dashboard document", () => {
  const destinations = [];
  globalThis.window = { location: { assign: (url) => destinations.push(url) } };
  try {
    navigateAfterAuth();
    assert.deepEqual(destinations, ["/"]);
  } finally {
    delete globalThis.window;
  }
});
