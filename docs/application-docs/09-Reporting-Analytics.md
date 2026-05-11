# Reporting and Analytics Document

## Analytics Purpose

The application supports operational analytics for live sentiment supervision and topic/keyword intelligence.

## Dashboard Metrics

Current dashboard analytics include:

- Total active sessions or agents.
- Sentiment classification by session.
- Critical and bad sentiment counts.
- Selected session sentiment timeline.
- Session alerts.
- Review annotation counts.
- Agent/session status from Agent Desktop where available.

## Sentiment Classification

Sentiment thresholds are configured in `config.json`:

```json
{
  "sentiment": {
    "thresholds": {
      "neutral": 0,
      "bad": -0.5,
      "critical": -0.75
    }
  }
}
```

Expected classification behavior:

- Scores at or below the critical threshold are critical.
- Scores at or below the bad threshold are bad.
- Scores below neutral but above bad are negative/neutral depending on UI mapping.
- Scores at or above neutral are treated as non-negative.

## Word Intelligence Analytics

The Word Intelligence dashboard supports:

- Word count by source.
- Intent/group-based keyword browsing.
- Keyword counts after filter application.
- Session drilldown for selected keyword.
- Transcript search for free-text terms.
- Processor trigger for refreshing backend-generated word intelligence data.

Supported filters:

- Source
- Department
- Direction
- Agent ID
- Team ID
- Skill
- Date/time range
- Intent/group
- Keyword

## Reporting Use Cases

| Use Case | Description |
| --- | --- |
| High-risk session review | Identify critical sessions and inspect transcript timeline. |
| Agent coaching | Review negative sessions and annotate outcomes. |
| Topic discovery | Identify frequently occurring customer words or intents. |
| Operational trend review | Compare keyword occurrence by source, skill, department, or time. |
| Compliance review | Use transcript and annotation workflow for follow-up. |

## Recommended Future Reports

- Daily sentiment summary by team.
- Critical sessions by agent.
- Most frequent customer complaint phrases.
- Word/intent trend over time.
- Supervisor intervention audit report.
- Annotation quality distribution.
- Alert suppression report.

## Export Requirements

The application configuration includes an `exportData` feature flag. When export is implemented, reports should support:

- CSV export for tabular data.
- Date range filters.
- Team and agent filters.
- Audit-safe export logging.

