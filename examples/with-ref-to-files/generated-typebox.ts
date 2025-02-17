/**
 * ATTENTION. This code was AUTO GENERATED by schema2typebox version 1.1.2.
 * While I don't know your use case, there is a high chance that direct changes
 * to this file get lost. Consider making changes to the underlying JSON schema
 * you use to generate this file instead. The default file is called
 * "schema.json", perhaps have a look there! :]
 */

import { Type, Static } from "@sinclair/typebox";

export enum StatusEnum {
  UNKNOWN = "unknown",
  ACCEPTED = "accepted",
  DENIED = "denied",
}

export type Contract = Static<typeof Contract>;
export const Contract = Type.Object({
  person: Type.Object({
    name: Type.String({ maxLength: 100 }),
    age: Type.Number({ minimum: 18 }),
  }),
  status: Type.Optional(Type.Enum(StatusEnum)),
});
