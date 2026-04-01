import { describe, expect, it } from "vitest";
import {
  array,
  binary,
  boolean,
  date,
  decimal128,
  double,
  int32,
  literal,
  long,
  mixed,
  MonarchNullable,
  MonarchType,
  number,
  object,
  objectId,
  record,
  regex,
  string,
  taggedUnion,
  tuple,
  union,
  uuid,
} from "../../src/types";
import { JSONSchema } from "../../src/types/type.schema";

describe("JSON Schema", () => {
  describe("primitive and bson types", () => {
    it("should build string schema", () => {
      expect(MonarchType.jsonSchema(string())).toStrictEqual({ bsonType: "string" });
    });

    it("should build boolean schema", () => {
      expect(MonarchType.jsonSchema(boolean())).toStrictEqual({ bsonType: "bool" });
    });

    it("should build number schema", () => {
      expect(MonarchType.jsonSchema(number())).toStrictEqual({ type: "number" });
    });

    it("should build decimal128 schema", () => {
      expect(MonarchType.jsonSchema(decimal128())).toStrictEqual({ bsonType: "decimal" });
    });

    it("should build double schema", () => {
      expect(MonarchType.jsonSchema(double())).toStrictEqual({ bsonType: "double" });
    });

    it("should build int32 schema", () => {
      expect(MonarchType.jsonSchema(int32())).toStrictEqual({ bsonType: "int" });
    });

    it("should build long schema", () => {
      expect(MonarchType.jsonSchema(long())).toStrictEqual({ bsonType: "long" });
    });

    it("should build objectId schema", () => {
      expect(MonarchType.jsonSchema(objectId())).toStrictEqual({ bsonType: "objectId" });
    });

    it("should build date schema", () => {
      expect(MonarchType.jsonSchema(date())).toStrictEqual({ bsonType: "date" });
    });

    it("should build binary schema", () => {
      expect(MonarchType.jsonSchema(binary())).toStrictEqual({ bsonType: "binData" });
    });

    it("should build uuid schema", () => {
      expect(MonarchType.jsonSchema(uuid())).toStrictEqual({ bsonType: "binData" });
    });

    it("should build regex schema", () => {
      expect(MonarchType.jsonSchema(regex())).toStrictEqual({ bsonType: "regex" });
    });

    it("should build literal schema", () => {
      expect(MonarchType.jsonSchema(literal("a", "b"))).toStrictEqual({ enum: ["a", "b"] });
    });

    it("should build mixed schema", () => {
      expect(MonarchType.jsonSchema(mixed())).toStrictEqual({});
    });
  });

  describe("modifier types", () => {
    it("should keep nullable schema as passthrough", () => {
      expect(MonarchType.jsonSchema(string().nullable())).toStrictEqual({ bsonType: "string" });
    });

    it("should keep optional schema as passthrough", () => {
      expect(MonarchType.jsonSchema(number().optional())).toStrictEqual({ type: "number" });
    });

    it("should keep defaulted schema as passthrough", () => {
      expect(MonarchType.jsonSchema(number().default(42))).toStrictEqual({ type: "number" });
    });
  });

  describe("composite types", () => {
    it("should build array schema", () => {
      expect(MonarchType.jsonSchema(array(string().nullable()))).toStrictEqual({
        bsonType: "array",
        items: { bsonType: ["string", "null"] },
      });
    });

    it("should build object schema", () => {
      expect(
        MonarchType.jsonSchema(
          object({
            requiredField: string(),
            optionalField: number().optional(),
            defaultedField: number().default(42),
            nullableField: string().nullable(),
          }),
        ),
      ).toStrictEqual({
        bsonType: "object",
        additionalProperties: false,
        properties: {
          requiredField: { bsonType: "string" },
          optionalField: { type: "number" },
          defaultedField: { type: "number" },
          nullableField: { bsonType: ["string", "null"] },
        },
        required: ["requiredField", "defaultedField", "nullableField"],
      });
    });

    it("should build record schema", () => {
      expect(MonarchType.jsonSchema(record(number().nullable()))).toStrictEqual({
        bsonType: "object",
        additionalProperties: false,
        patternProperties: {
          ".*": {
            type: ["number", "null"],
          },
        },
      });
    });

    it("should build tuple schema", () => {
      expect(MonarchType.jsonSchema(tuple([string(), number().nullable()]))).toStrictEqual({
        bsonType: "array",
        items: [{ bsonType: "string" }, { type: ["number", "null"] }],
        minItems: 2,
        maxItems: 2,
        additionalItems: false,
      });
    });

    it("should build union schema", () => {
      expect(MonarchType.jsonSchema(union(string(), number().nullable()))).toStrictEqual({
        anyOf: [{ bsonType: "string" }, { type: ["number", "null"] }],
      });
    });

    it("should build tagged union schema", () => {
      expect(
        MonarchType.jsonSchema(
          taggedUnion({
            user: string(),
            score: number().nullable(),
          }),
        ),
      ).toStrictEqual({
        oneOf: [
          {
            bsonType: "object",
            additionalProperties: false,
            required: ["tag", "value"],
            properties: {
              tag: { enum: ["user"] },
              value: { bsonType: "string" },
            },
          },
          {
            bsonType: "object",
            additionalProperties: false,
            required: ["tag", "value"],
            properties: {
              tag: { enum: ["score"] },
              value: { type: ["number", "null"] },
            },
          },
        ],
      });
    });

    it("should build complex nested object schema", () => {
      const schema = MonarchType.jsonSchema(
        object({
          id: string(),
          profile: object({
            displayName: string().nullable(),
            age: number().optional(),
            score: number().default(0),
          }),
          tags: array(string().nullable()),
          preferences: record(number().nullable()),
          pair: tuple([string(), number().nullable()]),
          status: union(string(), number().nullable()),
          kind: taggedUnion({
            person: object({
              name: string(),
            }),
            bot: number().nullable(),
          }),
        }),
      );

      expect(schema).toStrictEqual({
        bsonType: "object",
        additionalProperties: false,
        properties: {
          id: { bsonType: "string" },
          profile: {
            bsonType: "object",
            additionalProperties: false,
            properties: {
              displayName: { bsonType: ["string", "null"] },
              age: { type: "number" },
              score: { type: "number" },
            },
            required: ["displayName", "score"],
          },
          tags: {
            bsonType: "array",
            items: { bsonType: ["string", "null"] },
          },
          preferences: {
            bsonType: "object",
            additionalProperties: false,
            patternProperties: {
              ".*": { type: ["number", "null"] },
            },
          },
          pair: {
            bsonType: "array",
            items: [{ bsonType: "string" }, { type: ["number", "null"] }],
            minItems: 2,
            maxItems: 2,
            additionalItems: false,
          },
          status: {
            anyOf: [{ bsonType: "string" }, { type: ["number", "null"] }],
          },
          kind: {
            oneOf: [
              {
                bsonType: "object",
                additionalProperties: false,
                required: ["tag", "value"],
                properties: {
                  tag: { enum: ["person"] },
                  value: {
                    bsonType: "object",
                    additionalProperties: false,
                    properties: {
                      name: { bsonType: "string" },
                    },
                    required: ["name"],
                  },
                },
              },
              {
                bsonType: "object",
                additionalProperties: false,
                required: ["tag", "value"],
                properties: {
                  tag: { enum: ["bot"] },
                  value: { type: ["number", "null"] },
                },
              },
            ],
          },
        },
        required: ["id", "profile", "tags", "preferences", "pair", "status", "kind"],
      });
    });
  });

  describe("nullable", () => {
    it("should clone schema without mutating input", () => {
      const input: JSONSchema = { bsonType: "string" };
      const output = MonarchNullable.nullableJsonSchema(input);

      expect(output).toStrictEqual({ bsonType: ["string", "null"] });
      expect(input).toStrictEqual({ bsonType: "string" });
    });

    it("should add null to both bsonType and type when both exist", () => {
      const output = MonarchNullable.nullableJsonSchema({
        bsonType: "string",
        type: "string",
      });
      expect(output).toStrictEqual({
        bsonType: ["string", "null"],
        type: ["string", "null"],
      });
    });
  });
});
