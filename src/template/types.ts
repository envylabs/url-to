/**
 * Type-level RFC 6570 template parser. It must accept exactly the syntax that
 * `parseTemplate` in `./engine.ts` accepts.
 *
 * `ParseTemplate<T>` yields a union of `TemplateVariable`s (one per varspec)
 * and `TemplateError`s (one per syntax problem). Everything else is derived
 * from that union.
 */

/**
 * `unknown` for a valid template, or its `TemplateError`s otherwise. Intersect
 * a template parameter with it to reject invalid templates at compile time.
 */
export type CheckTemplate<Template extends string> = [
  Extract<ParseTemplate<Template>, TemplateError>,
] extends [never]
  ? unknown
  : Extract<ParseTemplate<Template>, TemplateError>;

/** A list value, allowed only for exploded variables. */
export type ListValue = readonly ScalarValue[];

/**
 * Keys of `Params` whose type admits a list or record (an array or a plain
 * object type) and that name a scalar-only variable (see
 * {@link ScalarVariableNames}). Non-empty means a compile error.
 */
export type MisplacedListKeys<Template extends string, Params> = {
  [Key in keyof Params]-?: [
    Extract<
      Params[Key],
      Readonly<Record<string, unknown>> | readonly unknown[]
    >,
  ] extends [never]
    ? never
    : Key;
}[keyof Params] &
  ScalarVariableNames<Template>;

/**
 * The operators the engine supports. `""` is a simple expression. Add an
 * operator's character here when it is added to `operators` in
 * `./operators.ts`.
 */
export type Operator = ";" | "?" | "." | "" | "/" | "&" | "#" | "+";

export type ParseTemplate<Template extends string> =
  Template extends `${infer Literal}{${infer Rest}`
    ? Literal extends `${string}}${string}`
      ? TemplateError<'unmatched "}"'>
      : Rest extends `${infer Body}}${infer After}`
        ? Body extends `${string}{${string}`
          ? TemplateError<'unclosed "{"'>
          : ParseExpression<Body> | ParseTemplate<After>
        : TemplateError<'unclosed "{"'>
    : Template extends `${string}}${string}`
      ? TemplateError<'unmatched "}"'>
      : never;

/**
 * Operators in which a missing value would produce a broken path. Template-only
 * variables in these positions are required; elsewhere (query, continuation
 * and fragment) they are optional. Mirrors `pathType` in `./operators.ts`.
 */
export type PathTypeOperator = ";" | "." | "" | "/" | "+";

/** A record (associative array) value, allowed only for exploded variables. */
export type RecordValue = Readonly<Record<string, ScalarValue>>;

/**
 * Operators in which an optional Route Parameter is a compile error, because
 * leaving the value out would leave an empty path segment (e.g. `/items/`).
 */
export type RequiredValueOperator = "" | "+";

/** A single Route Parameter value. Mirrors `ScalarValue` in `./engine.ts`. */
export type ScalarValue = boolean | number | string;

/**
 * Names of the template's variables that only take a scalar: those with at
 * least one occurrence that isn't exploded. A list or record there is a
 * compile error.
 */
export type ScalarVariableNames<Template extends string> = Extract<
  TemplateVariables<Template>,
  { readonly explode: false }
>["name"];

/** A template syntax problem, surfaced in the compiler's error message. */
export interface TemplateError<Message extends string = string> {
  readonly "Invalid Route template": Message;
}

/**
 * The Route Parameters inferred from a template. A variable is required if
 * any of its occurrences is in a path-type expression, otherwise optional. It
 * takes a scalar, or also a list or record when every occurrence is exploded.
 *
 * With `Mode` set to `"parsed"`, the values are what reverse parsing yields
 * instead: a string, or also a list of strings when every occurrence is
 * exploded.
 */
export type TemplateParameters<
  Template extends string,
  Mode extends "input" | "parsed" = "input",
