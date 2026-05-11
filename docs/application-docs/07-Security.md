# Security Document

## Security Scope

This document covers frontend, API, iframe, SDK invocation, and deployment security considerations for the Deep Sentiment Analysis application.

## Authentication and Authorization

Current frontend assumptions:

- The app may be launched from Agent Desktop as an authenticated custom widget.
- Supervisor identifiers may be supplied through query parameters or parent context.
- Backend APIs are responsible for validating user identity and permissions.

Requirements:

- Backend APIs must validate that the caller can access the requested team, agent, and session.
- Supervisor monitor actions must be allowed only for authorized supervisor roles.
- Annotation and alert suppression actions must be audited with supervisor ID and timestamp.

## Iframe Message Security

Current integration uses browser `postMessage` to communicate with Agent Desktop.

Security requirements:

- Production deployments should restrict accepted message origins.
- Production deployments should avoid sending to `"*"` when a known parent origin is available.
- Incoming message payloads should be validated by callback/function name and expected data shape.
- SDK callbacks should use predefined names, not arbitrary user-supplied callback names.

Recommended production control:

```text
AllowedParentOrigins = [
  "https://agent-desktop.example.com"
]
```

## API Security

Requirements:

- All API traffic must use HTTPS in production.
- APIs must enforce authentication and authorization server-side.
- APIs must validate request payloads and reject invalid session/agent IDs.
- CORS should allow only approved application origins.
- API errors should not expose stack traces or infrastructure details.

## Data Protection

The application may display sensitive customer interaction data, including transcripts and sentiment details.

Controls:

- Do not store transcripts in local storage.
- Do not write customer transcript data to browser console in production.
- Mask or omit personally identifiable information where business rules require it.
- Ensure browser cache policy follows organization data handling rules.

## Configuration Security

Frontend configuration may contain URLs and feature flags, but must not contain secrets.

Allowed in config:

- API base URL
- TMAC server URL
- Refresh intervals
- Threshold values
- Feature toggles

Not allowed in config:

- Passwords
- API keys
- JWT signing secrets
- Database credentials

## Audit Requirements

The backend should audit:

- Supervisor login/context.
- Session viewed.
- Monitor action requested.
- Annotation submitted.
- Alert suppressed or unsuppressed.
- Word/exclusion word added, modified, or deleted.

## Security Risks and Recommendations

| Risk | Current/Expected Impact | Recommendation |
| --- | --- | --- |
| Wildcard `postMessage` target origin | Message could be exposed to unexpected parent window | Configure and enforce known Agent Desktop origin. |
| Missing backend authorization | Supervisor could access unauthorized sessions | Enforce team/session authorization on each API. |
| Console logging sensitive data | Transcript/customer data exposure | Disable sensitive logs in production. |
| Plain HTTP TMAC/API URLs | Network interception risk | Use HTTPS for production. |
| Query-string identity | User spoofing if trusted directly | Treat query params as hints; validate server-side. |

