# Deployment Document

## Build Prerequisites

- Node.js compatible with Angular 17.
- npm dependencies installed with `npm install`.
- Environment-specific `config.json` prepared.

## Build Command

Development verification build:

```powershell
npm run build -- --configuration development --output-path tmp-build
```

Production build:

```powershell
npm run build
```

## Static Hosting

The Angular build output can be hosted on:

- IIS
- Nginx
- Apache
- Static object storage with CDN
- Agent Desktop custom widget hosting path

The server must route SPA paths back to `index.html`.

## Runtime Configuration

Deploy environment-specific configuration to:

```text
assets/config/app/config.json
```

Important environment values:

```json
{
  "api": {
    "baseUrl": "https://api.example.com"
  },
  "sdk": {
    "tmacServer": "https://tmac.example.com"
  },
  "dashboard": {
    "refreshInterval": 5000,
    "useDummy": false
  },
  "wordCloud": {
    "refreshInterval": 50000,
    "useDummy": false
  }
}
```

## Deployment Steps

1. Confirm backend API and Agent Desktop SDK endpoints.
2. Update `assets/config/app/config.json` for the target environment.
3. Run the Angular build.
4. Publish the build output to the web server.
5. Configure SPA fallback routing to `index.html`.
6. Validate `/dashboard`, `/word-intelligence`, and `/config`.
7. Validate iframe launch from Agent Desktop.
8. Validate SDK callbacks for TMAC version and monitor actions.

## Health Checks

Frontend checks:

- `index.html` loads.
- `assets/config/app/config.json` loads.
- `/dashboard` route loads.
- `/word-intelligence` route loads.

Integration checks:

- Sentiment session API returns data.
- WordCloud API returns bucket/word data.
- Agent Desktop parent receives `invokesdk`.
- SDK callback is received by iframe.

## Rollback Plan

1. Retain the previous build artifact.
2. Retain the previous `config.json`.
3. If deployment fails, restore previous static files.
4. Clear CDN or server cache if applicable.
5. Re-test dashboard and iframe integration.

## Operational Notes

- Configuration changes do not require rebuilding if only `config.json` changes.
- Browser local storage overrides can affect testing. Clear local storage before production validation if needed.
- Production logging should avoid transcript and customer data.

