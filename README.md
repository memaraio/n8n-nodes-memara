# Memara n8n Community Node

![Memara Logo](https://app.memara.io/logos/memara-logo.svg)

n8n community package **n8n-nodes-memara** integrates Memara’s semantic memory API. Version **2.x** exposes **five action nodes** (one operation each) so you can pick the right step from the node panel without an operation dropdown. From **2.1.0** onward it also ships **three polling triggers** aligned with common Zapier-style patterns (with the API limitations described below).

## Features

### Action nodes

- **Memara Create Memory** — store content with optional title and tags
- **Memara Search Memories** — semantic search with limit
- **Memara Update Memory** — update by memory ID
- **Memara Delete Memory** — delete by memory ID
- **Memara List Memories** — paginated list (limit / offset)

### Polling triggers (2.1+)

- **Memara Trigger: New Memory** — polls `GET /api/v1/n8n/memories`; first successful poll establishes a baseline (no run), then new items are detected by `created_at` and same-second `id` handling within the configured list window.
- **Memara Trigger: Memory Updated** — best-effort: compares a fingerprint of list fields per memory **only for memories returned in the current list window**; not a guarantee for the entire space.
- **Memara Trigger: Search Match** — polls `POST /api/v1/n8n/search`; emits memories whose ids newly appear in the top-N search results. **Similarity scores are not returned** on this API path, so threshold filtering is not supported.

**Shared credentials** — one **Memara API** credential for all nodes and triggers.

**AI tools** — action nodes are usable as tools where your n8n version supports it (triggers are not tools).

### Polling costs and limits

Each poll is a real Memara API call and counts toward your plan limits. Triggers only see memories inside the **fetched page** (`limit` ≤ 100 for list, ≤ 50 for search). If more new memories arrive between polls than fit in that window, some may not be observed—design workflows and limits accordingly.

## Installation

### Option 1: Community Nodes (recommended)

1. In n8n: **Settings** → **Community Nodes**
2. Install package: `n8n-nodes-memara`
3. Restart n8n if prompted

### Option 2: npm

```bash
npm install n8n-nodes-memara
```

### Option 3: Local development

```bash
git clone https://github.com/memara-memory/n8n-nodes-memara.git
cd n8n-nodes-memara
npm install
npm run build
npm link

cd ~/.n8n/nodes
npm link n8n-nodes-memara
```

## Configuration

### 1. API key

1. Open [Memara](https://app.memara.io) → **Settings** → **API Keys**
2. Create a key (format `mk_live_...`)

### 2. Credential in n8n

1. Create credential **Memara API**
2. Paste **API Key**
3. Optionally override **Base URL** (default `https://api.memara.io`)
4. Test the connection

### 3. Add nodes to a workflow

1. **Add node** and search for **Memara**
2. Choose an **action** node (**Memara Create Memory**, **Memara Search Memories**, etc.) or a **trigger** (**Memara Trigger: New Memory**, etc.)
3. Attach the same **Memara API** credential to each node

## Migrating from v1.x

v1 shipped a single node with internal type `memara` and parameters `resource`, `operation`, and operation-specific fields.

**v2 removes that node.** Workflows break until you replace each old node with the matching v2 node:

| v1 `operation` | v2 node | Internal type (`type` in JSON) |
|----------------|---------|--------------------------------|
| Create | Memara Create Memory | `memaraCreateMemory` |
| Search | Memara Search Memories | `memaraSearchMemories` |
| Update | Memara Update Memory | `memaraUpdateMemory` |
| Delete | Memara Delete Memory | `memaraDeleteMemory` |
| List | Memara List Memories | `memaraListMemories` |

Triggers (2.1+):

| Trigger | Internal type (`type` in JSON) |
|---------|----------------------------------|
| New Memory | `memaraTriggerNewMemory` |
| Memory Updated | `memaraTriggerMemoryUpdated` |
| Search Match | `memaraTriggerSearchMatch` |

Remove `resource` and `operation` from parameters; keep only the fields that node needs (same names as before: `content`, `title`, `tags`, `memoryId`, `query`, `limit`, `offset`).

**Search / List output:** Each run still produces **one item** whose `json` is the **array of memories** (same shape as v1’s search/list output for typical workflows).

## Usage examples (parameters)

### Create (Memara Create Memory)

```json
{
  "content": "Customer reported billing issue #12345. Resolved with 10% credit.",
  "title": "Customer issue resolution",
  "tags": "customer-service, billing"
}
```

### Search (Memara Search Memories)

```json
{
  "query": "billing problems with customers",
  "limit": 5
}
```

### Update (Memara Update Memory)

```json
{
  "memoryId": "mem_...",
  "content": "Updated content",
  "title": "Optional title",
  "tags": "tag1, tag2"
}
```

### Delete (Memara Delete Memory)

```json
{
  "memoryId": "mem_..."
}
```

### List (Memara List Memories)

```json
{
  "limit": 50,
  "offset": 0
}
```

## Common workflow patterns

1. **Support KB:** Webhook → **Memara Search Memories** → branch on results → **Memara Create Memory** for new resolutions.
2. **Content assist:** Schedule or external trigger → **Memara Search Memories** → Code / LLM → **Memara Create Memory**.
3. **React to new memories:** **Memara Trigger: New Memory** → notify Slack / CRM / internal API (each item is one memory payload plus `_memaraTrigger`).

Example workflow JSON: [`workflows/customer-support-example.json`](workflows/customer-support-example.json). **Polling trigger starter:** [`workflows/new-memory-trigger-example.json`](workflows/new-memory-trigger-example.json).

## Parameters reference

| Node | Required | Optional |
|------|----------|----------|
| Create Memory | `content` | `title`, `tags` |
| Search Memories | `query` | `limit` (default 10); emits **one output item per memory** |
| Update Memory | `memoryId`, `content` | `title`, `tags` |
| Delete Memory | `memoryId` | — |
| List Memories | — | `limit` (default 50), `offset` (default 0); emits **one output item per memory** |
| Trigger: New Memory | — | `limit`, `tags`, `source`, `minImportance` |
| Trigger: Memory Updated | — | `limit`, `tags`, `source`, `minImportance` |
| Trigger: Search Match | `query` | `limit`, `workflowId`, `filtersJson` |

## Troubleshooting

- **Invalid API key:** Confirm key in Memara dashboard; default API URL is `https://api.memara.io`.
- **Node not listed:** Reinstall the package, restart n8n, check `npm list n8n-nodes-memara`.

**Docs:** [memara.io/docs/integrations/n8n](https://memara.io/docs/integrations/n8n) · **Support:** [support@memara.io](mailto:support@memara.io)

## Development

### Local (no Docker)

```bash
git clone https://github.com/memara-memory/n8n-nodes-memara.git
cd n8n-nodes-memara
npm install
npm run build
npm run verify:pack
npm run lint
```

### Docker (recommended parity with CI / publish)

Uses [`docker-compose.n8n.yml`](docker-compose.n8n.yml) and [`scripts/docker-n8n.sh`](scripts/docker-n8n.sh). From **`packages/memara-n8n-node`**:

| Goal | Command |
|------|---------|
| Start n8n + dev container | `./scripts/docker-n8n.sh dev` or `npm run docker:dev` |
| Build inside container | `./scripts/docker-n8n.sh build` or `npm run docker:build` |
| Lint | `./scripts/docker-n8n.sh lint` or `npm run docker:lint` |
| Lint with autofix | `./scripts/docker-n8n.sh lintfix` or `npm run docker:lintfix` |
| Prettier | `./scripts/docker-n8n.sh format` or `npm run docker:format` |
| CI gate (build + verify tarball + lint) | `./scripts/docker-n8n.sh ci` or `npm run docker:ci` |
| npm pack tarball | `./scripts/docker-n8n.sh pack` or `npm run docker:pack` |
| Publish to npm | `./scripts/docker-n8n.sh publish` (see below) |
| Verify GitHub PAT | `./scripts/docker-n8n.sh github-verify-pat` or `npm run docker:github-verify-pat` |
| Mirror package to public GitHub `main` | `./scripts/docker-n8n.sh github-sync` or `npm run docker:github-sync` |
| Push release tag `v*` to public GitHub | `./scripts/docker-n8n.sh github-tag` or `npm run docker:github-tag` |

After a local build, **`npm run verify:pack`** runs `npm pack` and checks the archive for unexpected paths (for example stray third-party `dist` artifacts). The same step runs inside **`docker-n8n.sh ci`** before lint.

**n8n community verification scanner** (queries the **public npm** package `n8n-nodes-memara`—useful after you publish a version):

```bash
npm run docker:scan-npm
# or locally: npm run scan:npm
```

### Team: mirror to GitHub from the monorepo (same idea as Memara Python SDK)

Maintainers can sync this directory to **[memara-memory/n8n-nodes-memara](https://github.com/memara-memory/n8n-nodes-memara)** using Docker: git runs **inside** `memara-n8n-dev` in an ephemeral **`/tmp`** clone, populated with **`tar`** from **`/app`** (the bind-mounted package). You do **not** need a nested `.git` under `packages/memara-n8n-node`, and you do **not** need the memara monorepo git root to equal this folder.

1. Put a **fine-grained PAT** (Contents read/write on that repo; for releases also **Releases** write when using `publish-release`) in **`packages/memara-n8n-node/.env.github`** (single line).
2. From **`packages/memara-n8n-node`**:

```bash
./scripts/docker-n8n.sh github-verify-pat
./scripts/docker-n8n.sh github-sync
# non-interactive:
./scripts/docker-n8n.sh github-sync --yes
# after sync, push annotated tag v<version> from package.json:
./scripts/docker-n8n.sh github-tag --yes
```

`github-sync` excludes build secrets and artifacts (`.env*`, `dist`, `node_modules`, etc.); the public repo receives **sources** so GitHub Actions or local builds can produce `dist`.

### One-shot: CI, GitHub mirror, npm, and GitHub Release

From **`packages/memara-n8n-node`** (including inside the **memara** monorepo): bump and **commit** `package.json` version, then:

1. **`packages/memara-n8n-node/.env.github`** — GitHub PAT as above (needs **Releases** permission for the API step in `publish-release`).
2. **`packages/memara-n8n-node/.env.npm`** — npm token (same as publish below).

```bash
./scripts/docker-n8n.sh publish-release
# or: npm run docker:publish-release
# or: ./scripts/release-publish.sh --yes
./scripts/docker-n8n.sh publish-release --yes
```

This runs **Docker CI** (`build` → `verify:pack` → `lint`), **`github-sync`** (mirror to public `main`), **`github-tag`**, **`publish`** to npm, then creates a **GitHub Release** on the host via the REST API (PAT never printed).

If this package lives inside a parent git repo, **uncommitted changes under `packages/memara-n8n-node`** must be clean before `publish-release` runs (paths are scoped to that directory).

### Publish to npm via Docker

Publishing is **manual** (nothing is published from CI in this repo unless you run it). Bump **`package.json` version**, then:

1. Put your npm access token in **`packages/memara-n8n-node/.env.npm`** (single line, no variable name). The file is gitignored.
2. From **`packages/memara-n8n-node`**:

```bash
./scripts/docker-n8n.sh publish
# or: npm run docker:publish
# non-interactive:
./scripts/docker-n8n.sh publish --yes
```

The script starts **`memara-n8n-dev`** if needed, runs `npm run build` in the container, then publishes using a temporary npm userconfig so your token is not written to the repo’s `package.json` or a persistent `.npmrc`.

### GitHub Actions and npm provenance (n8n verified nodes)

For **n8n Cloud verified** community nodes, npm expects **provenance** from **GitHub Actions** (see [Submit your node for verification](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/#submit-your-node-for-verification-by-n8n)). This package includes [`.github/workflows/publish-npm.yml`](.github/workflows/publish-npm.yml), which publishes with `npm publish --access public --provenance` when you publish a **GitHub Release** (or run the workflow manually).

1. In the npm package settings, connect a **Trusted Publisher** to **`memara-memory/n8n-nodes-memara`** (or your fork) and this workflow, so OIDC can authenticate publishes where possible.
2. Add repository secret **`NPM_TOKEN`** with a granular **Automation** token that can publish `n8n-nodes-memara` (required until Trusted Publisher fully replaces token auth for your account).
3. Keep **GitHub `package.json` version and git tags** aligned with each npm release so reviewers can verify source.

**If publish fails with `403` / two-factor authentication:** npm requires either an interactive publish with OTP, or a **granular access token** that includes **Publish** for `n8n-nodes-memara` and the **“Bypass two-factor authentication”** option (or equivalent automation permission). Classic tokens alone are often blocked when 2FA is enabled on the account.

## License

MIT — see [LICENSE.md](LICENSE.md).

---

Made with care by the [Memara](https://memara.io) team.
