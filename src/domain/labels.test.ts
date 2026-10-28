import { expect, test } from "vitest";
import { formatDateTime, formatPreciseTime } from "./labels";

test("dates format in Spanish", () => {
  expect(formatDateTime("2026-10-28T09:15:00Z")).toMatch(/^28 oct 2026, \d{1,2}:15$/);
  expect(formatPreciseTime("2026-10-28T09:15:07Z")).toMatch(/^28\/10\/26, \d{1,2}:15:07$/);
});

test("an unparseable date is shown as stored instead of throwing", () => {
  expect(formatDateTime("not-a-date")).toBe("not-a-date");
  expect(formatPreciseTime("not-a-date")).toBe("not-a-date");
});
