# Architecture Document

## Overview

The application is an Angular single-page application that consumes backend REST APIs and integrates with Agent Desktop when hosted inside a custom widget iframe.

The frontend is responsible for:

- Loading runtime configuration.
- Fetching sentiment session and word intelligence data.
- Rendering dashboards and detail views.
- Sending SDK invocation requests to Agent Desktop through iframe `postMessage`.
- Receiving predefined SDK callbacks through browser message events.

## High-Level Architecture

```text
Supervisor Browser
  |
  | Angular SPA
  |  - Dashboard Module
  |  - Word Intelligence Module
  |  - Config Module
  |
  +--> Backend REST APIs
  |     - Sentiment
  |     - Sessions
  |     - WordCloud
  |     - Words
  |
  +--> Agent Desktop Parent Window
        - Custom widget bridge
        - TMAC SDK client
        - Voice/chat monitor actions
```

## Main Angular Components

| Component/Service | Responsibility |
| --- | --- |
| `DashboardComponent` | Supervisor sentiment dashboard, session selection, monitoring actions, annotations |
| `WordIntelligenceComponent` | Word/intent analytics, transcript search, keyword-session drilldown |
| `ConfigSettingsComponent` | Runtime configuration management |
| `SentimentSessionService` | Sentiment session REST API wrapper |
| `WordIntelligenceService` | Word cloud, word management, and transcript REST API wrapper |
| `AgentDesktopBridgeService` | Parent iframe bridge and SDK invocation helper |
| `AppConfigService` | Loads and merges runtime config |

## Runtime Configuration

Configuration is loaded in this order:

1. `/assets/config/app/config.json`
2. `/config.json`
3. Built-in defaults
4. Browser local storage override, if present

Important configuration values:

| Key | Purpose |
| --- | --- |
| `api.baseUrl` | Backend API base URL |
| `sdk.tmacServer` | TMAC server value passed to SDK invoke APIs |
| `sentiment.thresholds.bad` | Score threshold for bad sentiment |
| `sentiment.thresholds.critical` | Score threshold for critical sentiment |
| `dashboard.refreshInterval` | Dashboard auto-refresh interval |
| `wordCloud.refreshInterval` | Word Intelligence auto-refresh interval |
| `dashboard.useDummy` | Enables dashboard mock data |
| `wordCloud.useDummy` | Enables Word Intelligence mock data |

## Data Flow

Dashboard flow:

```text
DashboardComponent
  -> AppConfigService.getConfig()
  -> SentimentSessionService.loadSessions()
  -> Backend /v1/sentiment/sessions/ongoing or /v1/sentiment/live-search
  -> UI metrics and session list
```

Session detail flow:

```text
User selects session
  -> load session details, alerts, timeline, annotations
  -> render detail panel
```

Monitor action flow:

```text
User clicks silent/whisper/barge-in
  -> DashboardComponent.launchSessionMonitor()
  -> AgentDesktopBridgeService.performVoiceBargeIn() or performChatBargeIn()
  -> parent.postMessage({ function: "invokesdk", data: { method, params }})
  -> Agent Desktop invokes SDKClient
  -> callback message returns to iframe
```

Word Intelligence flow:

```text
WordIntelligenceComponent
  -> WordIntelligenceService.getWords()/getWordGroups()
  -> WordIntelligenceService.getFilteredWordCloudData()
  -> User selects keyword
  -> WordIntelligenceService.getSessions()
  -> WordIntelligenceService.getSessionTranscripts()
```

## Integration Boundaries

| Boundary | Protocol |
| --- | --- |
| Angular to backend | HTTPS REST/JSON |
| Angular iframe to Agent Desktop | Browser `postMessage` |
| Agent Desktop to TMAC SDK | Agent Desktop SDK client |
| Runtime configuration | Static JSON file |

## Current Architecture Notes

- The Angular app does not directly open a WebSocket connection.
- Live updates are obtained through configured refresh intervals and backend APIs.
- Agent Desktop may use its own realtime channels internally, but this is outside the Angular app boundary.
- SDK invocation uses predefined callback names such as `getTMACVersionDone`.

