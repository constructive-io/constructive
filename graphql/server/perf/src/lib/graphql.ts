export interface GraphqlPayload {
  query: string;
  variables?: Record<string, unknown>;
}
