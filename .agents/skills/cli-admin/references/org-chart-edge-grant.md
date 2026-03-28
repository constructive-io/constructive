# orgChartEdgeGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgChartEdgeGrant records via csdk CLI

## Usage

```bash
csdk org-chart-edge-grant list
csdk org-chart-edge-grant list --where.<field>.<op> <value> --orderBy <values>
csdk org-chart-edge-grant list --limit 10 --after <cursor>
csdk org-chart-edge-grant find-first --where.<field>.<op> <value>
csdk org-chart-edge-grant get --id <UUID>
csdk org-chart-edge-grant create --entityId <UUID> --childId <UUID> [--parentId <UUID>] [--grantorId <UUID>] [--isGrant <Boolean>] [--positionTitle <String>] [--positionLevel <Int>]
csdk org-chart-edge-grant update --id <UUID> [--entityId <UUID>] [--childId <UUID>] [--parentId <UUID>] [--grantorId <UUID>] [--isGrant <Boolean>] [--positionTitle <String>] [--positionLevel <Int>]
csdk org-chart-edge-grant delete --id <UUID>
```

## Examples

### List orgChartEdgeGrant records

```bash
csdk org-chart-edge-grant list
```

### List orgChartEdgeGrant records with pagination

```bash
csdk org-chart-edge-grant list --limit 10 --offset 0
```

### List orgChartEdgeGrant records with cursor pagination

```bash
csdk org-chart-edge-grant list --limit 10 --after <cursor>
```

### Find first matching orgChartEdgeGrant

```bash
csdk org-chart-edge-grant find-first --where.id.equalTo <value>
```

### List orgChartEdgeGrant records with field selection

```bash
csdk org-chart-edge-grant list --select id,id
```

### List orgChartEdgeGrant records with filtering and ordering

```bash
csdk org-chart-edge-grant list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgChartEdgeGrant

```bash
csdk org-chart-edge-grant create --entityId <UUID> --childId <UUID> [--parentId <UUID>] [--grantorId <UUID>] [--isGrant <Boolean>] [--positionTitle <String>] [--positionLevel <Int>]
```

### Get a orgChartEdgeGrant by id

```bash
csdk org-chart-edge-grant get --id <value>
```
