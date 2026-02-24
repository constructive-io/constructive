# PI Package Install Example

Install from local workspace:

```bash
pi install ./packages/constructive-agent-pi-extension -l
```

This writes the package source to project settings (`.pi/settings.json`).

You can also add it directly:

```json
{
  "packages": [
    "./packages/constructive-agent-pi-extension"
  ]
}
```

Set env before starting PI:

```bash
export CONSTRUCTIVE_GRAPHQL_ENDPOINT="https://<your-api>/graphql"
export CONSTRUCTIVE_ACCESS_TOKEN="<bearer-token>"
export CONSTRUCTIVE_OPERATIONS_FILE="./packages/constructive-agent-pi-extension/examples/pi-package/operations.json"
```

Then run:

```bash
pi
```

Use extension commands:

- `/constructive-status`
- `/constructive-auth-status`
- `/constructive-auth-set <token>`
