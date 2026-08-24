export interface SpecResolveError {
  /** swagger-parser's .validate() combines structural validation and $ref
   * resolution in one call — we can't yet distinguish which one failed from
   * its errors. "validate" covers both until/unless we split them out. */
  stage: "validate";
  message: string;
  cause: unknown;
}
