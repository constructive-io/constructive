/**
 * The registry the projectors use when a caller does not pass their own.
 *
 * pi is registered because it is the harness the platform ships; a host adding
 * a second one either registers into its own registry or into this one at
 * startup. Kept apart from `./reader` so the registry type does not depend on
 * any format.
 */

import { piTranscriptReader } from './pi-reader';
import { TranscriptReaderRegistry } from './reader';

/** Readers registered out of the box. */
export const defaultTranscriptReaders = (): TranscriptReaderRegistry =>
  new TranscriptReaderRegistry([piTranscriptReader]);

/**
 * The process-wide registry. Mutable on purpose: a host registers its adapter's
 * reader once at startup and every projector call then reads that format.
 */
export const transcriptReaders = defaultTranscriptReaders();
