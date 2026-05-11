# Functional Requirements Specification

## Application Modules

- Dashboard module
- Word Intelligence module
- Configuration module
- Sentiment session service
- Word intelligence service
- Agent Desktop bridge service
- Runtime configuration service

## Dashboard Requirements

| ID | Requirement |
| --- | --- |
| FR-DASH-001 | The dashboard shall load active sentiment sessions from the configured backend API. |
| FR-DASH-002 | The dashboard shall support automatic refresh using the configured refresh interval. |
| FR-DASH-003 | The dashboard shall classify sessions using configurable neutral, bad, and critical sentiment thresholds. |
| FR-DASH-004 | The dashboard shall display summary metrics for active agents, sentiment status, and risk distribution. |
| FR-DASH-005 | The dashboard shall allow filtering by supervisor team context when supplied. |
| FR-DASH-006 | The dashboard shall allow searching and sorting of visible agent/session records. |
| FR-DASH-007 | The dashboard shall display session details including sentiment trend, transcript timeline, alerts, and annotations. |
| FR-DASH-008 | The dashboard shall allow supervisors to submit positive or negative review annotations with comments. |
| FR-DASH-009 | The dashboard shall allow supervisors to suppress and unsuppress session alerts when supported by the backend. |

## Supervisor Monitor Requirements

| ID | Requirement |
| --- | --- |
| FR-MON-001 | The dashboard shall display monitor actions for sessions that contain the required agent and interaction identifiers. |
| FR-MON-002 | For voice sessions, silent monitor, whisper, and barge-in shall invoke the Agent Desktop SDK method `voiceBargeinNonFAC`. |
| FR-MON-003 | For chat sessions, monitor action shall invoke the Agent Desktop SDK method `transferTextChat` where applicable. |
| FR-MON-004 | SDK requests shall include the configured `sdk.tmacServer` value from application configuration. |
| FR-MON-005 | SDK callbacks shall use predefined callback names instead of generated random names. |
| FR-MON-006 | The UI shall show loading and error states when a monitor action is in progress or fails. |

## Agent Desktop Bridge Requirements

| ID | Requirement |
| --- | --- |
| FR-ADB-001 | The application shall communicate with Agent Desktop through `window.parent.postMessage`. |
| FR-ADB-002 | SDK invocation messages shall use `function: "invokesdk"`, `destination: "tmac"`, and source `sentidashboard`. |
| FR-ADB-003 | The application shall listen for SDK callback messages through `window.addEventListener("message", ...)`. |
| FR-ADB-004 | The application shall support `getTMACVersion` with callback `getTMACVersionDone`. |
| FR-ADB-005 | The application shall support logged-in agent detail/status retrieval through the configured SDK method. |

## Word Intelligence Requirements

| ID | Requirement |
| --- | --- |
| FR-WI-001 | The Word Intelligence dashboard shall load word groups and configured words from backend APIs. |
| FR-WI-002 | The dashboard shall display filtered word counts by source, department, direction, agent, team, skill, and date range. |
| FR-WI-003 | Users shall be able to select a keyword or intent and view matching sessions. |
| FR-WI-004 | Users shall be able to expand a session and view transcript lines. |
| FR-WI-005 | Users shall be able to search transcripts for a free-text keyword. |
| FR-WI-006 | Users shall be able to trigger the word cloud processor. |
| FR-WI-007 | The application shall support word and exclusion-word management through backend APIs. |
| FR-WI-008 | Word Intelligence shall support mock data when `wordCloud.useDummy` is enabled. |

## Configuration Requirements

| ID | Requirement |
| --- | --- |
| FR-CFG-001 | The application shall load configuration from `/assets/config/app/config.json`. |
| FR-CFG-002 | If the primary config file is unavailable, the application shall try `/config.json`. |
| FR-CFG-003 | Configuration overrides may be saved in browser local storage. |
| FR-CFG-004 | API base URL, dashboard refresh interval, word cloud refresh interval, sentiment thresholds, feature flags, and TMAC SDK server shall be configurable. |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-001 | The application shall be deployable as static Angular assets. |
| NFR-002 | Dashboard refresh should complete within the configured API timeout under normal network conditions. |
| NFR-003 | The UI shall provide clear empty, loading, success, and error states. |
| NFR-004 | Production deployments shall use HTTPS. |
| NFR-005 | Production iframe message handling shall validate allowed parent origins. |
| NFR-006 | The application shall avoid storing secrets in frontend configuration. |

