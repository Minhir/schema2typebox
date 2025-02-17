import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as prettier from "prettier";
import shell from "shelljs";

import {
  schema2typebox,
  collect,
  resetEnumCode,
} from "../src/schema-to-typebox";
import { zip } from "../src/utils";

const SHELLJS_RETURN_CODE_OK = 0;
const buildOsIndependentPath = (foldersOrFiles: string[]) => {
  return foldersOrFiles.join(path.sep);
};

const formatWithPrettier = (input: string): string => {
  return prettier.format(input, { parser: "typescript" });
};

/**
 * Formats given input with prettier and returns the result. This is used for
 * testing to be able to compare generated types with expected types without
 * having to take care of formatting.
 * @throws Error
 **/
export const expectEqualIgnoreFormatting = (
  input1: string,
  input2: string
): void => {
  assert.equal(formatWithPrettier(input1), formatWithPrettier(input2));
};

describe("programmatic usage API", () => {
  // TODO: remove this once global state enumCode was removed
  afterEach(() => {
    resetEnumCode();
  });
  test("object with required string property", () => {
    const dummySchema = `
    {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        }
      },
      "required": [
        "name"
      ]
    }`;
    const expectedTypebox = `
    import { Type, Static } from "@sinclair/typebox";

    export type T = Static<typeof T>;
    export const T = Type.Object({
      name: Type.String(),
    });
    `;
    expectEqualIgnoreFormatting(schema2typebox(dummySchema), expectedTypebox);
  });
  test("object with enum (all keys string)", () => {
    const dummySchema = `
     {
      "type": "object",
      "properties": {
        "status": {
         "enum": [
           "unknown",
           "accepted",
           "denied"
         ]
        }
      },
      "required": [
        "status"
      ]
    }
    `;
    const expectedTypebox = `
    import { Type, Static } from "@sinclair/typebox";

    export enum StatusEnum {
      UNKNOWN = "unknown",
      ACCEPTED = "accepted",
      DENIED = "denied",
    }

    export type T = Static<typeof T>
    export const T = Type.Object({
      status: Type.Enum(StatusEnum)
    })
    `;
    expectEqualIgnoreFormatting(schema2typebox(dummySchema), expectedTypebox);
  });
  test("object with enum (mixed types for keys) and optional enum with string keys", () => {
    const dummySchema = `
     {
      "type": "object",
      "properties": {
        "status": {
         "enum": [
           1,
           true,
           "hello"
         ]
        },
        "optionalStatus": {
         "enum": [
          "unknown",
          "accepted",
          "denied"]
        }
      },
      "required": [
        "status"
      ]
    }
    `;
    const expectedTypebox = `
    import { Type, Static } from "@sinclair/typebox";

    export enum StatusEnum {
      1 = 1,
      TRUE = true,
      HELLO = "hello",
    }

    export enum OptionalStatusEnum {
      UNKNOWN = "unknown",
      ACCEPTED = "accepted",
      DENIED = "denied",
    }

    export type T = Static<typeof T>
    export const T = Type.Object({
      status: Type.Enum(StatusEnum),
      optionalStatus: Type.Optional(Type.Enum(OptionalStatusEnum))
    })
    `;
    expectEqualIgnoreFormatting(schema2typebox(dummySchema), expectedTypebox);
    // NOTE: probably rather test the collect() function whenever we can instead
    // of schema2typebox.
  });
  test("generated typebox names are based on title attribute", () => {
    const dummySchema = `
    {
      "title": "Contract",
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        }
      },
      "required": ["name"]
    }
    `;
    const expectedTypebox = `
    import { Type, Static } from "@sinclair/typebox";

    export type Contract = Static<typeof Contract>;
    export const Contract = Type.Object({
      name: Type.String(),
    });
    `;
    expectEqualIgnoreFormatting(schema2typebox(dummySchema), expectedTypebox);
  });
  // NOTE: probably rather test the collect() function whenever we can instead
  // of schema2typebox.
});

