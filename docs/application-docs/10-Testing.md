# Testing Document

## Test Strategy

Testing should cover:

- Angular component behavior.
- Service API integration.
- Runtime configuration loading.
- Agent Desktop iframe SDK bridge behavior.
- Dashboard and Word Intelligence user workflows.
- Deployment smoke tests.

## Unit Test Scope

| Area | Test Examples |
| --- | --- |
| `AppConfigService` | Loads default config, merges file config, applies local override |
| `SentimentSessionService` | Builds correct sentiment API URLs, selects live-search vs ongoing sessions |
| `WordIntelligenceService` | Builds WordCloud/Words/Sessions URLs, applies mock data filters |
| `AgentDesktopBridgeService` | Sends correct postMessage shape, resolves predefined callbacks |
| `DashboardComponent` | Applies sentiment thresholds, disables monitor actions when IDs are missing |
| `WordIntelligenceComponent` | Applies filters, selects keywords, expands transcripts |

## Integration Test Scope

| Scenario | Expected Result |
| --- | --- |
| Dashboard loads active sessions | Session list and metrics render correctly |
| Session selected | Details, timeline, alerts, and annotations load |
| Annotation submitted | Backend receives annotation payload and UI refreshes annotation count |
| Silent monitor clicked | `invokesdk` message is sent with `voiceBargeinNonFAC` and configured `tmacServer` |
| TMAC version requested | Callback `getTMACVersionDone` updates footer/version state |
| Word Intelligence loads | Word groups, words, and filtered counts render |
| Keyword selected | Matching sessions and transcript lines are shown |
| Processor triggered | API is called and dashboard refreshes |

## End-to-End Test Scope

Recommended browser workflows:

1. Open `/dashboard`.
2. Confirm config loads.
3. Confirm sessions load.
4. Select a critical or bad sentiment session.
5. Open transcript/timeline details.
6. Submit a review annotation.
7. Trigger a monitor action inside Agent Desktop iframe.
8. Open `/word-intelligence`.
9. Filter by source/date/skill.
10. Select a keyword and expand a transcript.

## Agent Desktop SDK Test Cases

| ID | Test | Expected |
| --- | --- | --- |
| SDK-001 | Call `getTMACVersion` | Parent receives `invokesdk`; iframe receives `getTMACVersionDone` |
| SDK-002 | Voice silent monitor | `voiceBargeinNonFAC` is called with `active: "silent"` |
| SDK-003 | Voice whisper | `voiceBargeinNonFAC` is called with `active: "whisper"` |
| SDK-004 | Voice barge-in | `voiceBargeinNonFAC` is called with `active: "barge-in"` |
| SDK-005 | Missing identifiers | Monitor buttons remain disabled or show clear error |

## API Test Cases

| ID | Test | Expected |
| --- | --- | --- |
| API-001 | `/v1/sentiment/sessions/ongoing` returns sessions | Dashboard transforms and displays sessions |
| API-002 | `/v1/sentiment/live-search` with agent ID | Filtered live sessions are returned |
| API-003 | `/v1/sentiment/sessions/{id}/timeline` | Transcript/timeline renders in correct order |
| API-004 | `/v1/WordCloud/get-filtered-data` | Keyword counts reflect filters |
| API-005 | `/v1/Sessions` with word filter | Matching sessions are returned |
| API-006 | `/v1/Words/add-word` | Word is added and list refreshes |

## Smoke Test Checklist

- Application loads without console errors.
- Configuration file loads.
- Dashboard route loads.
- Word Intelligence route loads.
- Backend APIs are reachable.
- Agent Desktop iframe integration can send and receive messages.
- Production build completes.

## Known Test Data Options

- Enable `dashboard.useDummy` for dashboard mock data.
- Enable `wordCloud.useDummy` for Word Intelligence mock data.
- Use `src/assets/config/app/dummydata.json` for local demo/test sessions and words.

