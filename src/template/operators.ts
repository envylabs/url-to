/**
 * The RFC 6570 operators the engine supports, keyed by their operator
 * character (`""` for a simple expression). Each entry carries the expansion
 * behaviour from RFC 6570 Appendix A, plus `pathType`, which marks positions
 * where a missing or empty value would produce a broken path.
 *
 * Adding an operator means adding an entry here and its character to
 * `Operator` in `./types.ts`. The expander and validator read only this table.
 */
export interface OperatorSpec {
  /** Whether reserved and pct-encoded characters are kept unescaped. */
  readonly allowReserved: boolean;
  /** Prepended to the expansion when at least one variable is defined. */
  readonly first: string;
  /** Appended to `name` when a named variable's value is empty. */
  readonly ifEmpty: string;
  /** Whether each value is written as `name=value`. */
  readonly named: boolean;
  /** Whether the variable must be a non-empty value for template-only Routes. */
  readonly pathType: boolean;
  /** Joins the expansions of the expression's variables. */
  readonly separator: string;
}

export const operators: Readonly<Record<string, OperatorSpec | undefined>> = {
  "": {
    allowReserved: false,
    first: "",
    ifEmpty: "",
    named: false,
    pathType: true,
    separator: ",",
  },
  ";": {
    allowReserved: false,
    first: ";",
    ifEmpty: "",
    named: true,
    pathType: true,
    separator: ";",
  },
  "?": {
    allowReserved: false,
    first: "?",
    ifEmpty: "=",
    named: true,
    pathType: false,
    separator: "&",
  },
  ".": {
    allowReserved: false,
    first: ".",
    ifEmpty: "",
    named: false,
    pathType: true,
    separator: ".",
  },
  "/": {
    allowReserved: false,
    first: "/",
    ifEmpty: "",
    named: false,
    pathType: true,
    separator: "/",
  },
  "&": {
    allowReserved: false,
    first: "&",
    ifEmpty: "=",
    named: true,
    pathType: false,
    separator: "&",
  },
  "#": {
    allowReserved: true,
    first: "#",
    ifEmpty: "",
    named: false,
    pathType: false,
    separator: ",",
  },
  "+": {
    allowReserved: true,
    first: "",
    ifEmpty: "",
    named: false,
    pathType: true,
    separator: ",",
  },
};

/**
 * Characters RFC 6570 reserves as operators (including those reserved for
 * future extensions). An expression starting with one of these that isn't in
 * {@link operators} is unsupported.
 */
export const operatorCharacters = "+#./;?&=,!@|";
