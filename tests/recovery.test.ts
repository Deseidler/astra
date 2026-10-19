import assert from "node:assert/strict";
import { test } from "node:test";
import {
  recoveryOrigin,
  newPassword,
  recoveryEmail,
} from "../src/lib/recovery";
test("recovery redirects only to exact trusted application origins", () => {
  assert.equal(recoveryOrigin("https://evil.example"), null);
  assert.equal(recoveryOrigin(null), null);
  assert.equal(
    recoveryOrigin("https://velmora-mauve.vercel.app.evil.example"),
    null,
  );
  assert.equal(recoveryOrigin("http://localhost:3000"), null);
  assert.equal(
    recoveryOrigin("http://localhost:3000", undefined, undefined, true),
    "http://localhost:3000",
  );
  assert.equal(
    recoveryOrigin("https://preview.example", "preview.example"),
    "https://preview.example",
  );
  assert.equal(
    recoveryOrigin("https://velmora-mauve.vercel.app"),
    "https://velmora-mauve.vercel.app",
  );
});
test("new passwords must match and satisfy bounded length", () => {
  assert.equal(
    newPassword.safeParse({
      password: "synthetic-long-pass",
      confirmation: "synthetic-long-pass",
    }).success,
    true,
  );
  assert.equal(
    newPassword.safeParse({
      password: "synthetic-long-pass",
      confirmation: "different-long-pass",
    }).success,
    false,
  );
  assert.equal(
    newPassword.safeParse({ password: "short", confirmation: "short" }).success,
    false,
  );
  assert.equal(
    newPassword.safeParse({
      password: "x".repeat(129),
      confirmation: "x".repeat(129),
    }).success,
    false,
  );
  assert.equal(recoveryEmail.safeParse("not-an-email").success, false);
});
