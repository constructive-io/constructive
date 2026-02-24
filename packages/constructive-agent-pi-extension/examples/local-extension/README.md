# Local Extension Example

1. Set runtime env:

```bash
export CONSTRUCTIVE_GRAPHQL_ENDPOINT="https://<your-api>/graphql"
export CONSTRUCTIVE_ACCESS_TOKEN="<bearer-token>"
```

2. Start PI with this extension:

```bash
pi -e ./packages/constructive-agent-pi-extension/examples/local-extension/constructive-extension.ts
```

3. In PI, run:

- `/constructive-status`
- ask the model to create/read projects using the registered tools.