// NOTE: I think it is best to test the collect() function directly(less
// overhead) instead of programmatic usage or cli usage for new features.
describe("schema2typebox internal - collect()", () => {
  test("object with required string property", () => {
    const dummySchema = `
    {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        }
      },
      "required": [
        "name"
      ]
    }`;
    const expectedTypebox = `
    Type.Object({
      name: Type.String(),
    });
    `;
    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
  });
  test("object with optional string property", () => {
    const dummySchema = `
    {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        }
      }
    }
    `;
    const expectedTypebox = `
    Type.Object({
      name: Type.Optional(Type.String()),
    });
    `;
    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
  });
  test("object with string that has schemaOptions", () => {
    // src for properties
    // 1. https://datatracker.ietf.org/doc/html/draft-wright-json-schema-validation-00#section-5
    // (careful, this is 2020 spec src):
    // 2. https://json-schema.org/draft/2020-12/json-schema-validation.html#name-validation-keywords-for-num
    const dummySchema = `
    {
      "type": "object",
      "properties": {
        "name": {
          "description": "full name of the person",
          "minLength": 1,
          "maxLength": 100,
          "pattern": "^[a-zA-Z]+(s)+[a-zA-Z]+$",
          "type": "string"
        }
      }
    }
    `;
    const expectedTypebox = `
    Type.Object({
      name: Type.Optional(
        Type.String({
          description: "full name of the person",
          minLength: 1,
          maxLength: 100,
          pattern: "^[a-zA-Z]+(\s)+[a-zA-Z]+$",
        })
      ),
    });
    `;
    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
  });
  test("object with required number property", () => {
    const dummySchema = `
    {
      "type": "object",
      "properties": {
        "age": {
          "type": "number"
        }
      },
      "required": [
        "age"
      ]
    }
    `;
    const expectedTypebox = `
    Type.Object({
      age: Type.Number()
    })
    `;
    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
  });
  test("object with null property", () => {
    const dummySchema = `
    {
      "type": "object",
      "properties": {
        "age": {
          "type": "null"
        }
      },
      "required": [
        "age"
      ]
    }
    `;
    const expectedTypebox = `
    Type.Object({
      age: Type.Null()
    })
    `;
    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
  });
  test("object with boolean property", () => {
    const dummySchema = `
    {
      "type": "object",
      "properties": {
        "funny": {
          "type": "boolean"
        }
      },
      "required": [
        "funny"
      ]
    }
    `;
    const expectedTypebox = `
    Type.Object({
      funny: Type.Boolean()
    })
    `;
    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
  });
  test("object with array property and simple type (string)", () => {
    const dummySchema = `
    {
      "type": "object",
      "properties": {
        "hobbies": {
          "minItems": 1,
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "hobbies"
      ]
    }
    `;
    const expectedTypebox = `
    Type.Object({
      hobbies: Type.Array(Type.String(), { minItems: 1 }),
    });
    `;
    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
  });
  // TODO: test object with array property and object type
  test("object with object property", () => {
    const dummySchema = `
    {
      "type": "object",
      "properties": {
        "address": {
          "type": "object",
          "properties": {
            "street": {
              "type": "string"
            },
            "city": {
              "type": "string"
            }
          },
          "required": [
            "street",
            "city"
          ]
        }
      },
      "required": [
        "address"
      ]
    }
    `;
    const expectedTypebox = `
    Type.Object({
      address: Type.Object({
      street: Type.String(),
      city: Type.String()
      })
    })
    `;
    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
  });
  test("object with const", () => {
    const dummySchema = `
      {
    "type": "object",
    "properties": {
      "nickname": {
        "const": "xddq",
        "type": "string"
      },
      "x": {
        "const": 99,
        "type": "number"
      },
      "y": {
        "const": true,
        "type": "boolean"
      },
      "z": {
        "const": false,
        "type": "boolean"
      },
      "a": {
        "type": "array",
        "items": {
          "const": 1,
          "type": "number"
        }
      },
      "b": {
        "type": "array",
        "items": {
          "const": "hi",
          "type": "string"
        }
      },
      "c": {
        "const": 10,
        "type": "number"
      },
      "d": {
        "type": "array",
        "items": {
          "const": 1,
          "type": "number"
        }
      },
      "e": {
        "type": "array",
        "items": {
          "const": "hi",
          "type": "string"
        }
      }
    },
    "required": [
      "nickname",
      "x",
      "y",
      "z",
      "a",
      "b"
    ]
    }
    `;
    const expectedTypebox = `
    Type.Object({
      nickname: Type.Literal("xddq"),
      x: Type.Literal(99),
      y: Type.Literal(true),
      z: Type.Literal(false),
      a: Type.Array(Type.Literal(1)),
      b: Type.Array(Type.Literal("hi")),
      c: Type.Optional(Type.Literal(10)),
      d: Type.Optional(Type.Array(Type.Literal(1))),
      e: Type.Optional(Type.Array(Type.Literal("hi"))),
    });
    `;
    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
  });
  test("object with anyOf", () => {
    const dummySchema = `
    {
      "type": "object",
      "properties": {
        "a": {
          "anyOf": [
            {
              "const": 1,
              "type": "number"
            },
            {
              "const": 2,
              "type": "number"
            }
          ]
        },
        "b": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ]
        },
        "c": {
          "description": "a union type",
          "anyOf": [
            {
              "maxLength": 20,
              "type": "string"
            },
            {
              "description": "can only be 1",
              "const": 1,
              "type": "number"
            }
          ]
        }
      },
      "required": [
        "a",
        "c"
    ]
    }
    `;
    const expectedTypebox = `
    Type.Object({
      a: Type.Union([Type.Literal(1), Type.Literal(2)]),
      b: Type.Optional(Type.Union([Type.String(), Type.Number(), Type.Null()])),
      c: Type.Union([Type.String({ maxLength: 20 }),
          Type.Literal(1, { description: "can only be 1" }),], { description: "a union type",}),
    });
    `;
    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
  });
  test("object with allOf", () => {
    const dummySchema = `
      {
      "type": "object",
      "properties": {
        "a": {
          "allOf": [
            {
              "const": 1,
              "type": "number"
            },
            {
              "const": 2,
              "type": "number"
            }
          ]
        },
        "b": {
          "allOf": [
            {
              "type": "string"
            },
            {
              "type": "number"
            }
          ]
        },
        "c": {
          "description": "intersection of two types",
          "allOf": [
            {
              "description": "important",
              "type": "string"
            },
            {
              "minimum": 1,
              "type": "number"
            }
          ]
        }
      },
      "required": [
        "a",
        "c"
      ]
    }
    `;
    const expectedTypebox = `
    Type.Object({
      a: Type.Intersect([Type.Literal(1), Type.Literal(2)]),
      b: Type.Optional(Type.Intersect([Type.String(), Type.Number()])),
      c: Type.Intersect([Type.String({ description: "important" }), Type.Number({ minimum: 1 })], {description: "intersection of two types",}),});
    `;
    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
  });
  test("object with enum", () => {
    const dummySchema = `
     {
      "type": "object",
      "properties": {
        "status": {
         "enum": [
           "unknown",
           "accepted",
           "denied"
         ]
        }
      },
      "required": [
        "status"
      ]
    }
    `;
    const expectedTypebox = `
    Type.Object({
      status: Type.Enum(StatusEnum),
    })
    `;
    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
  });
  test("object with $ref pointing to external files in relative path", () => {
    // prepares and writes a test types.ts file.
    const schemaWithRef = `
    {
      "title": "Contract",
      "type": "object",
      "properties": {
        "person": {
          "$ref": "./person.json"
        },
        "status": {
          "$ref": "./status.json"
        }
      },
      "required": ["person"]
    }
    `;

    const referencedPersonSchema = `
    {
      "title": "Person",
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "maxLength": 100
        },
        "age": {
          "type": "number",
          "minimum": 18
        }
      },
      "required": ["name", "age"]
   }
   `;

    const referencedStatusSchema = `
    {
      "title": "Status",
      "enum": ["unknown", "accepted", "denied"]
    }
    `;

    const expectedTypebox = `
    Type.Object({
      person: Type.Object({
        name: Type.String({"maxLength":100}),
        age: Type.Number({"minimum":18})
      }),
      status: Type.Optional(Type.Enum(StatusEnum))
    })
    `;

    const inputPaths = ["person.json", "status.json"].flatMap((currItem) =>
      buildOsIndependentPath([__dirname, "..", "..", currItem])
    );
    zip(inputPaths, [referencedPersonSchema, referencedStatusSchema]).map(
      ([fileName, data]) => fs.writeFileSync(fileName, data, undefined)
    );

    expectEqualIgnoreFormatting(
      collect(JSON.parse(schemaWithRef)),
      expectedTypebox
    );

    // cleanup generated files
    const { code: returnCode } = shell.rm("-f", inputPaths);
    assert.equal(returnCode, SHELLJS_RETURN_CODE_OK);
  });
});

// NOTE: these are the most "high level" tests. Create them sparsely. Focus on
// cli usage aspects rather then implementation of the business logic below it.
// describe("cli usage", () => {
// TODO: how can we test this?
// test("pipes to stdout if -h or --help is given", async () => {
//   Ideas:
//     - can we provide process.stdout with our own stream and check the
//   output?
//     - can we mock process.stdout? does not work with mock.method since
//     process.stdout is not a function.
//   const getHelpTextMock = mock.method(getHelpText, "run", () => {});
//   await runCli();
//   assert.equal(getHelpTextMock.mock.callCount(), 10);
// });
// });
