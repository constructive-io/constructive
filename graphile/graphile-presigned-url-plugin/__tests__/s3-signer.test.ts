/**
 * Presigned URLs are handed to clients, so they must be signed for the host the
 * client calls. SigV4 signs the Host header: a URL minted for an internal
 * storage host (an in-cluster Service) cannot be repointed at the public host
 * afterwards — the signature only validates for the host it was signed with.
 */

import { S3Client } from '@aws-sdk/client-s3';
import { createHash, createHmac } from 'crypto';

import { generatePresignedGetUrl, generatePresignedPutUrl } from '../src/s3-signer';
import type { S3Config } from '../src/types';

const INTERNAL = 'http://rustfs.constructive-infra.svc.cluster.local:9000';
const PUBLIC = 'https://storage.example.com';
const REGION = 'us-east-1';
const ACCESS_KEY = 'AKIDEXAMPLE';
const SECRET_KEY = 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY';
const NOW = new Date('2026-01-01T00:00:00.000Z');

function client(endpoint: string): S3Client {
  return new S3Client({
    region: REGION,
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  });
}

const internalOnly: S3Config = {
  client: client(INTERNAL),
  bucket: 'tenant-bucket',
  endpoint: INTERNAL,
  region: REGION,
  forcePathStyle: true,
};

const withPublicEndpoint: S3Config = {
  ...internalOnly,
  presignClient: client(PUBLIC),
  publicEndpoint: PUBLIC,
};

const encode = (value: string) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const hmac = (key: Buffer | string, value: string) => createHmac('sha256', key).update(value).digest();

/**
 * Independent SigV4 query-signature check, as the storage server performs it:
 * recompute the signature for the request a client sends to `url` (whose Host
 * is `url.host`) and compare it with the one in the URL.
 */
function signatureValidates(method: string, url: string, headers: Record<string, string> = {}): boolean {
  const parsed = new URL(url);
  const params = [...parsed.searchParams.entries()];
  const signature = parsed.searchParams.get('X-Amz-Signature');
  const amzDate = parsed.searchParams.get('X-Amz-Date')!;
  const [, date, region, service] = parsed.searchParams.get('X-Amz-Credential')!.split('/');
  const signedHeaders = parsed.searchParams.get('X-Amz-SignedHeaders')!;

  const requestHeaders: Record<string, string> = { host: parsed.host, ...headers };
  const canonicalQuery = params
    .filter(([name]) => name !== 'X-Amz-Signature')
    .map(([name, value]) => `${encode(name)}=${encode(value)}`)
    .sort()
    .join('&');
  const canonicalHeaders = signedHeaders
    .split(';')
    .map((name) => `${name}:${requestHeaders[name]}\n`)
    .join('');
  const canonicalRequest = [
    method, parsed.pathname, canonicalQuery, canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD',
  ].join('\n');

  const scope = `${date}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${SECRET_KEY}`, date), region), service), 'aws4_request');
  return hmac(signingKey, stringToSign).toString('hex') === signature;
}

/** The same URL pointed at another host — what a post-signing host rewrite produces. */
const rehost = (url: string, endpoint: string) => {
  const parsed = new URL(url);
  const target = new URL(endpoint);
  parsed.protocol = target.protocol;
  parsed.host = target.host;
  return parsed.toString();
};

beforeAll(() => {
  jest.useFakeTimers({ now: NOW, advanceTimers: true });
});

afterAll(() => {
  jest.useRealTimers();
});

describe('generatePresignedPutUrl', () => {
  const putHeaders = { 'content-length': '11', 'content-type': 'text/plain' };

  it('signs for the internal endpoint when no public endpoint is configured', async () => {
    const url = await generatePresignedPutUrl(internalOnly, 'abc', 'text/plain', 11, 900);

    expect(new URL(url).origin).toBe(INTERNAL);
    expect(new URL(url).pathname).toBe('/tenant-bucket/abc');
    expect(new URL(url).searchParams.get('X-Amz-Date')).toBe('20260101T000000Z');
    expect(signatureValidates('PUT', url, putHeaders)).toBe(true);
  });

  it('signs for the public endpoint when one is configured', async () => {
    const url = await generatePresignedPutUrl(withPublicEndpoint, 'abc', 'text/plain', 11, 900);

    expect(new URL(url).origin).toBe(PUBLIC);
    expect(new URL(url).pathname).toBe('/tenant-bucket/abc');
    expect(signatureValidates('PUT', url, putHeaders)).toBe(true);
  });

  it('a URL signed for the internal host does not validate at the public host', async () => {
    const url = await generatePresignedPutUrl(internalOnly, 'abc', 'text/plain', 11, 900);

    expect(signatureValidates('PUT', rehost(url, PUBLIC), putHeaders)).toBe(false);
  });
});

describe('generatePresignedGetUrl', () => {
  it('signs for the internal endpoint when no public endpoint is configured', async () => {
    const url = await generatePresignedGetUrl(internalOnly, 'abc', 3600, 'report.pdf');

    expect(new URL(url).origin).toBe(INTERNAL);
    expect(signatureValidates('GET', url)).toBe(true);
  });

  it('signs for the public endpoint when one is configured', async () => {
    const url = await generatePresignedGetUrl(withPublicEndpoint, 'abc', 3600, 'report.pdf');

    expect(new URL(url).origin).toBe(PUBLIC);
    expect(new URL(url).searchParams.get('response-content-disposition')).toBe('attachment; filename="report.pdf"');
    expect(signatureValidates('GET', url)).toBe(true);
    expect(signatureValidates('GET', rehost(url, INTERNAL))).toBe(false);
  });
});
