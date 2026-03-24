# orgChartEdgeGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgChartEdgeGrant records via csdk CLI

## Usage

```bash
csdk org-chart-edge-grant list
csdk org-chart-edge-grant get --id <UUID>
csdk org-chart-edge-grant create --entityId <UUID> --childId <UUID> [--parentId <UUID>] [--grantorId <UUID>] [--isGrant <Boolean>] [--positionTitle <String>] [--positionLevel <Int>]
csdk org-chart-edge-grant update --id <UUID> [--entityId <UUID>] [--childId <UUID>] [--parentId <UUID>] [--grantorId <UUID>] [--isGrant <Boolean>] [--positionTitle <String>] [--positionLevel <Int>]
csdk org-chart-edge-grant delete --id <UUID>
```

## Examples

### List all orgChartEdgeGrant records

```bash
csdk org-chart-edge-grant list
```

### Create a orgChartEdgeGrant

```bash
csdk org-chart-edge-grant create --entityId <UUID> --childId <UUID> [--parentId <UUID>] [--grantorId <UUID>] [--isGrant <Boolean>] [--positionTitle <String>] [--positionLevel <Int>]
```

### Get a orgChartEdgeGrant by id

```bash
csdk org-chart-edge-grant get --id <value>
```
