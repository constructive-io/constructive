# graphile-plugin-connection-filter-postgis

PostGIS spatial filter operators for `postgraphile-plugin-connection-filter` (PostGraphile v5).

## Installation

```bash
npm install graphile-plugin-connection-filter-postgis
```

## Usage

```typescript
import { GraphilePostgisPreset } from 'graphile-postgis';
import { PostGraphileConnectionFilterPreset } from 'postgraphile-plugin-connection-filter';
import { PostgisConnectionFilterPreset } from 'graphile-plugin-connection-filter-postgis';

const preset = {
  extends: [
    GraphilePostgisPreset,
    PostGraphileConnectionFilterPreset,
    PostgisConnectionFilterPreset
  ]
};
```

## Operators

### Function-based operators (geometry)

- `contains` — ST_Contains
- `containsProperly` — ST_ContainsProperly
- `crosses` — ST_Crosses
- `disjoint` — ST_Disjoint
- `equals` — ST_Equals
- `intersects` — ST_Intersects
- `intersects3D` — ST_3DIntersects
- `orderingEquals` — ST_OrderingEquals
- `overlaps` — ST_Overlaps
- `touches` — ST_Touches
- `within` — ST_Within

### Function-based operators (geometry + geography)

- `coveredBy` — ST_CoveredBy
- `covers` — ST_Covers
- `intersects` — ST_Intersects

### Bounding box operators

- `bboxIntersects2D` — `&&`
- `bboxIntersectsND` — `&&&`
- `bboxOverlapsOrLeftOf` — `&<`
- `bboxOverlapsOrBelow` — `&<|`
- `bboxOverlapsOrRightOf` — `&>`
- `bboxOverlapsOrAbove` — `|&>`
- `bboxLeftOf` — `<<`
- `bboxBelow` — `<<|`
- `bboxRightOf` — `>>`
- `bboxAbove` — `|>>`
- `bboxContains` — `~`
- `bboxEquals` — `~=`
- `exactlyEquals` — `=`
