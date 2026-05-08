# MenheraBot · Syside

Monorepo for `menherabot.hcdev.shop` and (future) related apps.

## Structure

```
.
├── apps/
│   └── web/                # frontend (nginx + static)
│       ├── public/
│       │   └── index.html
│       ├── nginx.conf
│       └── Dockerfile
├── charts/
│   └── menherabot/             # Helm chart
│       ├── Chart.yaml
│       ├── values.yaml
│       ├── values-prod.yaml
│       └── templates/
├── deploy/
│   └── argocd/
│       └── application.yaml
└── .github/workflows/
    ├── ci-web.yml          # build & push web image, bump manifest
    └── ci-api.yml          # placeholder, disabled until apps/api/ exists
```

## Deployment Architecture

```
push main
   ↓
GitHub Actions (ci-web.yml)
   ├─ build apps/web → ghcr.io/hongchal/menherabot-web:sha-XXXXXXX
   └─ yq edit charts/menherabot/values-prod.yaml + git push
   ↓
ArgoCD watches charts/menherabot (auto-sync)
   ↓
helm template + apply → k3s menherabot namespace
```

## Local Development

```bash
# Render chart locally to verify
helm template menherabot ./charts/menherabot \
  -f charts/menherabot/values.yaml \
  -f charts/menherabot/values-prod.yaml

# Build image locally
docker build -t menherabot-web:dev apps/web

# Run image
docker run -p 8080:80 menherabot-web:dev
```

## Versioning

- **Image tag**: `sha-XXXXXXX` (auto via CI) — production
- **Image tag**: `main` (auto) — latest from main, dev only
- **Chart version**: `Chart.yaml` `version` field — bump on chart structure changes
- **Releases**: optional `git tag v1.2.3` for milestones

## URLs

- Web: https://menherabot.hcdev.shop
- (future) API: https://menherabot.hcdev.shop/api
- ArgoCD UI: https://argocd.hcdev.shop (TBD)
