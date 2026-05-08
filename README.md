# MenheraBot

Monorepo for `menherabot.hcdev.shop` and (future) related apps.

## Structure

```
.
├── apps/
│   └── web/                      # frontend (nginx + static)
│       ├── public/
│       ├── nginx.conf
│       └── Dockerfile
├── charts/
│   └── menherabot/               # Helm chart (single values.yaml as source of truth)
│       ├── Chart.yaml
│       ├── values.yaml           # CI bumps image tags here directly
│       └── templates/            # web + (future) api + postgres
├── deploy/
│   └── argocd/
│       └── application.yaml      # ArgoCD Application manifest
├── scripts/
│   └── check-branch-name.sh      # pre-commit branch name validator
├── _legacy/                      # raw k8s manifests (reference only)
└── .github/
    └── workflows/
        ├── ci-web.yml            # build & push web image, PR-based manifest bump
        └── ci-api.yml            # placeholder, disabled until apps/api/ exists
```

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

# Build image locally
docker build -t menherabot-web:dev apps/web

# Run image
docker run -p 8080:80 menherabot-web:dev
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
