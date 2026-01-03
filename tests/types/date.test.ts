import { describe, expect, test } from "vitest";
import { Schema, createSchema } from "../../src";
import { date, dateString } from "../../src/types";

describe("date", () => {
  const now = new Date();
  const past = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2); // 2 days ago
  const future = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 2); // 2 days later

  test("MonarchDate", () => {
    const schema = createSchema("test", {
      date: date(),
    });

    const validData = Schema.encode(schema, { date: now });
    expect(validData).toStrictEqual({ date: now });

    // @ts-expect-error
    expect(() => Schema.encode(schema, { date: "not a date" })).toThrowError("expected 'Date' received 'string'");
    // @ts-expect-error
    expect(() => Schema.encode(schema, { date: 123 })).toThrowError("expected 'Date' received 'number'");
  });

  test("MonarchDateString", () => {
    const schema = createSchema("test", {
      date: dateString(),
    });

    // Valid ISO date string should pass
    const validData = Schema.encode(schema, { date: now.toISOString() });
    expect(validData).toStrictEqual({ date: now });

    expect(() => Schema.encode(schema, { date: "invalid date" })).toThrowError(
      "expected 'ISO Date string' received 'string'",
    );
    // @ts-expect-error
    expect(() => Schema.encode(schema, { date: 123 })).toThrowError("expected 'ISO Date string' received 'number'");
  });

  test("MonarchDate after() and before()", () => {
    const schema = createSchema("test", {
      afterDate: date().after(now),
      beforeDate: date().before(now),
    });

    expect(() => Schema.encode(schema, { afterDate: past, beforeDate: future })).toThrowError(
      `date must be after ${now.toISOString()}`,
    );
    expect(() => Schema.encode(schema, { afterDate: future, beforeDate: future })).toThrowError(
      `date must be before ${now.toISOString()}`,
    );

    // Edge case: date equal to boundary should fail
    expect(() => Schema.encode(schema, { afterDate: now, beforeDate: past })).toThrowError(
      `date must be after ${now.toISOString()}`,
    );
    expect(() => Schema.encode(schema, { afterDate: future, beforeDate: now })).toThrowError(
      `date must be before ${now.toISOString()}`,
    );

    const data = Schema.encode(schema, {
      afterDate: future,
      beforeDate: past,
    });
    expect(data).toStrictEqual({ afterDate: future, beforeDate: past });
  });

  test("MonarchDateString after() and before()", () => {
    const schema = createSchema("test", {
      afterDate: dateString().after(now),
      beforeDate: dateString().before(now),
    });

    expect(() =>
      Schema.encode(schema, {
        afterDate: past.toISOString(),
        beforeDate: future.toISOString(),
      }),
    ).toThrowError(`date must be after ${now.toISOString()}`);

    expect(() =>
      Schema.encode(schema, {
        afterDate: future.toISOString(),
        beforeDate: future.toISOString(),
      }),
    ).toThrowError(`date must be before ${now.toISOString()}`);

    // Edge case: date equal to boundary should fail
    expect(() =>
      Schema.encode(schema, {
        afterDate: now.toISOString(),
        beforeDate: past.toISOString(),
      }),
    ).toThrowError(`date must be after ${now.toISOString()}`);
    expect(() =>
      Schema.encode(schema, {
        afterDate: future.toISOString(),
        beforeDate: now.toISOString(),
      }),
    ).toThrowError(`date must be before ${now.toISOString()}`);

    const data = Schema.encode(schema, {
      afterDate: future.toISOString(),
      beforeDate: past.toISOString(),
    });
    expect(data).toStrictEqual({
      afterDate: future,
      beforeDate: past,
    });
  });

  test("validation error order - type error before value validation", () => {
    // Test that type validation errors occur before chained validation method errors
    const schema = createSchema("test", {
      dateWithAfter: date().after(now),
      dateWithBefore: date().before(now),
      dateStringWithAfter: dateString().after(now),
      dateStringWithBefore: dateString().before(now),
    });

    // Invalid type for date().after() should throw type error first
    expect(() =>
      Schema.encode(schema, {
        dateWithAfter: "not a date" as any,
        dateWithBefore: past,
        dateStringWithAfter: future.toISOString(),
        dateStringWithBefore: past.toISOString(),
      }),
    ).toThrowError("expected 'Date' received 'string'");

    // Invalid type for date().before() should throw type error first
    expect(() =>
      Schema.encode(schema, {
        dateWithAfter: future,
        dateWithBefore: 123 as any,
        dateStringWithAfter: future.toISOString(),
        dateStringWithBefore: past.toISOString(),
      }),
    ).toThrowError("expected 'Date' received 'number'");

    // Invalid date string for dateString().after() should throw parsing error first
    expect(() =>
      Schema.encode(schema, {
        dateWithAfter: future,
        dateWithBefore: past,
        dateStringWithAfter: "invalid date string",
        dateStringWithBefore: past.toISOString(),
      }),
    ).toThrowError("expected 'ISO Date string' received 'string'");

    // Invalid type (non-string) for dateString().before() should throw type error first
    expect(() =>
      Schema.encode(schema, {
        dateWithAfter: future,
        dateWithBefore: past,
        dateStringWithAfter: future.toISOString(),
        dateStringWithBefore: now as any,
      }),
    ).toThrowError("expected 'ISO Date string' received 'object'");
  });
});
