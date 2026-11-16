/**
 * Public storage prefixes are shared by a plane's physical buckets. Both the
 * upload projection and downloadUrl use the same bucket/key address beneath
 * that prefix; a CDN must forward that layout to the object store.
 */
export function buildPublicFileUrl(prefix: string, physicalBucket: string, key: string): string {
  return `${prefix.replace(/\/+$/, '')}/${physicalBucket}/${key}`;
}
