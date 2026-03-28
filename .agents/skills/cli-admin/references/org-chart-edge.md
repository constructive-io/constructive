# orgChartEdge

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgChartEdge records via csdk CLI

## Usage

```bash
csdk org-chart-edge list
csdk org-chart-edge list --where.<field>.<op> <value> --orderBy <values>
csdk org-chart-edge list --limit 10 --after <cursor>
csdk org-chart-edge find-first --where.<field>.<op> <value>
csdk org-chart-edge get --id <UUID>
csdk org-chart-edge create --entityId <UUID> --childId <UUID> [--parentId <UUID>] [--positionTitle <String>] [--positionLevel <Int>]
csdk org-chart-edge update --id <UUID> [--entityId <UUID>] [--childId <UUID>] [--parentId <UUID>] [--positionTitle <String>] [--positionLevel <Int>]
csdk org-chart-edge delete --id <UUID>
```

## Examples

### List orgChartEdge records

```bash
csdk org-chart-edge list
```

### List orgChartEdge records with pagination

```bash
csdk org-chart-edge list --limit 10 --offset 0
```

### List orgChartEdge records with cursor pagination

```bash
csdk org-chart-edge list --limit 10 --after <cursor>
```

### Find first matching orgChartEdge

```bash
csdk org-chart-edge find-first --where.id.equalTo <value>
```

### List orgChartEdge records with field selection

```bash
csdk org-chart-edge list --select id,id
```

### List orgChartEdge records with filtering and ordering

```bash
csdk org-chart-edge list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgChartEdge

```bash
csdk org-chart-edge create --entityId <UUID> --childId <UUID> [--parentId <UUID>] [--positionTitle <String>] [--positionLevel <Int>]
```

### Get a orgChartEdge by id

```bash
csdk org-chart-edge get --id <value>
```
