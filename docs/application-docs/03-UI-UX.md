# UI/UX Specification

## Navigation

| Route | Screen |
| --- | --- |
| `/dashboard` | Supervisor Sentiment Dashboard |
| `/word-intelligence` | Word Intelligence Dashboard |
| `/config` | Runtime Configuration Settings |

## Dashboard Screen

Primary users: supervisors and quality analysts.

The dashboard presents an operational view rather than a marketing-style page. It should prioritize fast scanning, visible risk, and direct action.

Main areas:

- Header and dashboard controls.
- Metrics summary section.
- Agent/session monitor table or card list.
- Selected session detail panel.
- Sentiment trend and transcript timeline.
- Review and annotation controls.
- Monitor action controls.

## Dashboard Interactions

| Interaction | Expected Behavior |
| --- | --- |
| Refresh | Reload active session metrics from backend. |
| Auto refresh | Refresh sessions on configured interval if no load is already active. |
| Select session | Show timeline, alerts, annotations, and review controls. |
| Submit annotation | Require comment, then submit thumbs-up or thumbs-down review. |
| Silent monitor | Trigger Agent Desktop voice/chat monitor action for the selected session. |
| Whisper | Trigger Agent Desktop voice monitor with whisper mode. |
| Barge-in | Trigger Agent Desktop voice monitor with barge-in mode. |
| Suppress alerts | Mark session alerts as suppressed when backend supports it. |

## Word Intelligence Screen

Primary users: supervisors, analysts, and operations managers.

Main areas:

- Filter controls for source, department, direction, agent, team, skill, and date range.
- Intent/group navigation.
- Keyword chips with detected counts.
- Session list for selected keyword.
- Transcript expansion area.
- Processor trigger action.

## Word Intelligence Interactions

| Interaction | Expected Behavior |
| --- | --- |
| Apply filters | Recalculate visible keyword counts and matching sessions. |
| Clear filters | Reset filters and reload filtered data. |
| Select intent | Show keywords belonging to that intent. |
| Select keyword | Load sessions where the keyword appears in transcript content. |
| Expand transcript | Load and show transcript lines for that session. |
| Search transcripts | Find sessions whose transcript lines contain the search text. |
| Trigger processor | Request backend processing and refresh the visible data. |

## UI States

Each screen should support:

- Loading state while APIs are in progress.
- Empty state when no data is returned.
- Error state when API or SDK calls fail.
- Disabled state for actions that do not have required identifiers.
- Success message after save, review, processor, or SDK action completion.

## Accessibility Expectations

- Buttons should have clear accessible labels.
- Action buttons should show disabled state when unavailable.
- Error messages should be text-visible, not color-only.
- Tables or repeated session lists should preserve readable contrast.
- Keyboard users should be able to reach filters, actions, and session details.

## Responsive Behavior

- Dashboard content should remain readable on laptop-sized supervisor screens.
- Metrics and filters may stack on smaller widths.
- Session details should not hide critical actions.
- Transcript text should wrap without horizontal scrolling.

