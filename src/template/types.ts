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

/**
 * Operators in which an optional Route Parameter is a compile error, because
 * leaving the value out would leave an empty path segment (e.g. `/items/`).
 */
export type RequiredValueOperator = "" | "+";

/** A template syntax problem, surfaced in the compiler's error message. */
export interface TemplateError<Message extends string = string> {
  readonly "Invalid Route template": Message;
}

/**
 * The Route Parameters inferred from a template. A variable is a required
 * string if any of its occurrences is in a path-type expression, otherwise an
 * optional one.
 */
export type TemplateParameters<Template extends string> = Simplify<
  {
    [
      Variable in TemplateVariables<Template> as Variable["name"] extends TemplateVariableNames<Template>
        ? never
        : Variable["name"]
    ]?: ParameterValue<Variable>;
  } & {
    [
      Variable in TemplateVariables<Template> as Variable["name"] extends TemplateVariableNames<Template>
        ? Variable["name"]
        : never
    ]: ParameterValue<Variable>;
  }
>;

/** A variable in a template expression. */
export interface TemplateVariable<
  Name extends string = string,
  Op extends Operator = Operator,
> {
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
 * The value type accepted for a variable. Extend per operator and explode
 * flag as value types are added.
 */
type ParameterValue<_Variable extends TemplateVariable> = string;

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
  : Varspec extends `${string}*${string}`
    ? TemplateError<`unsupported modifier in "${Varspec}"`>
    : IsVarname<Varspec> extends true
      ? TemplateVariable<Varspec, Op>
      : TemplateError<`invalid variable name "${Varspec}"`>;

type Simplify<T> = { [Key in keyof T]: T[Key] } & {};

type Varchar = "_" | Digit | Lowercase | Uppercase<Lowercase>;
