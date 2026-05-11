# Business Requirements Document

## Product Name

Deep Sentiment Analysis Supervisor Dashboard

## Business Objective

The application enables supervisors to monitor live customer interactions, identify negative or critical sentiment, review conversation context, and take timely action through Agent Desktop capabilities. It also provides Word Intelligence analytics to understand recurring topics, customer intents, and phrase-level patterns across interactions.

## Business Goals

- Improve supervisor visibility into active customer conversations.
- Reduce response time for high-risk or dissatisfied customer interactions.
- Enable supervisors to intervene using silent monitor, whisper, or barge-in actions.
- Support quality review through session annotations and transcript inspection.
- Provide keyword and intent analytics for operational insight.
- Allow deployment configuration without rebuilding the Angular application.

## Stakeholders

| Stakeholder | Interest |
| --- | --- |
| Contact Center Supervisors | Monitor agents, detect risk, intervene in live sessions |
| Quality Analysts | Review sessions, annotate outcomes, analyze patterns |
| Operations Managers | Track sentiment trends, team performance, and issue categories |
| System Administrators | Configure API base URLs, TMAC SDK server, thresholds, and feature flags |
| Backend/API Team | Provide sentiment, session, word cloud, and transcript APIs |
| Agent Desktop Team | Support iframe-hosted custom widget SDK invocation |

## Scope

In scope:

- Supervisor sentiment dashboard.
- Live session list, filtering, sorting, and search.
- Sentiment status classification using configured thresholds.
- Session detail view with transcript timeline, alerts, annotations, and review actions.
- Agent Desktop SDK integration for monitoring actions.
- Word Intelligence dashboard with keyword, intent, source, date, team, and skill filters.
- Runtime app configuration through JSON.

Out of scope:

- Backend sentiment engine implementation.
- Agent Desktop SDK internals.
- Authentication provider implementation.
- Long-term data warehouse design.
- Native mobile application.

## Key Business Capabilities

| Capability | Description |
| --- | --- |
| Real-time monitoring | Supervisors can view ongoing sessions and refresh automatically. |
| Risk prioritization | Sessions are grouped by good, neutral, bad, and critical sentiment. |
| Agent intervention | Supervisors can launch silent monitor, whisper, or barge-in actions. |
| Review workflow | Supervisors can add thumbs-up or thumbs-down annotations with comments. |
| Transcript analysis | Supervisors can inspect session timelines and transcript content. |
| Word Intelligence | Business teams can detect frequently occurring words and intents. |
| Configurable operation | API URL, refresh interval, TMAC server, and UI sections are configurable. |

## Success Metrics

- Supervisors can identify critical sentiment sessions within one dashboard refresh cycle.
- Monitor actions can be triggered without leaving the application iframe.
- Session transcript and alert details are available from the selected session view.
- Word Intelligence filters return relevant sessions for selected keywords.
- Configuration changes can be applied without rebuilding the frontend.

## Assumptions

- The application is hosted as an Angular web application and may be embedded in Agent Desktop as a custom widget iframe.
- Sentiment, session, word cloud, and word management APIs are provided by backend services.
- Agent Desktop parent window accepts `postMessage` calls using the established custom widget contract.
- The logged-in supervisor identity is supplied through query parameters, backend context, or Agent Desktop integration.

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Agent Desktop callback format changes | SDK actions may fail | Keep callback names explicit and document message contracts. |
| Backend API latency | Dashboard may show stale data | Use refresh intervals, loading states, and timeout/retry policy. |
| Incorrect sentiment thresholds | Risk classification may be misleading | Store thresholds in config and validate values during deployment. |
| Iframe origin not restricted | Possible message spoofing | Restrict allowed origins for production deployments. |

