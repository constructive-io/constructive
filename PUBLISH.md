# Publishing

Packages are published to npm via [Trusted Publishing (OIDC)](https://docs.npmjs.com/trusted-publishers)
from the [`npm-publish` workflow](.github/workflows/npm-publish.yaml). No npm
tokens are used anywhere — GitHub Actions proves its identity to npm with a
short-lived OIDC token, and npm only accepts publishes from the exact
repository + workflow + environment configured per package. Every publish
also gets provenance attestations automatically.

## Release flow

1. Version and tag locally (from `main`):

   ```bash
   pnpm install
   pnpm lerna version
   ```

   This bumps versions with conventional commits, commits, tags, and pushes.

2. Kick off the publish: GitHub → Actions → **npm-publish** → *Run workflow*.
   The run pauses on the `npm-publish` environment gate until a required
   reviewer approves it. It then builds and runs `pnpm publish -r`, which
   publishes every package whose `package.json` version is not yet on the
   registry.

You can also do a dry run (workflow input `dry-run`) or publish under a
different dist-tag (input `dist-tag`).

## One-time setup

### GitHub

1. Repo → Settings → Environments → create `npm-publish`.
2. Add **Required reviewers** (you) so nothing publishes without your
   approval, and restrict **Deployment branches** to `main`.

### npm (per package)

For each published package, on npmjs.com go to the package → **Settings** →
**Trusted Publisher** and configure:

- Publisher: **GitHub Actions**
- Organization/user: `constructive-io`
- Repository: `constructive`
- Workflow filename: `npm-publish.yaml`
- Environment: `npm-publish`

Then under the same settings page set **Publishing access** to *Require
two-factor authentication and disallow tokens* (trusted publishing is
exempt), so tokens can never be used to publish.

List all publishable packages:

```bash
pnpm ls -r --depth -1 --json | node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
  for (const p of JSON.parse(s)) {
    const pj=require(p.path+'/package.json');
    if(!pj.private) console.log('https://www.npmjs.com/package/'+pj.name+'/access');
  }
});"
```

### Caveats

- Trusted publishers can only be configured on packages that already exist on
  npm. A brand-new package's first publish must be done manually (e.g.
  locally with `npm publish` + 2FA); after that, configure its trusted
  publisher and it flows through the workflow like the rest.
- Trusted publishing requires npm ≥ 11.5.1 or pnpm ≥ 10.9 in CI (the
  workflow uses pnpm 10).
