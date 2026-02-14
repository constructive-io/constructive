ARG BASE=node
ARG BASE_VERSION=22-bookworm
FROM ${BASE}:${BASE_VERSION} AS build

LABEL org.opencontainers.image.source="https://github.com/constructive-io/constructive"
ARG BASE
ARG BASE_VERSION
ENV BASE_VERSION=${BASE_VERSION}

WORKDIR /app

# System deps for building native modules and tools used by the monorepo
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
      ca-certificates curl git python3 make g++; \
    update-ca-certificates || true; \
    npm install -g pnpm@10.10.0; \
    rm -rf /var/lib/apt/lists/*

# Copy full repo (build context must be repo root when building this image)
COPY . .

# Install and build all workspaces
RUN set -eux; \
    CI=true pnpm install --frozen-lockfile; \
    pnpm run build

################################################################################
FROM ${BASE}:${BASE_VERSION} AS constructive

LABEL org.opencontainers.image.source="https://github.com/constructive-io/constructive"
WORKDIR /app

# Runtime deps (psql optional but handy for debugging)
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates postgresql-client; \
    update-ca-certificates || true; \
    npm install -g pnpm@10.10.0; \
    rm -rf /var/lib/apt/lists/*

# Copy built repo from builder
COPY --from=build /app /app

# Lightweight shims to expose CLI on PATH
RUN set -eux; \
    install -d /usr/local/bin; \
    printf '#!/usr/bin/env bash\nnode /app/packages/cli/dist/index.js "$@"\n' > /usr/local/bin/cnc; \
    printf '#!/usr/bin/env bash\nnode /app/packages/cli/dist/index.js "$@"\n' > /usr/local/bin/constructive; \
    printf '#!/usr/bin/env bash\nnode /app/pgpm/pgpm/dist/index.js "$@"\n' > /usr/local/bin/pgpm; \
    chmod +x /usr/local/bin/cnc /usr/local/bin/constructive /usr/local/bin/pgpm

ENTRYPOINT ["/usr/local/bin/constructive"]
CMD ["--help"]
