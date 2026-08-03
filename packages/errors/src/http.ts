import { getDefinition } from './registry';

/** Status used when a code carries no mapping. */
export const UNMAPPED_HTTP_STATUS = 500;

export interface HttpStatusResolution {
  /** The status a transport should send. */
  status: number;
  /**
   * Whether `status` came from the registry. `false` means the code is not
   * registered and `status` is the {@link UNMAPPED_HTTP_STATUS} fallback — the
   * one case where a 500 does not mean "the server broke".
   */
  mapped: boolean;
}

/** Notified once per unmapped code. */
export type UnmappedStatusReporter = (code: string) => void;

const reported = new Set<string>();

const defaultReporter: UnmappedStatusReporter = code => {
  // eslint-disable-next-line no-console
  console.warn(
    `[constructive-errors] no HTTP status mapping for ${code}; responding ${UNMAPPED_HTTP_STATUS}. ` +
      'Register the code so intentional refusals stop surfacing as server errors.'
  );
};

let reporter: UnmappedStatusReporter = defaultReporter;

/**
 * Replace the unmapped-code reporter (pass `null` to restore the default, or a
 * no-op to silence it). Transports with a real logger should route it there.
 */
export function setUnmappedStatusReporter(next: UnmappedStatusReporter | null): void {
  reporter = next ?? defaultReporter;
}

/** Test seam: forget which codes have already been reported. */
export function resetUnmappedStatusReports(): void {
  reported.clear();
}

/**
 * Resolve the HTTP status for an error code.
 *
 * An unregistered code is reported (once per code) rather than silently
 * degrading to 500: a refusal that is plainly a 403 or 409 turning into a 500
 * looks like a crash, and the only way anyone notices is by reading the
 * transport's source.
 */
export function httpStatusFor(code: string | null | undefined): HttpStatusResolution {
  const def = code ? getDefinition(code) : undefined;
  if (def) return { status: def.http, mapped: true };

  if (code && !reported.has(code)) {
    reported.add(code);
    reporter(code);
  }

  return { status: UNMAPPED_HTTP_STATUS, mapped: false };
}
