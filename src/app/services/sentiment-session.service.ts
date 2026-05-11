import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppConfigService } from './app-config.service';

interface SessionFilter {
  sessionId?: string | null;
  agentId?: string | null;
  teamId?: number | null;
}

interface Session {
  sessionId: string;
  interactionId: string;
  agentId: string;
  agentName: string;
  teamId: number;
  status: string;
  channel?: string | null;
  tmacServerName?: string | null;
  deviceId?: string | null;
  latestCustomerSentiment: string;
  latestCustomerScore: number;
  latestAgentSentiment: string;
  latestAgentScore: number;
  customerConsecutiveNegativeCount: number;
  lastUpdatedAt: string;
}

export interface TimelineItem {
  speaker: 'customer' | 'agent';
  sentiment: string;
  transcript: string;
  datetime: string;
  score: number;
  alertReason: string | null;
}

export interface SentimentAnnotationRequest {
  supervisorId: string;
  annotationType: string;
  comment?: string | null;
}

export interface SentimentAnnotationRecord {
  annotationId: string | null;
  supervisorId: string | null;
  annotationType: string | null;
  comment: string | null;
  createdAt: string;
  segmentId: string | null;
  sessionId: string | null;
}

export interface SentimentAnnotationBundle {
  interactionAnnotations: SentimentAnnotationRecord[] | null;
  segmentAnnotations: SentimentAnnotationRecord[] | null;
}

@Injectable({
  providedIn: 'root'
})
export class SentimentSessionService {
  private apiBaseUrl: string = '';
  private configLoaded = false;
  private readonly defaultApiBaseUrl = 'http://localhost:5000/api';
  private useMockData = false;

  //TO-DO remove on official release
  private readonly mockSessions: Session[] = [
    {
      sessionId: 'SES-1042-01',
      interactionId: 'INT-1042-01',
      agentId: 'AG-1042',
      agentName: 'Emma Rodriguez',
      teamId: 10,
      status: 'available',
      channel: 'voice',
      tmacServerName: 'demo-tmac',
      deviceId: '1001',
      latestCustomerSentiment: 'positive',
      latestCustomerScore: 0.71,
      latestAgentSentiment: 'positive',
      latestAgentScore: 0.82,
      customerConsecutiveNegativeCount: 0,
      lastUpdatedAt: '2026-04-20T09:15:00.000Z'
    },
    {
      sessionId: 'SES-1078-01',
      interactionId: 'INT-1078-01',
      agentId: 'AG-1078',
      agentName: 'Liam Carter',
      teamId: 12,
      status: 'on-call',
      channel: 'voice',
      tmacServerName: 'demo-tmac',
      deviceId: '1002',
      latestCustomerSentiment: 'negative',
      latestCustomerScore: -0.31,
      latestAgentSentiment: 'neutral',
      latestAgentScore: -0.08,
      customerConsecutiveNegativeCount: 2,
      lastUpdatedAt: '2026-04-20T09:18:00.000Z'
    },
    {
      sessionId: 'SES-1155-01',
      interactionId: 'INT-1155-01',
      agentId: 'AG-1155',
      agentName: 'Sophia Patel',
      teamId: 15,
      status: 'busy',
      channel: 'voice',
      tmacServerName: 'demo-tmac',
      deviceId: '1003',
      latestCustomerSentiment: 'neutral',
      latestCustomerScore: 0.05,
      latestAgentSentiment: 'positive',
      latestAgentScore: 0.18,
      customerConsecutiveNegativeCount: 1,
      lastUpdatedAt: '2026-04-20T09:22:00.000Z'
    }
  ];
  private readonly mockAnnotations = new Map<string, SentimentAnnotationBundle>();

  constructor(
    private http: HttpClient,
    private appConfigService: AppConfigService
  ) {
    this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    if (this.configLoaded) return;

    try {
      const config = await this.appConfigService.getConfig();
      this.apiBaseUrl = this.normalizeBaseUrl(config?.api?.baseUrl);
      this.useMockData = config?.dashboard?.useDummy === true;
      this.configLoaded = true;
    } catch (error) {
      console.error('Failed to load config, using default API URL', error);
      this.apiBaseUrl = this.defaultApiBaseUrl;
      this.useMockData = false;
      this.configLoaded = true;
    }
  }

  private getApiUrl(): string {
    return this.apiBaseUrl || this.defaultApiBaseUrl;
  }

  private normalizeBaseUrl(baseUrl?: string): string {
    const normalizedBaseUrl = (baseUrl || this.defaultApiBaseUrl).replace(/\/+$/, '');
    return normalizedBaseUrl.replace(/\/v1\/sentiment$/i, '');
  }

  private buildSentimentUrl(path: string): string {
    return `${this.getApiUrl()}/v1/sentiment${path}`;
  }

