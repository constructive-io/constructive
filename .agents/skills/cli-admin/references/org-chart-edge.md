# orgChartEdge

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgChartEdge records via csdk CLI

## Usage

```bash
csdk org-chart-edge list
csdk org-chart-edge get --id <UUID>
csdk org-chart-edge create --entityId <UUID> --childId <UUID> [--parentId <UUID>] [--positionTitle <String>] [--positionLevel <Int>]
csdk org-chart-edge update --id <UUID> [--entityId <UUID>] [--childId <UUID>] [--parentId <UUID>] [--positionTitle <String>] [--positionLevel <Int>]
csdk org-chart-edge delete --id <UUID>
```

## Examples

### List all orgChartEdge records

```bash
csdk org-chart-edge list
```

### Create a orgChartEdge

```bash
csdk org-chart-edge create --entityId <UUID> --childId <UUID> [--parentId <UUID>] [--positionTitle <String>] [--positionLevel <Int>]
```

### Get a orgChartEdge by id

```bash
csdk org-chart-edge get --id <value>
```
