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
export type Operator = "";

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

/** A template syntax problem, surfaced in the compiler's error message. */
export interface TemplateError<Message extends string = string> {
  readonly "Invalid Route template": Message;
}

/**
 * The Route Parameters inferred from a template: every variable is a required
 * string.
 */
export type TemplateParameters<Template extends string> = {
  [
    Variable in TemplateVariables<Template> as Variable["name"]
  ]: ParameterValue<Variable>;
};

/** A variable in a template expression. */
export interface TemplateVariable<
  Name extends string = string,
  Op extends Operator = Operator,
> {
  readonly name: Name;
  readonly operator: Op;
}

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
> = Varspec extends `${string}${":" | "*"}${string}`
  ? TemplateError<`unsupported modifier in "${Varspec}"`>
  : IsVarname<Varspec> extends true
    ? TemplateVariable<Varspec, Op>
    : TemplateError<`invalid variable name "${Varspec}"`>;

type Varchar = "_" | Digit | Lowercase | Uppercase<Lowercase>;
