import * as prettier from "prettier";
import { cosmiconfig } from "cosmiconfig";
import packageJson from "../package.json";
import { schema2typebox as Schema2Typebox } from "./schema-to-typebox";

export type Schema2TypeboxOptions = {
  /**
   * The given JSON schema as utf-8 encoded string.
   */
  input: string;
};

/**
 * Use this function for programmatic usage of schema2typebox. The options are typed
 * and commented.
 *
 * @returns The generated code as string
 *
 * @throws Error
 **/
// TODO: perhaps check if we can stream the generation(for fun and practice)
export const schema2typebox = async ({
  input,
}: Schema2TypeboxOptions): Promise<string> => {
  const generatedTypeboxCode = Schema2Typebox(input);

  // TODO: create a "pipeline" for processing
  // post-processing
  // 1. format code
  const explorer = cosmiconfig("prettier");
  const searchResult = await explorer.search();
  const prettierConfig =
    searchResult === null ? {} : (searchResult.config as prettier.Options);
  const formattedResult = prettier.format(generatedTypeboxCode, {
    parser: "typescript",
    ...prettierConfig,
  });
  const result = addCommentThatCodeIsGenerated.run(formattedResult);
  return result;
};

/**
 * Declaring this as an object with a function in order to make it better
 * testable with mocks. Allows for tracking the call count.
 */
export const addCommentThatCodeIsGenerated = {
  run: (code: string) => {
    return `/**
 * ATTENTION. This code was AUTO GENERATED by schema2typebox version ${packageJson.version}.
 * While I don't know your use case, there is a high chance that direct changes
 * to this file get lost. Consider making changes to the underlying JSON schema
 * you use to generate this file instead. The default file is called
 * "schema.json", perhaps have a look there! :]
 */

${code}`;
  },
};
