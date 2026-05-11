# API Documentation

## Configuration

API base URL is read from:

```json
{
  "api": {
    "baseUrl": "/api/v1/Sentiment/"
  },
  "sdk": {
    "tmacServer": "http://devlinux.tetherfi.cloud:5000"
  }
}
```

The frontend normalizes `api.baseUrl` by removing a trailing `/v1/sentiment` when present.

Backend Swagger reference supplied for the project:

```text
http://devlinux.tetherfi.cloud:5001/swagger/index.html
```

## Sentiment Session APIs

Base path:

```text
{apiBaseUrl}/v1/sentiment
```

| Purpose | Method | Path | Payload |
| --- | --- | --- | --- |
| Load ongoing sessions | POST | `/sessions/ongoing` | `{ "teamId": "string|null" }` |
| Search live sessions | POST | `/live-search` | `{ "sessionId": "string|null", "agentId": "string|null", "teamId": "string|null" }` |
| Load session details | POST | `/sessions/{sessionId}` | `{}` |
| Load session alerts | POST | `/sessions/{sessionId}/alerts` | `{}` |
| Load session timeline | POST | `/sessions/{sessionId}/timeline` | `{}` |
| Query annotations | POST | `/sessions/{sessionId}/annotations/query` | `{}` |
| Add annotation | POST | `/sessions/{sessionId}/annotations` | `{ "supervisorId": "string", "annotationType": "thumbs_up|thumbs_down", "comment": "string" }` |
| Suppress alerts | POST | `/sessions/{sessionId}/suppress-alerts` | `{ "supervisorId": "string", "reason": "string" }` |
| Unsuppress alerts | POST | `/sessions/{sessionId}/unsuppress-alerts` | `{ "supervisorId": "string" }` |

## Word Intelligence APIs

Base paths:

```text
{apiBaseUrl}/v1/WordCloud
{apiBaseUrl}/v1/Words
{apiBaseUrl}/v1/Sessions
```

### WordCloud

| Purpose | Method | Path | Payload |
| --- | --- | --- | --- |
| Get bucket list | POST | `/v1/WordCloud/get-bucketlist` | `{}` |
| Trigger processor | POST | `/v1/WordCloud/trigger-processor` | `{}` |
| Get word cloud data | POST | `/v1/WordCloud/get-data` | `{ "source": "string|null", "filter": "string|null" }` |
| Get filtered word data | POST | `/v1/WordCloud/get-filtered-data` | Transcript filter payload |

### Sessions

| Purpose | Method | Path | Payload |
| --- | --- | --- | --- |
| Get sessions | POST | `/v1/Sessions` | Transcript filter payload |
| Get transcript timeline | POST | `/v1/sentiment/sessions/{sessionId}/timeline` | `{}` |

Transcript filter payload:

```json
{
  "source": "customer",
  "department": "Cards",
  "direction": "Inbound",
  "agentId": "agent001",
  "teamId": 100,
  "channel": "voice",
  "skill": "Support",
  "intent": "Complaint",
  "word": "refund",
  "fromDateTime": "2026-05-08T00:00:00.000Z",
  "toDateTime": "2026-05-08T23:59:59.000Z"
}
```

### Words

| Purpose | Method | Path | Payload |
| --- | --- | --- | --- |
| Get words | POST | `/v1/Words/get-words` | `{}` |
| Get word groups | POST | `/v1/Words/get-word-groups` | `{}` |
| Add word | POST | `/v1/Words/add-word` | `{ "word": "refund", "group": "Service/Refund", "source": "customer" }` |
| Update word group | POST | `/v1/Words/update-word-group` | `{ "word": "refund", "group": "Service/Refund", "source": "customer" }` |
| Update word source | POST | `/v1/Words/update-word-soure` | `{ "word": "refund", "group": "Service/Refund", "source": "agent" }` |
| Delete word | POST | `/v1/Words/delete-word` | `{ "word": "refund", "source": "customer" }` |
| Get exclusion words | POST | `/v1/Words/get-exclusion-words` | `{}` |
| Add exclusion word | POST | `/v1/Words/add-exclusion-word` | `{ "word": "the" }` |
| Delete exclusion word | POST | `/v1/Words/delete-exclusion-word` | `{ "word": "the" }` |

## Agent Desktop SDK Invoke Messages

SDK calls are sent to the Agent Desktop parent window:

```json
{
  "function": "invokesdk",
  "name": "iframe-window-name",
  "callback": "getTMACVersionDone",
  "data": {
    "method": "getTMACVersion",
    "params": ["http://devlinux.tetherfi.cloud:5000"]
  },
  "destination": "tmac",
  "source": "sentidashboard",
  "userObject": null
}
```

Supported SDK calls:

| Purpose | SDK Method | Callback |
| --- | --- | --- |
| Get TMAC version | `getTMACVersion` | `getTMACVersionDone` |
| Get staffed agent list | `GetAgentListStaffed` | `GetAgentListStaffedDone` |
| Voice silent/whisper/barge-in | `voiceBargeinNonFAC` | `voiceBargeinNonFACDone` |
| Chat transfer/barge-in | `transferTextChat` | `transferTextChatDone` |

