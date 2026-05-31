# Embedder Configuration

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Configure text-to-vector embedding for `--auto-embed` support in csdk.

When an embedder is configured, you can pass plain text to vector fields and the CLI will automatically convert it to an embedding vector.

**Supported providers:** ollama, openai

**Configuration methods:** appstash config (persisted per-context) or environment variables

## Usage

```bash
# Configure via appstash config (persisted per-context)
csdk config set embedder.provider <provider>
csdk config set embedder.model <model>
csdk config set embedder.baseUrl <url>

# Or configure via environment variables
EMBEDDER_PROVIDER=<provider> EMBEDDER_MODEL=<model> EMBEDDER_BASE_URL=<url> csdk <command>
```

## Examples

### Ollama with nomic-embed-text (open-source, local)

```bash
# Start Ollama locally and pull the model
ollama pull nomic-embed-text

# Register the embedder
csdk config set embedder.provider ollama
csdk config set embedder.model nomic-embed-text
csdk config set embedder.baseUrl http://localhost:11434

# Now use --auto-embed with any vector field
csdk agent-plan search "my query" --auto-embed
```

### OpenAI with an API key

```bash
# Register the embedder
csdk config set embedder.provider openai
csdk config set embedder.model text-embedding-3-small
csdk config set embedder.apiKey sk-proj-...your-api-key

# Or use environment variables
EMBEDDER_PROVIDER=openai EMBEDDER_MODEL=text-embedding-3-small EMBEDDER_API_KEY=sk-proj-...your-api-key csdk agent-plan search "my query" --auto-embed
```
