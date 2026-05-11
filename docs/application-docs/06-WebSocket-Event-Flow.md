# WebSocket and Event Flow

## Current Realtime Model

The Angular application does not directly create a WebSocket connection.

Runtime updates are handled by:

- Backend REST polling using configured refresh intervals.
- Agent Desktop iframe `postMessage` integration for SDK invoke requests and callbacks.
- Agent Desktop internal event handling outside this Angular application.

## Dashboard Refresh Flow

```text
Timer starts after dashboard initialization
  -> if dashboard is not already loading
  -> loadMetrics()
  -> SentimentSessionService.loadSessions()
  -> update dashboard metrics and session list
```

The refresh interval is configured by:

```json
{
  "dashboard": {
    "refreshInterval": 5000
  }
}
```

## Word Intelligence Refresh Flow

```text
Timer starts after Word Intelligence initialization
  -> loadDashboard(false)
  -> get word groups and words
  -> refresh filtered word data
  -> keep selected keyword/session panel in sync
```

The refresh interval is configured by:

```json
{
  "wordCloud": {
    "refreshInterval": 50000
  }
}
```

## Iframe SDK Invocation Flow

```text
Angular iframe
  -> window.parent.postMessage()
  -> Agent Desktop custom widget handler
  -> SDKClient method invocation
  -> Agent Desktop sends callback message
  -> Angular window message listener resolves callback
```

Message shape:

```json
{
  "function": "invokesdk",
  "callback": "voiceBargeinNonFACDone",
  "data": {
    "method": "voiceBargeinNonFAC",
    "params": [
      {
        "supervisorId": "supervisor01",
        "bargeinToAgent": "agent01",
        "bargeinToInteractionid": "1002",
        "active": "silent",
        "sendCallToNumber": "",
        "tmacServer": "http://devlinux.tetherfi.cloud:5000"
      }
    ]
  },
  "destination": "tmac",
  "source": "sentidashboard"
}
```

## SDK Callback Listener

The iframe listens for callback messages using browser message events:

```text
window.addEventListener("message", handler)
```

Expected callbacks:

| Callback | Purpose |
| --- | --- |
| `getTMACVersionDone` | Receives TMAC version response |
| `GetAgentListStaffedDone` | Receives staffed/logged-in agent data |
| `voiceBargeinNonFACDone` | Receives voice monitor action result |
| `transferTextChatDone` | Receives chat action result |

## Agent Desktop UI Control Event Notes

The application may emit `uicontrolevents` for Agent Desktop UI control use cases. However, supervisor monitoring is implemented through direct SDK invocation because Agent Desktop UI-control subscribers only handle specific events in specific widget contexts.

Expected behavior:

- Other Agent Desktop widgets may log that an event is not handled.
- That does not necessarily mean the custom iframe message failed.
- Direct `invokesdk` is preferred for dashboard monitor actions because it does not depend on another Agent Desktop widget being open.

## Future WebSocket Option

If backend realtime events become available, the recommended design is:

```text
Backend event source
  -> authenticated WebSocket or SignalR channel
  -> session sentiment update event
  -> dashboard state update without full polling refresh
```

Required event types:

- Session created
- Session updated
- Sentiment score changed
- Alert created
- Transcript line added
- Session ended
- Annotation updated

