/**
 * Validates an Origin and returns it serialized as scheme, host and optional
 * port, with no trailing slash. Shared by every url-to (see ADR-0003).
 *
 * @throws TypeError when the Origin isn't a URL with a host, or includes
 * anything other than a scheme, host and port (a bare trailing `/` is allowed).
 */
export function parseOrigin(origin: string): string {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw invalidOrigin(notAbsolute);
  }

  // Schemes without a host (`file:`, `mailto:`, `data:`) have an opaque origin.
  if (url.origin === "null") {
    throw invalidOrigin(notAbsolute);
  }
  if (url.username !== "" || url.password !== "") {
    throw invalidOrigin("must not include credentials");
  }
  if (url.pathname !== "/") {
    throw invalidOrigin("must not include a path");
  }

  // An empty `?` or `#` leaves `search` or `hash` empty but stays in `href`.
  const [beforeFragment = ""] = url.href.split("#", 1);
  if (url.search !== "" || beforeFragment.endsWith("?")) {
    throw invalidOrigin("must not include a query");
  }
  if (url.hash !== "" || url.href.endsWith("#")) {
    throw invalidOrigin("must not include a fragment");
  }

  return url.origin;
}

const notAbsolute = "must be an absolute URL with a scheme and host";

function invalidOrigin(reason: string): TypeError {
  return new TypeError(`Invalid Origin: ${reason}`);
}
