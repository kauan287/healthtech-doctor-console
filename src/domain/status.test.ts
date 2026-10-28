import { expect, test } from "vitest";
import { isStatus, STATUS, STATUSES } from "./status";

test("only the API's statuses are recognised, not inherited object keys", () => {
  expect(["PENDING_APPROVAL", "INVALID", "ALL", "toString", ""].filter(isStatus)).toEqual([
    "PENDING_APPROVAL",
    "INVALID",
  ]);
});

test("a doctor can decide only on a pending prescription", () => {
  expect(STATUSES.filter((status) => STATUS[status].canDecide)).toEqual(["PENDING_APPROVAL"]);
});
