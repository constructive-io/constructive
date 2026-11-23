/** The slice of a column codec the decoders read: its name, or its element's. */
interface ModifiedCodec {
  name: string;
  arrayOfCodec?: { name: string } | null;
}

/**
 * Declared limits read from a column's type modifier (`pg_attribute.atttypmod`),
 * which the codec doesn't carry: codecs are shared by every column of a type,
 * so `varchar(10)` and `varchar(40)` columns have the same codec.
 *
 * Each decoder follows the type's own typmod layout; a modifier of -1 (none)
 * yields nothing. An array column stores its element's modifier, so the facts
 * apply to each element.
 */
export interface TypeModifierFacts {
  /** varchar/char: characters; bit/varbit: bits. */
  maxLength?: number;
  /** numeric: total significant digits. */
  precision?: number;
  /** numeric: digits after the decimal point (negative rounds left of it). */
  scale?: number;
  /** geometry/geography: declared spatial reference id; absent when unset (0). */
  geometrySrid?: number;
  /** vector: declared number of dimensions. */
  vectorDimensions?: number;
}

// PostgreSQL's varlena header size, which varchar/char/numeric modifiers include.
const VARHDRSZ = 4;

function characterLength(typmod: number): TypeModifierFacts {
  return typmod >= VARHDRSZ ? { maxLength: typmod - VARHDRSZ } : {};
}

function bitLength(typmod: number): TypeModifierFacts {
  return typmod >= 0 ? { maxLength: typmod } : {};
}

// numeric: ((precision << 16) | (scale & 0x7ff)) + VARHDRSZ, where the scale is
// an 11-bit two's-complement value (PostgreSQL 15+ allows -1000..1000).
function numericLimits(typmod: number): TypeModifierFacts {
  if (typmod < VARHDRSZ) return {};
  const value = typmod - VARHDRSZ;
  return {
    precision: (value >> 16) & 0xffff,
    scale: ((value & 0x7ff) ^ 1024) - 1024
  };
}

// PostGIS: srid = ((typmod & 0x0FFFFF00) - (typmod & 0x10000000)) >> 8. A zero
// SRID means none was declared.
function spatialReference(typmod: number): TypeModifierFacts {
  if (typmod < 0) return {};
  const srid = ((typmod & 0x0fffff00) - (typmod & 0x10000000)) >> 8;
  return srid > 0 ? { geometrySrid: srid } : {};
}

// pgvector: the modifier is the dimension count.
function vectorDimensions(typmod: number): TypeModifierFacts {
  return typmod > 0 ? { vectorDimensions: typmod } : {};
}

const DECODERS: Readonly<Record<string, (typmod: number) => TypeModifierFacts>> = {
  varchar: characterLength,
  bpchar: characterLength,
  bit: bitLength,
  varbit: bitLength,
  numeric: numericLimits,
  geometry: spatialReference,
  geography: spatialReference,
  vector: vectorDimensions
};

export function readTypeModifier(
  codec: ModifiedCodec | null | undefined,
  typmod: number | null | undefined
): TypeModifierFacts {
  if (typmod == null || typmod === -1) return {};
  const elementCodec = codec?.arrayOfCodec ?? codec;
  const decode = elementCodec ? DECODERS[elementCodec.name] : undefined;
  return decode ? decode(typmod) : {};
}
