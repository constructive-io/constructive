/**
 * TypedDocumentString - Type-safe wrapper for GraphQL documents
 * Compatible with GraphQL codegen client preset
 */

/**
 * Document type decoration interface (from @graphql-typed-document-node/core)
 */
export interface DocumentTypeDecoration<TResult, TVariables> {
  /**
   * This type is used to ensure that the variables you pass in to the query are assignable to Variables
   * and that the Result is assignable to whatever you pass your result to.
   */
  __apiType?: (variables: TVariables) => TResult;
}

/**
 * Enhanced TypedDocumentString with type inference capabilities
 * Compatible with GraphQL codegen client preset
 */
export class TypedDocumentString<TResult = unknown, TVariables = unknown>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  /** Same shape as the codegen implementation for structural typing */
  __apiType?: (variables: TVariables) => TResult;
  __meta__?: Record<string, unknown>;

  private value: string;

  constructor(value: string, meta?: Record<string, unknown>) {
    super(value);
    this.value = value;
    this.__meta__ = {
      hash: this.generateHash(value),
      ...meta,
    };
  }

  private generateHash(value: string): string {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  override toString(): string {
    return this.value;
  }

  /**
   * Get the hash for caching purposes
   */
  getHash(): string {
    return this.__meta__?.hash as string;
  }
}
