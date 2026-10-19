import test from "node:test";
import assert from "node:assert/strict";
import { normalizeByMobilePhone } from "../lib/phone.mjs";

test("normalizes Belarus mobile formats for all accepted prefixes", () => {
  for (const phone of [
    ["+375 25 123-45-67", "+375251234567"],
    ["375291234567", "+375291234567"],
    ["(375) 33 123 45 67", "+375331234567"],
    ["+375-44-123-45-67", "+375441234567"],
  ]) {
    assert.equal(normalizeByMobilePhone(phone[0]), phone[1]);
  }
});

test("rejects invalid, incomplete, and non-Belarus mobile numbers", () => {
  for (const phone of ["", "+375 17 123-45-67", "+7 999 123-45-67", "+375 29 123-45-6", "abc"]) {
    assert.equal(normalizeByMobilePhone(phone), null, phone);
  }
});
