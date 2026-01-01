import { describe, expect, test } from "vitest";
import { Schema, createSchema } from "../../src";
import { mixed } from "../../src/types";

describe("mixed", () => {
  test("mixed", () => {
    const schema = createSchema("test", {
      anything: mixed(),
    });

    const data1 = Schema.encode(schema, { anything: "string" });
    expect(data1).toStrictEqual({ anything: "string" });

    const data2 = Schema.encode(schema, { anything: 42 });
    expect(data2).toStrictEqual({ anything: 42 });

    const data3 = Schema.encode(schema, { anything: true });
    expect(data3).toStrictEqual({ anything: true });

    const data4 = Schema.encode(schema, { anything: { nested: "object" } });
    expect(data4).toStrictEqual({ anything: { nested: "object" } });

    const data5 = Schema.encode(schema, { anything: [1, "2", false] });
    expect(data5).toStrictEqual({ anything: [1, "2", false] });

    const data6 = Schema.encode(schema, { anything: null });
    expect(data6).toStrictEqual({ anything: null });
  });
});
