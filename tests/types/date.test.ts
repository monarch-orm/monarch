import { describe, expect, test } from "vitest";
import { Schema, createSchema } from "../../src";
import { date } from "../../src/types";

describe("date", () => {
  const now = new Date();
  const past = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2); // 2 days ago
  const future = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 2); // 2 days later

  test("MonarchDate", () => {
    const schema = createSchema("test", {
      date: date(),
    });

    const validData = Schema.input(schema, { date: now });
    expect(validData).toStrictEqual({ date: now });

    // @ts-expect-error
    expect(() => Schema.input(schema, { date: "not a date" })).toThrowError("expected 'Date' received 'string'");
    // @ts-expect-error
    expect(() => Schema.input(schema, { date: 123 })).toThrowError("expected 'Date' received 'number'");
  });

  test("MonarchDate after() and before()", () => {
    const schema = createSchema("test", {
      afterDate: date().after(now),
      beforeDate: date().before(now),
    });

    expect(() => Schema.input(schema, { afterDate: past, beforeDate: future })).toThrowError(
      `date must be after ${now.toISOString()}`,
    );
    expect(() => Schema.input(schema, { afterDate: future, beforeDate: future })).toThrowError(
      `date must be before ${now.toISOString()}`,
    );

    // Edge case: date equal to boundary should fail
    expect(() => Schema.input(schema, { afterDate: now, beforeDate: past })).toThrowError(
      `date must be after ${now.toISOString()}`,
    );
    expect(() => Schema.input(schema, { afterDate: future, beforeDate: now })).toThrowError(
      `date must be before ${now.toISOString()}`,
    );

    const data = Schema.input(schema, {
      afterDate: future,
      beforeDate: past,
    });
    expect(data).toStrictEqual({ afterDate: future, beforeDate: past });
  });

  test("validation error order - type error before value validation", () => {
    // Test that type validation errors occur before chained validation method errors
    const schema = createSchema("test", {
      dateWithAfter: date().after(now),
      dateWithBefore: date().before(now),
    });

    // Invalid type for date().after() should throw type error first
    expect(() =>
      Schema.input(schema, {
        // @ts-expect-error
        dateWithAfter: "not a date",
        dateWithBefore: past,
      }),
    ).toThrowError("expected 'Date' received 'string'");

    // Invalid type for date().before() should throw type error first
    expect(() =>
      Schema.input(schema, {
        dateWithAfter: future,
        // @ts-expect-error
        dateWithBefore: 123,
      }),
    ).toThrowError("expected 'Date' received 'number'");
  });
});
