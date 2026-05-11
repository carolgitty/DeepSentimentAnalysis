# Deep Sentiment Analysis Application Documentation

This folder contains the documentation pack for the Deep Sentiment Analysis supervisor application.

The application provides:

- Real-time supervisor dashboard for customer sentiment monitoring.
- Agent/session risk classification using configurable sentiment thresholds.
- Supervisor actions such as silent monitor, whisper, and barge-in through Agent Desktop SDK invocation.
- Session transcript, alert, annotation, and review workflows.
- Word Intelligence dashboard for keyword, intent, and transcript analysis.
- Runtime configuration through `assets/config/app/config.json`.

## Document Index

| Document | Purpose |
| --- | --- |
| [01-BRD.md](./01-BRD.md) | Business requirements and scope |
| [02-FRS.md](./02-FRS.md) | Functional and non-functional requirements |
| [03-UI-UX.md](./03-UI-UX.md) | Screen, layout, and interaction specification |
| [04-Architecture.md](./04-Architecture.md) | Technical architecture and component design |
| [05-API-Docs.md](./05-API-Docs.md) | Backend REST API and Agent Desktop SDK integration |
| [06-WebSocket-Event-Flow.md](./06-WebSocket-Event-Flow.md) | Runtime event, iframe, and SDK callback flows |
| [07-Security.md](./07-Security.md) | Security controls, risks, and recommendations |
| [08-Deployment.md](./08-Deployment.md) | Build, configuration, deployment, and rollback |
| [09-Reporting-Analytics.md](./09-Reporting-Analytics.md) | Metrics, analytics, and reporting behavior |
| [10-Testing.md](./10-Testing.md) | Test strategy and sample test scenarios |

## Source References

Key implementation files:

- `src/app/pages/dashboard/dashboard.component.ts`
- `src/app/pages/word-intelligence/word-intelligence.component.ts`
- `src/app/services/sentiment-session.service.ts`
- `src/app/services/word-intelligence.service.ts`
- `src/app/services/agent-desktop-bridge.service.ts`
- `src/app/services/app-config.service.ts`
- `src/assets/config/app/config.json`

