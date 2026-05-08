# MenheraBot

Monorepo for `menherabot.hcdev.shop` and (future) related apps.

## Structure

```
.
├── apps/
│   ├── web/                      # Next.js 15 (app router, standalone output)
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── globals.css
│   │   │   └── api/healthz/route.ts
│   │   ├── next.config.mjs
│   │   ├── package.json
│   │   └── Dockerfile            # multi-stage node:20-alpine
│   └── api/                      # Go 1.25 + pgx (postgres)
│       ├── main.go               # /healthz, /api/hello, /api/db-ping
│       ├── go.mod
│       └── Dockerfile            # multi-stage golang → distroless/static
├── charts/
│   └── menherabot/               # Helm chart (single values.yaml as source of truth)
│       ├── Chart.yaml
│       ├── values.yaml           # CI bumps web/api image tags here
│       └── templates/            # web + api + postgres + ingress
├── deploy/
│   └── argocd/
│       └── application.yaml      # ArgoCD Application manifest
├── scripts/
│   └── check-branch-name.sh      # pre-commit branch name validator
└── .github/
    └── workflows/
        ├── ci-web.yml            # apps/web → ghcr → bot PR → values.yaml bump
        └── ci-api.yml            # apps/api → ghcr → bot PR → values.yaml bump
```

## Service Topology

| Service  | Image                                | Container | Service | Routed via             |
| -------- | ------------------------------------ | --------- | ------- | ---------------------- |
| web      | ghcr.io/hongchal/menherabot-web      | :3000     | :80     | ingress `/`            |
| api      | ghcr.io/hongchal/menherabot-api      | :8080     | :80     | ingress `/api`         |
| postgres | postgres:16-alpine                   | :5432     | :5432   | in-cluster only        |

The Go API reads `POSTGRES_HOST/PORT` from `values.yaml` env and `POSTGRES_USER/PASSWORD/DB` from the `menherabot-postgres-auth` Secret (mounted via `envFrom`). It also accepts a fully-formed `DATABASE_URL` if provided.

## Deployment Architecture (GitOps, Pattern: bot auto-PR)

```
human PR (feature/issue-N) ──► merge to main
                                   │
                                   ▼
                  GitHub Actions (ci-web.yml on push:main)
                  ├─ docker build apps/web
                  ├─ push ghcr.io/hongchal/menherabot-web:sha-XXXXXXX
                  ├─ helm lint + helm template (validation)
                  ├─ yq edit charts/menherabot/values.yaml
                  └─ open bot PR + gh pr merge --auto --squash
                                   │
                                   ▼
                       bot PR auto-merges into main
                                   │
                                   ▼
                  ArgoCD watches charts/menherabot (auto-sync)
                                   │
                                   ▼
                       helm template + apply → k3s `menherabot` ns
                                   │
                                   ▼
                         https://menherabot.hcdev.shop
```

## Branch Protection (Ruleset: `protect-main`)

- **Direct push to main**: blocked (including the repo owner)
- **Force push / branch deletion**: blocked
- **PR required**: yes
- **Required approvals**: 0 (self-merge allowed; will tighten later)
- **CI bot**: follows the same PR flow with `gh pr merge --auto`

> The bot opens a PR for every image bump and auto-merges it. PR titles include `[skip ci]` so the squash commit on `main` does not retrigger ci-web (preventing infinite loops).

## Local Development

### Pre-commit hooks

Run once after cloning:

```bash
pip install --user --break-system-packages pre-commit   # if not installed
~/.local/bin/pre-commit install                         # registers .git/hooks/pre-commit
```

Hooks installed (`.pre-commit-config.yaml`):

| Check | Purpose |
|---|---|
| trailing-whitespace, end-of-file-fixer, mixed-line-ending | file hygiene |
| check-merge-conflict, check-added-large-files (500KB) | safety |
| check-yaml, check-json | syntax |
| yamllint | YAML style (`.yamllint.yaml`) |
| actionlint | GitHub Actions workflow validation |
| hadolint | Dockerfile lint |
| **branch-name** | **branch must match `<type>/issue-N[-desc]`** |
| helm-lint, helm-template | chart validation when `charts/**` changes |

### Branch naming convention

```
<type>/issue-<num>[-short-desc]
```

Allowed types: `feature`, `bugfix`, `hotfix`, `chore`, `docs`, `refactor`, `test`, `ci`

Examples: `feature/issue-1`, `feature/issue-12-add-auth`, `bugfix/issue-42-fix-login`.

`main` and `develop` are exempt (so rebases / merges don't break commits).

### Render & build

```bash
# Render chart locally
helm template menherabot ./charts/menherabot

# Web (Next.js)
cd apps/web && npm install && npm run dev          # http://localhost:3000
docker build -t menherabot-web:dev apps/web
docker run -p 3000:3000 menherabot-web:dev

# API (Go)
cd apps/api && go run .                            # http://localhost:8080
docker build -t menherabot-api:dev apps/api
docker run -p 8080:8080 menherabot-api:dev
```

### Smoke checks

```bash
curl -fsS http://localhost:3000/healthz   # web
curl -fsS http://localhost:8080/healthz   # api
curl -fsS http://localhost:8080/api/hello
curl -fsS http://localhost:8080/api/db-ping   # requires postgres reachable
```

## Database (Postgres)

A simple in-cluster Postgres 16 (alpine) is provisioned by the chart for app-side data.

| Aspect | Value |
|---|---|
| Workload | StatefulSet (1 replica) |
| Storage | 1Gi PVC via cluster default StorageClass (k3s = `local-path`) |
| Service | `menherabot-postgres.menherabot.svc.cluster.local:5432` (ClusterIP, in-cluster only) |
| Credentials | Kubernetes Secret `menherabot-postgres-auth` (POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB) |
| Default user / db | `menherabot` / `menherabot` |
| Default password | `change-me-in-prod` (rotate before any real use) |

### Connect from inside the cluster

```bash
# From any pod in `menherabot` namespace
psql postgres://menherabot:change-me-in-prod@menherabot-postgres:5432/menherabot
```

### Connect from your laptop (port-forward)

```bash
kubectl -n menherabot port-forward svc/menherabot-postgres 5432:5432
psql postgres://menherabot:change-me-in-prod@localhost:5432/menherabot
```

### Rotating the password

```bash
kubectl -n menherabot patch secret menherabot-postgres-auth \
  --type=merge -p '{"stringData":{"POSTGRES_PASSWORD":"<new-password>"}}'
kubectl -n menherabot rollout restart statefulset/menherabot-postgres
```

> Postgres reads `POSTGRES_PASSWORD` only on first init. After init, the password lives inside the database. Changing the Secret alone is not enough — also `ALTER USER menherabot PASSWORD '...';` inside Postgres, or wipe the PVC for a fresh init.

### Disable / scale

`postgres.enabled: false` in `values.yaml` removes the StatefulSet, Service, and Secret on the next ArgoCD sync. The PVC is left behind on purpose (data safety) — delete manually with `kubectl delete pvc data-menherabot-postgres-0` if intentional.

## Versioning

- **Image tag**: `sha-XXXXXXX` (auto via CI) — production
- **Image tag**: `main` (auto) — latest from main, dev only
- **Chart version**: `Chart.yaml:version` field — bump on chart structure changes
- **Releases**: optional `git tag v1.2.3` for milestones

## URLs

- Web: https://menherabot.hcdev.shop
- (future) API: https://menherabot.hcdev.shop/api
- ArgoCD UI: TBD
