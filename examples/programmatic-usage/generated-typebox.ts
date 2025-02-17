/**
 * ATTENTION. This code was AUTO GENERATED by schema2typebox version 1.1.2.
 * While I don't know your use case, there is a high chance that direct changes
 * to this file get lost. Consider making changes to the underlying JSON schema
 * you use to generate this file instead. The default file is called
 * "schema.json", perhaps have a look there! :]
 */

import { Type, Static } from "@sinclair/typebox";

export enum FavoriteAnimalEnum {
  DOG = "dog",
  CAT = "cat",
  SLOTH = "sloth",
}

export type Person = Static<typeof Person>;
export const Person = Type.Object({
  name: Type.String({ minLength: 20 }),
  age: Type.Number({ minimum: 18, maximum: 90 }),
  hobbies: Type.Optional(Type.Array(Type.String(), { minItems: 1 })),
  favoriteAnimal: Type.Optional(Type.Enum(FavoriteAnimalEnum)),
});