> = Simplify<
  {
    [
      Variable in TemplateVariables<Template> as Variable["name"] extends TemplateVariableNames<Template>
        ? never
        : Variable["name"]
    ]?: ParameterValue<Template, Variable["name"], Mode>;
  } & {
    [
      Variable in TemplateVariables<Template> as Variable["name"] extends TemplateVariableNames<Template>
        ? Variable["name"]
        : never
    ]: ParameterValue<Template, Variable["name"], Mode>;
  }
>;

/**
 * A variable in a template expression. `Explode` is `true` for a varspec
 * with the explode modifier, e.g. `tags*` in `{?tags*}`.
 */
export interface TemplateVariable<
  Name extends string = string,
  Op extends Operator = Operator,
  Explode extends boolean = boolean,
> {
  readonly explode: Explode;
  readonly name: Name;
  readonly operator: Op;
}

/**
 * Names of the template's variables that appear in at least one expression
 * whose operator is in `Op`. With the default, the names a template-only Route
 * requires.
 */
export type TemplateVariableNames<
  Template extends string,
  Op extends Operator = PathTypeOperator,
> = Extract<TemplateVariables<Template>, { readonly operator: Op }>["name"];

/** The template's variables, as a union of `TemplateVariable`s. */
export type TemplateVariables<Template extends string> = Extract<
  ParseTemplate<Template>,
  TemplateVariable
>;

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

type IsVarchars<Chars extends string> =
  Chars extends `${infer Character}${infer Rest}`
    ? Character extends Varchar
      ? Rest extends ""
        ? true
        : IsVarchars<Rest>
      : false
    : false;

type IsVarname<Name extends string> = Name extends `${infer Head}.${infer Tail}`
  ? IsVarchars<Head> extends true
    ? IsVarname<Tail>
    : false
  : IsVarchars<Name>;

type Lowercase =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z";
/** Every character RFC 6570 reserves as an operator. */
type OperatorCharacter =
  "," | ";" | "!" | "?" | "." | "@" | "/" | "&" | "#" | "+" | "=" | "|";
/**
 * The value type accepted for a variable: a list or record only when every
 * occurrence of it is exploded, otherwise a scalar.
 */
type ParameterValue<
  Template extends string,
  Name extends string,
  Mode extends "input" | "parsed",
> = Mode extends "parsed"
  ? Name extends ScalarVariableNames<Template>
    ? string
    : string | string[]
  : Name extends ScalarVariableNames<Template>
    ? ScalarValue
    : ListValue | RecordValue | ScalarValue;

type ParseExpression<Body extends string> =
  Body extends `${infer Character}${infer Varlist}`
    ? Character extends OperatorCharacter
      ? Character extends Operator
        ? ParseVarlist<Varlist, Character>
        : TemplateError<`unsupported operator "${Character}"`>
      : ParseVarlist<Body, "">
    : ParseVarlist<Body, "">;

type ParseVarlist<
  Varlist extends string,
  Op extends Operator,
> = Varlist extends `${infer Varspec},${infer Tail}`
  ? ParseVarlist<Tail, Op> | ParseVarspec<Varspec, Op>
  : ParseVarspec<Varlist, Op>;

type ParseVarspec<
  Varspec extends string,
  Op extends Operator,
> = Varspec extends `${string}:${string}`
  ? TemplateError<`prefix modifiers are not supported in "${Varspec}"`>
  : Varspec extends `${infer Name}*`
    ? IsVarname<Name> extends true
      ? TemplateVariable<Name, Op, true>
      : TemplateError<`invalid variable name "${Varspec}"`>
    : IsVarname<Varspec> extends true
      ? TemplateVariable<Varspec, Op, false>
      : TemplateError<`invalid variable name "${Varspec}"`>;

type Simplify<T> = { [Key in keyof T]: T[Key] } & {};

type Varchar = "_" | Digit | Lowercase | Uppercase<Lowercase>;
