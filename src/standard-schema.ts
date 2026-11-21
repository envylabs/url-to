/**
 * The Standard Schema interface (https://standardschema.dev), copied here as
 * the spec recommends so the package has no dependency on it. Zod, Valibot,
 * ArkType and other validators implement it.
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": StandardSchemaV1Props<Input, Output>;
}

/** Infers a Standard Schema's input type. */
export type StandardSchemaV1InferInput<Schema extends StandardSchemaV1> =
  NonNullable<Schema["~standard"]["types"]>["input"];

/** Infers a Standard Schema's output type. */
export type StandardSchemaV1InferOutput<Schema extends StandardSchemaV1> =
  NonNullable<Schema["~standard"]["types"]>["output"];

/** An issue reported by a failed validation. */
export interface StandardSchemaV1Issue {
  readonly message: string;
  readonly path?:
    readonly (PropertyKey | StandardSchemaV1PathSegment)[] | undefined;
}

/** A key in an issue's path. */
export interface StandardSchemaV1PathSegment {
  readonly key: PropertyKey;
}

/** The Standard Schema properties. */
export interface StandardSchemaV1Props<Input = unknown, Output = Input> {
  readonly types?: StandardSchemaV1Types<Input, Output> | undefined;
  readonly validate: (
    value: unknown,
  ) => Promise<StandardSchemaV1Result<Output>> | StandardSchemaV1Result<Output>;
  readonly vendor: string;
  readonly version: 1;
}

/** The result of a validation. */
export type StandardSchemaV1Result<Output> =
  | { readonly issues: readonly StandardSchemaV1Issue[] }
  | { readonly issues?: undefined; readonly value: Output };

/** The types a Standard Schema carries for inference. */
export interface StandardSchemaV1Types<Input = unknown, Output = Input> {
  readonly input: Input;
  readonly output: Output;
}