  private filterMockSessions(filters?: SessionFilter): Session[] {
    const sessionId = filters?.sessionId?.trim().toLowerCase();
    const agentId = filters?.agentId?.trim().toLowerCase();
    const teamId = filters?.teamId;

    return this.mockSessions.filter((session) => {
      const matchesSessionId = !sessionId || session.sessionId.toLowerCase().includes(sessionId);
      const matchesAgentId = !agentId
        || session.agentId.toLowerCase().includes(agentId)
        || session.agentName.toLowerCase().includes(agentId);
      const matchesTeamId = teamId === null || teamId === undefined || session.teamId === teamId;

      return matchesSessionId && matchesAgentId && matchesTeamId;
    });
  }

  private getMockSession(sessionId: string): Session | null {
    return this.mockSessions.find((session) => session.sessionId === sessionId) ?? null;
  }

  private buildMockTimeline(session: Session): TimelineItem[] {
    return [
      {
        speaker: 'customer',
        sentiment: session.latestCustomerSentiment,
        transcript: `Customer interaction for ${session.sessionId} is being reviewed by the supervisor.`,
        datetime: session.lastUpdatedAt,
        score: session.latestCustomerScore,
        alertReason: session.customerConsecutiveNegativeCount > 0 ? 'At risk' : null
      },
      {
        speaker: 'agent',
        sentiment: session.latestAgentSentiment,
        transcript: `Agent response recorded for ${session.agentName}.`,
        datetime: session.lastUpdatedAt,
        score: session.latestAgentScore,
        alertReason: null
      }
    ];
  }

  private getMockAnnotations(sessionId: string): SentimentAnnotationBundle {
    return this.mockAnnotations.get(sessionId) ?? {
      interactionAnnotations: [],
      segmentAnnotations: []
    };
  }

  /**
   * Load sessions with optional filters.
   * Session and agent searches use live-search; team-scoped dashboard loads use ongoing sessions.
   */
  async loadSessions(filters?: SessionFilter): Promise<Session[]> {
    await this.loadConfig();

    if (this.useMockData) {
      return this.filterMockSessions(filters);
    }

    const payload = {
      sessionId: filters?.sessionId?.trim() || '',
      agentId: filters?.agentId?.trim() || '',
      teamId: filters?.teamId ?? ''
    };

    const hasSearchFilters = Boolean(payload.sessionId || payload.agentId);

    const endpoint = hasSearchFilters
      ? this.buildSentimentUrl('/live-search')
      : this.buildSentimentUrl('/sessions/ongoing');

    try {
      console.log('RTSA**** Loading sentiment sessions:', {
        endpoint,
        payload
      });
      const response = await this.http
        .post<Session[]>(endpoint, payload)
        .toPromise();
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error loading sessions:', error);
      return [];
    }
  }

  /**
   * Load timeline for a specific session
   */
  async loadSessionTimeline(sessionId: string): Promise<TimelineItem[]> {
    await this.loadConfig();

    if (this.useMockData) {
      const session = this.getMockSession(sessionId);
      return session ? this.buildMockTimeline(session) : [];
    }

    const encodedId = encodeURIComponent(sessionId);
    const endpoint = this.buildSentimentUrl(`/sessions/${encodedId}/timeline`);

    try {
      const response = await this.http
        .post<TimelineItem[]>(endpoint, {})
        .toPromise();
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error loading timeline:', error);
      return [];
    }
  }

  async loadSessionAnnotations(sessionId: string): Promise<SentimentAnnotationBundle | null> {
    await this.loadConfig();

    if (this.useMockData) {
      return this.getMockAnnotations(sessionId);
    }

    const encodedId = encodeURIComponent(sessionId);
    const endpoint = this.buildSentimentUrl(`/sessions/${encodedId}/annotations/query`);

    try {
      const response = await this.http
        .post<SentimentAnnotationBundle>(endpoint, {})
        .toPromise();
      return response || null;
    } catch (error) {
      console.error('Error loading session annotations:', error);
      return null;
    }
  }

  async annotateSession(
    sessionId: string,
    payload: SentimentAnnotationRequest
  ): Promise<boolean> {
    await this.loadConfig();

    if (this.useMockData) {
      const existingBundle = this.getMockAnnotations(sessionId);
      const interactionAnnotations = [
        ...(existingBundle.interactionAnnotations ?? []),
        {
          annotationId: `mock-${sessionId}-${Date.now()}`,
          supervisorId: payload.supervisorId,
          annotationType: payload.annotationType,
          comment: payload.comment ?? null,
          createdAt: new Date().toISOString(),
          segmentId: null,
          sessionId
        }
      ];

      this.mockAnnotations.set(sessionId, {
        interactionAnnotations,
        segmentAnnotations: existingBundle.segmentAnnotations ?? []
      });

      return true;
    }

    const encodedId = encodeURIComponent(sessionId);
    const endpoint = this.buildSentimentUrl(`/sessions/${encodedId}/annotations`);

    try {
      await this.http
        .post(endpoint, payload)
        .toPromise();
      return true;
    } catch (error) {
      console.error('Error annotating session:', error);
      return false;
    }
  }

}
