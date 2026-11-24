// Jest runs each test file in its own realm, with its own Array and Object,
// but structuredClone comes from Node's realm. So a clone's arrays and objects
// have other prototypes, and node:assert's deepStrictEqual, which compares
// prototypes, fails on equal values. Here structuredClone still makes the
// copy, and its arrays, plain objects, dates, maps and sets are rebuilt in the
// test file's realm, as they are when the code runs outside jest.
const nodeClone = globalThis.structuredClone;

const isPlainObject = (value) => {
  const proto = Object.getPrototypeOf(value);
  return proto === null || Object.getPrototypeOf(proto) === null;
};

function rehome(value) {
  if (typeof value !== 'object' || value === null) return value;
  if (Array.isArray(value)) return Array.from(value, rehome);
  const tag = Object.prototype.toString.call(value);
  if (tag === '[object Date]') return new Date(value.getTime());
  if (tag === '[object Map]') return new Map(Array.from(value, ([k, v]) => [rehome(k), rehome(v)]));
  if (tag === '[object Set]') return new Set(Array.from(value, rehome));
  if (tag === '[object Object]' && isPlainObject(value)) {
    const copy = Object.getPrototypeOf(value) === null ? Object.create(null) : {};
    for (const key of Object.keys(value)) copy[key] = rehome(value[key]);
    return copy;
  }
  return value;
}

globalThis.structuredClone = (value, options) => rehome(nodeClone(value, options));
