import { HttpClient } from '@angular/common/http';
import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  SentimentAnnotationBundle,
  SentimentAnnotationRecord,
  SentimentSessionService,
  TimelineItem
} from '../../services/sentiment-session.service';
import {
  AgentDesktopBridgeService,
  AgentDesktopSessionRef,
  ChatMonitorMode,
  VoiceMonitorMode
} from '../../services/agent-desktop-bridge.service';
import { Subject } from 'rxjs';

export interface DashboardMetrics {
  totalAnalyses: number;
  positiveCount: number;
  negativeCount: number;
  atRiskCount: number;
  neutralCount: number;
  averageSentiment: number;
  successRate: number;
  lastUpdated: Date;
}

export interface Agent {
  id: string;
  name: string;
  loginId: string;
  teamId: number | null;
  teamName: string;
  ongoing: number;
  avgSentiment: number;
  sentimentTrend: number[];
  atRisk: RiskLevel;
  status: string;
  liveInsights: {
    peakSentiment: number;
    lowestSentiment: number;
    currentSentiment: number;
  };
  channels: {
    name: string;
    current: number;
    total: number;
  }[];
  sessions: AgentSession[];
}

export interface AgentSession {
  sessionId: string;
  interactionId?: string | null;
  agentId?: string | null;
  deviceId?: string | null;
  tmacServerName?: string | null;
  channel?: string | null;
  sentiment: string;
  score: number;
  lastUpdatedAt?: string | null;
  atRisk: RiskLevel;
  status: string;
  timeline?: TimelineItem[];
  timelineLoading?: boolean;
  annotationLoading?: boolean;
  annotationSubmitting?: boolean;
  latestAnnotationType?: string | null;
  latestAnnotationBy?: string | null;
  latestAnnotationAt?: string | null;
  latestAnnotationComment?: string | null;
  annotationCount?: number;
  annotationHistory?: SessionAnnotationEntry[];
  monitorActionLoading?: boolean;
  monitorActionError?: string | null;
}

type RiskLevel = 'none' | 'bad' | 'critical';
type MetricFilter = 'total' | 'positive' | 'at-risk' | 'neutral' | null;

interface SessionAnnotationEntry {
  annotationId: string | null;
  supervisorId: string | null;
  annotationType: string | null;
  comment: string | null;
  createdAt: string;
  level: 'interaction' | 'segment';
  segmentId: string | null;
}
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  metrics: DashboardMetrics | null = null;
  agents: Agent[] = [];
  allAgents: Agent[] = [];
  loading = false;
  showMetricsSection = true;
  alignMetricsSectionRight = false;
  showAgentMonitorSection = true;
  showSummarySection = true;
  showSentimentDistributionSection = true;
  showQuickStatsSection = true;
  expandedAgentId: string | null = null;
  activeInteractionSessionId: string | null = null;
  annotationModalSession: AgentSession | null = null;
  annotationModalAgentName = '';
  annotationDraftComment = '';
  annotationCommentError = '';
  teamOptions: string[] = [];
  activeMetricFilter: MetricFilter = null;
  filters = {
    agentName: '',
    teamId: '',
    sessionId: '',
    sentiment: ''
  };
  private configLoaded = false;
  private refreshIntervalMs = 5000;
  private autoRefreshHandle: ReturnType<typeof setInterval> | null = null;
  private readonly annotationBundleCache = new Map<string, SentimentAnnotationBundle>();
  private riskThresholds = {
    bad: -0.5,
    critical: -0.75
  };
  private destroy$ = new Subject<void>();
  private readonly supervisorId = 'team-leader-1';

  constructor(
    private sentimentSessionService: SentimentSessionService,
    private http: HttpClient,
    private agentDesktopBridgeService: AgentDesktopBridgeService
  ) {}

  ngOnInit(): void {
    this.loadMetrics();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMetrics(): void {
    this.loading = true;
    this.loadRealMetrics();
  }

  private async loadRealMetrics(): Promise<void> {
    try {
      await this.loadConfig();
      const sessions = await this.sentimentSessionService.loadSessions();
      this.allAgents = sessions && sessions.length > 0
        ? this.transformSessionsToAgents(sessions)
        : [];
      this.applyFilters();
    } catch (error) {
      console.error('Error loading real metrics:', error);
      this.allAgents = [];
      this.agents = [];
      this.calculateMetrics(this.agents);
    } finally {
      this.loading = false;
    }
  }

  private async loadConfig(): Promise<void> {
    if (this.configLoaded) return;

    const applyConfig = (config: any): void => {
      this.riskThresholds = {
        bad: typeof config?.sentiment?.thresholds?.bad === 'number' ? config.sentiment.thresholds.bad : -0.5,
        critical: typeof config?.sentiment?.thresholds?.critical === 'number' ? config.sentiment.thresholds.critical : -0.75
      };
      this.showMetricsSection = config?.dashboard?.showMetricsSection !== false;
      this.alignMetricsSectionRight = config?.dashboard?.alignMetricsSectionRight === true;
      this.showAgentMonitorSection = config?.dashboard?.showAgentMonitorSection !== false;
      this.showSummarySection = config?.dashboard?.showSummarySection !== false;
      this.showSentimentDistributionSection = config?.dashboard?.showSentimentDistributionSection !== false;
      this.showQuickStatsSection = config?.dashboard?.showQuickStatsSection !== false;
      this.refreshIntervalMs = typeof config?.dashboard?.refreshInterval === 'number' && config.dashboard.refreshInterval >= 1000
        ? config.dashboard.refreshInterval
        : 5000;
      this.configLoaded = true;
      this.startAutoRefresh();
    };

    try {
      const config = await this.http.get<any>('/assets/config/app/config.json').toPromise();
      applyConfig(config);
    } catch (error) {
      console.warn('Failed to load dashboard config from /assets/config/app/config.json, trying /config.json', error);
      try {
        const fallbackConfig = await this.http.get<any>('/config.json').toPromise();
        applyConfig(fallbackConfig);
      } catch (fallbackError) {
        console.error('Failed to load dashboard config.json, using default risk thresholds', fallbackError);
        this.configLoaded = true;
      }
    }
  }

  private transformSessionsToAgents(sessions: any[]): Agent[] {
    const agentMap = new Map<string, Agent>();

    sessions.forEach((session, index) => {
      const agentId = String(session.agentId || session.agentName || `agent-${index}`);
      const agentName = this.getAgentDisplayName(session, index);
      const sessionScore = this.getSessionScore(session);
      const sessionStatus = String(session.status || 'unknown').trim().toLowerCase() || 'unknown';

      if (!agentMap.has(agentId)) {
        agentMap.set(agentId, {
          id: agentId,
          name: agentName,
          loginId: session.agentId || `AG-${String(session.teamId || index).padStart(4, '0')}`,
          teamId: session.teamId ?? null,
          teamName: this.getTeamDisplayName(session, index),
          ongoing: 0,
          avgSentiment: 0,
          sentimentTrend: [],
          atRisk: 'none',
          status: sessionStatus,
          liveInsights: {
            peakSentiment: sessionScore,
            lowestSentiment: sessionScore,
            currentSentiment: sessionScore
          },
          channels: [],
          sessions: []
        });
      }

      const agent = agentMap.get(agentId)!;
      const agentSession: AgentSession = {
        sessionId: session.sessionId || `Session ${agent.sessions.length + 1}`,
        interactionId: session.interactionId || null,
        agentId: session.agentId || null,
        deviceId: session.deviceId || null,
        tmacServerName: session.tmacServerName || session.tmacServer || null,
        channel: session.channel || null,
        sentiment: session.latestCustomerSentiment || 'neutral',
        score: sessionScore,
        lastUpdatedAt: session.lastUpdatedAt ?? null,
        atRisk: this.getRiskLevel(sessionScore),
        status: sessionStatus
      };

      const cachedAnnotationBundle = this.annotationBundleCache.get(agentSession.sessionId);
      if (cachedAnnotationBundle) {
        this.applyAnnotationBundle(agentSession, cachedAnnotationBundle);
      }

      agent.sessions.push(agentSession);
      agent.ongoing = agent.sessions.length;
      agent.sentimentTrend.push(sessionScore);
      agent.atRisk = this.getHighestRiskLevel([agent.atRisk, this.getRiskLevel(sessionScore)]);
    });

    return Array.from(agentMap.values()).map((agent) => {
      const sortedSessions = [...agent.sessions].sort((left, right) => this.compareSessionDisplayPriority(left, right));
      const scores = sortedSessions.map((session) => session.score);
      const avgSentiment = scores.length
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0;
      const latestScore = sortedSessions[0]?.score ?? 0;

      return {
        ...agent,
        sessions: sortedSessions,
        avgSentiment,
        liveInsights: {
          peakSentiment: scores.length ? Math.max(...scores) : 0,
          lowestSentiment: scores.length ? Math.min(...scores) : 0,
          currentSentiment: latestScore
        },
        channels: [
          { name: 'Sessions', current: agent.sessions.length, total: agent.sessions.length }
        ]
      };
    });
  }

  private getAgentDisplayName(session: any, index: number): string {
    return session.agentName || session.agentDisplayName || session.agentId || `Agent ${index + 1}`;
  }

  private getTeamDisplayName(session: any, index: number): string {
    if (session.teamName) return session.teamName;
    if (session.teamId !== undefined && session.teamId !== null) return `Team ${session.teamId}`;
    return `Team ${index + 1}`;
  }

  getAgentLabel(agent: Agent): string {
    return `${agent.name} (${agent.loginId})`;
  }

  getLatestSessionSentiment(agent: Agent): string {
    return agent.sessions[0]?.sentiment || 'neutral';
  }

  formatStatusLabel(status: string | null | undefined): string {
    const normalizedStatus = String(status || '')
      .trim()
      .replace(/[_-]+/g, ' ')
      .toLowerCase();

    if (!normalizedStatus) {
      return 'Unknown';
    }

    return normalizedStatus.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  formatSentimentLabel(sentiment: string | null | undefined): string {
    const normalizedSentiment = String(sentiment || '').trim().toLowerCase();

    if (!normalizedSentiment) {
      return 'No data';
    }

    return normalizedSentiment.charAt(0).toUpperCase() + normalizedSentiment.slice(1);
  }

  private getSessionScore(session: any): number {
    return typeof session.latestCustomerScore === 'number'
      ? session.latestCustomerScore
      : this.parseSentiment(session.latestCustomerSentiment);
  }

  private parseSentiment(sentiment: string | undefined): number {
    if (!sentiment) return 0;
    switch (sentiment.toLowerCase()) {
      case 'positive': return 0.7;
      case 'negative': return -0.7;
      case 'neutral': return 0;
      default: return 0;
    }
  }

  private calculateMetrics(agents: Agent[]): void {
    const sessions = agents.flatMap((agent) => agent.sessions ?? []);

    if (sessions.length === 0) {
      this.metrics = {
        totalAnalyses: 0,
        positiveCount: 0,
        negativeCount: 0,
        atRiskCount: 0,
        neutralCount: 0,
        averageSentiment: 0,
        successRate: 0,
        lastUpdated: new Date()
      };
      return;
    }

    const totalAnalyses = sessions.length;
    const positiveCount = sessions.filter((session) => session.score > 0.5).length;
    const negativeCount = sessions.filter((session) => session.score < -0.5).length;
    const atRiskCount = sessions.filter((session) => session.atRisk !== 'none').length;
    const neutralCount = totalAnalyses - positiveCount - negativeCount;
    const averageSentiment = sessions.reduce((sum, session) => sum + session.score, 0) / totalAnalyses;

    this.metrics = {
      totalAnalyses,
      positiveCount,
      negativeCount,
      atRiskCount,
      neutralCount,
      averageSentiment,
      successRate: ((positiveCount + neutralCount) / totalAnalyses) * 100,
      lastUpdated: new Date()
    };
  }

  refreshMetrics(): void {
    if (this.loading) return;
    this.loading = true;
    this.loadMetrics();
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();

    if (this.refreshIntervalMs <= 0) {
      return;
    }

    this.autoRefreshHandle = setInterval(() => {
      if (!this.loading) {
        this.loadMetrics();
      }
    }, this.refreshIntervalMs);
  }

  private stopAutoRefresh(): void {
    if (this.autoRefreshHandle !== null) {
      clearInterval(this.autoRefreshHandle);
      this.autoRefreshHandle = null;
    }
  }

  onFilterChange(field: 'agentName' | 'teamId' | 'sessionId' | 'sentiment', value: string): void {
    this.filters = {
      ...this.filters,
      [field]: value
    };
    this.applyFilters();
  }

  clearFilters(): void {
    this.filters = {
      agentName: '',
      teamId: '',
      sessionId: '',
      sentiment: ''
    };
    this.activeMetricFilter = null;
    this.applyFilters();
  }

  selectMetricFilter(filter: Exclude<MetricFilter, null>): void {
    this.activeMetricFilter = this.activeMetricFilter === filter || filter === 'total'
      ? (filter === 'total' ? 'total' : null)
      : filter;

    if (filter === 'total') {
      this.activeMetricFilter = 'total';
    }

    this.applyFilters();
  }

  isMetricFilterActive(filter: Exclude<MetricFilter, null>): boolean {
    return this.activeMetricFilter === filter;
  }

  private applyFilters(): void {
    this.teamOptions = Array.from(
      new Set(
        this.allAgents
          .map((agent) => agent.teamId)
          .filter((teamId) => teamId !== null && teamId !== undefined)
          .map((teamId) => String(teamId))
      )
    ).sort((a, b) => a.localeCompare(b));

    const agentQuery = this.filters.agentName.trim().toLowerCase();
    const teamQuery = this.filters.teamId.trim().toLowerCase();
    const sessionQuery = this.filters.sessionId.trim().toLowerCase();
    const sentimentQuery = this.filters.sentiment.trim().toLowerCase();
    const metricFilter = this.activeMetricFilter;

    const baseAgents = this.allAgents
      .map((agent) => {
        const filteredSessions = agent.sessions.filter((session) => {
          const matchesSession = !sessionQuery || session.sessionId.toLowerCase().includes(sessionQuery);
          const matchesSentiment = !sentimentQuery || session.sentiment.toLowerCase() === sentimentQuery;
          return matchesSession && matchesSentiment;
        });
        const sortedFilteredSessions = [...filteredSessions].sort((left, right) => this.compareSessionDisplayPriority(left, right));

        const filteredScores = sortedFilteredSessions.map((session) => session.score);
        const latestScore = sortedFilteredSessions[0]?.score ?? 0;
        const agentRisk = this.getHighestRiskLevel(sortedFilteredSessions.map((session) => session.atRisk));
        const agentStatus = sortedFilteredSessions[0]?.status ?? agent.status;

        return {
          ...agent,
          sessions: sortedFilteredSessions,
          ongoing: sortedFilteredSessions.length,
          avgSentiment: filteredScores.length
            ? filteredScores.reduce((sum, score) => sum + score, 0) / filteredScores.length
            : 0,
          atRisk: agentRisk,
          status: agentStatus,
          liveInsights: {
            peakSentiment: filteredScores.length ? Math.max(...filteredScores) : 0,
            lowestSentiment: filteredScores.length ? Math.min(...filteredScores) : 0,
            currentSentiment: latestScore
          },
          channels: agent.channels.map((channel) => ({
            ...channel,
            current: sortedFilteredSessions.length,
            total: sortedFilteredSessions.length
          }))
        };
      })
      .filter((agent) => {
        const matchesAgent = !agentQuery || agent.name.toLowerCase().includes(agentQuery);
        const matchesTeam = !teamQuery || String(agent.teamId ?? '').toLowerCase().includes(teamQuery);
        const hasMatchingSessions = agent.sessions.length > 0;
        return matchesAgent && matchesTeam && hasMatchingSessions;
      });

    this.calculateMetrics(baseAgents);

    this.agents = baseAgents
      .map((agent) => {
        const metricSessions = agent.sessions.filter((session) => {
          if (!metricFilter || metricFilter === 'total') {
            return true;
          }

          if (metricFilter === 'positive') {
            return session.score > 0.5;
          }

          if (metricFilter === 'neutral') {
            return session.score >= -0.5 && session.score <= 0.5;
          }

          return session.atRisk !== 'none';
        });

        const sortedMetricSessions = [...metricSessions].sort((left, right) => this.compareSessionDisplayPriority(left, right));
        const filteredScores = sortedMetricSessions.map((session) => session.score);
        const latestScore = sortedMetricSessions[0]?.score ?? 0;

        return {
          ...agent,
          sessions: sortedMetricSessions,
          ongoing: sortedMetricSessions.length,
          avgSentiment: filteredScores.length
            ? filteredScores.reduce((sum, score) => sum + score, 0) / filteredScores.length
            : 0,
          atRisk: this.getHighestRiskLevel(sortedMetricSessions.map((session) => session.atRisk)),
          status: sortedMetricSessions[0]?.status ?? agent.status,
          liveInsights: {
            peakSentiment: filteredScores.length ? Math.max(...filteredScores) : 0,
            lowestSentiment: filteredScores.length ? Math.min(...filteredScores) : 0,
            currentSentiment: latestScore
          },
          channels: agent.channels.map((channel) => ({
            ...channel,
            current: sortedMetricSessions.length,
            total: sortedMetricSessions.length
          }))
        };
      })
      .filter((agent) => !metricFilter || metricFilter === 'total' || agent.sessions.length > 0)
      .sort((left, right) => this.compareAgentDisplayPriority(left, right));

    if (this.expandedAgentId && !this.agents.some((agent) => agent.id === this.expandedAgentId)) {
      this.expandedAgentId = null;
    }

    if (this.activeInteractionSessionId) {
      const activeSession = this.agents
        .flatMap((agent) => agent.sessions)
        .find((session) => session.sessionId === this.activeInteractionSessionId);

      if (activeSession) {
        void this.loadTimelineForSession(activeSession);
      } else {
        this.activeInteractionSessionId = null;
      }
    }

  }

  async toggleAgentDetails(agent: Agent): Promise<void> {
    this.expandedAgentId = this.expandedAgentId === agent.id ? null : agent.id;
    this.activeInteractionSessionId = null;

    if (this.expandedAgentId === agent.id) {
      await this.loadAnnotationsForAgent(agent);
    }
  }

  async toggleInteractionSession(session: AgentSession): Promise<void> {
    this.activeInteractionSessionId =
      this.activeInteractionSessionId === session.sessionId ? null : session.sessionId;

    if (this.activeInteractionSessionId === session.sessionId) {
      await this.loadTimelineForSession(session);
    }
  }

  async annotateSession(session: AgentSession, annotationType: 'thumbs_up' | 'thumbs_down'): Promise<void> {
    if (session.annotationSubmitting) return;

    const comment = this.annotationDraftComment.trim();
    if (!comment) {
      this.annotationCommentError = 'Comment is required before submitting feedback.';
      return;
    }

    session.annotationSubmitting = true;
    this.annotationCommentError = '';

    const success = await this.sentimentSessionService.annotateSession(session.sessionId, {
      supervisorId: this.supervisorId,
      annotationType,
      comment
    });

    if (success) {
      const bundle = await this.sentimentSessionService.loadSessionAnnotations(session.sessionId);
      if (bundle) {
        this.annotationBundleCache.set(session.sessionId, bundle);
        this.applyAnnotationBundle(session, bundle);
      }
      this.annotationDraftComment = '';
    }

    session.annotationSubmitting = false;
  }

  async launchSessionMonitor(session: AgentSession, mode: 'silent' | 'whisper' | 'barge-in'): Promise<void> {
    if (session.monitorActionLoading) return;

    session.monitorActionLoading = true;
    session.monitorActionError = null;

    try {
      if (this.isChatSession(session)) {
        const chatMode: ChatMonitorMode = mode === 'barge-in' ? 'conf' : mode;
        await this.agentDesktopBridgeService.performChatBargeIn(this.toAgentDesktopSession(session), chatMode);
      } else {
        const voiceMode: VoiceMonitorMode = mode;
        await this.agentDesktopBridgeService.performVoiceBargeIn(this.toAgentDesktopSession(session), voiceMode);
      }
    } catch (error) {
      session.monitorActionError = error instanceof Error ? error.message : 'Monitoring action failed.';
      console.error(`Failed to execute ${mode} for session ${session.sessionId}`, error);
    } finally {
      session.monitorActionLoading = false;
    }
  }

  canLaunchSessionMonitor(session: AgentSession): boolean {
    return this.isChatSession(session)
      ? this.agentDesktopBridgeService.canUseChatMonitor(this.toAgentDesktopSession(session))
      : this.agentDesktopBridgeService.canUseVoiceMonitor(this.toAgentDesktopSession(session));
  }

  isChatSession(session: AgentSession): boolean {
    const channel = (session.channel || '').toLowerCase();
    return ['textchat', 'audiochat', 'videochat', 'text', 'chat'].includes(channel);
  }

  getMonitorActionLabel(session: AgentSession, mode: 'silent' | 'whisper' | 'barge-in'): string {
    if (mode === 'silent') {
      return 'Silent Monitor';
    }

    if (mode === 'whisper') {
      return 'Whisper';
    }

    return this.isChatSession(session) ? 'Takeover' : 'Barge-In';
  }

  private toAgentDesktopSession(session: AgentSession): AgentDesktopSessionRef {
    return {
      sessionId: session.sessionId,
      interactionId: session.interactionId ?? null,
      agentId: session.agentId ?? null,
      deviceId: session.deviceId ?? null,
      tmacServerName: session.tmacServerName ?? null,
      channel: session.channel ?? null
    };
  }

  private async loadAnnotationsForAgent(agent: Agent): Promise<void> {
    await Promise.all(
      agent.sessions.map(async (session) => {
        if (session.annotationLoading || session.annotationCount !== undefined) return;

        session.annotationLoading = true;
        const bundle = await this.sentimentSessionService.loadSessionAnnotations(session.sessionId);

        if (bundle) {
          this.annotationBundleCache.set(session.sessionId, bundle);
          this.applyAnnotationBundle(session, bundle);
        } else if (session.annotationCount === undefined) {
          session.annotationCount = 0;
        }

        session.annotationLoading = false;
      })
    );
  }

  private applyAnnotationBundle(session: AgentSession, bundle: SentimentAnnotationBundle): void {
    const interactionAnnotations = bundle.interactionAnnotations ?? [];
    const segmentAnnotations = bundle.segmentAnnotations ?? [];
    const latestAnnotation = this.getLatestAnnotation(interactionAnnotations);
    const annotationHistory = [
      ...interactionAnnotations.map((annotation) => this.mapAnnotationEntry(annotation, 'interaction')),
      ...segmentAnnotations.map((annotation) => this.mapAnnotationEntry(annotation, 'segment'))
    ].sort((left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );

    session.latestAnnotationType = latestAnnotation?.annotationType ?? null;
    session.latestAnnotationBy = latestAnnotation?.supervisorId ?? null;
    session.latestAnnotationAt = latestAnnotation?.createdAt ?? null;
    session.latestAnnotationComment = latestAnnotation?.comment ?? null;
    session.annotationCount = interactionAnnotations.length + segmentAnnotations.length;
    session.annotationHistory = annotationHistory;
  }

  private mapAnnotationEntry(
    annotation: SentimentAnnotationRecord,
    level: 'interaction' | 'segment'
  ): SessionAnnotationEntry {
    return {
      annotationId: annotation.annotationId ?? null,
      supervisorId: annotation.supervisorId ?? null,
      annotationType: annotation.annotationType ?? null,
      comment: annotation.comment ?? null,
      createdAt: annotation.createdAt,
      level,
      segmentId: annotation.segmentId ?? null
    };
  }

  private getLatestAnnotation(annotations: SentimentAnnotationRecord[]): SentimentAnnotationRecord | null {
    if (!annotations.length) return null;

    return [...annotations].sort((left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )[0] ?? null;
  }

  getAnnotationLabel(annotationType: string | null | undefined): string {
    if (annotationType === 'thumbs_up') return 'Thumbs up';
    if (annotationType === 'thumbs_down') return 'Thumbs down';
    return 'No feedback yet';
  }

  hasExistingReview(session: AgentSession): boolean {
    return Boolean(session.latestAnnotationType);
  }

  getAnnotationIcon(annotationType: string | null | undefined): string {
    if (annotationType === 'thumbs_up') return '👍';
    if (annotationType === 'thumbs_down') return '👎';
    return '•';
  }

  getAnnotationBadgeClass(annotationType: string | null | undefined): string {
    if (annotationType === 'thumbs_up') return 'annotation-badge--up';
    if (annotationType === 'thumbs_down') return 'annotation-badge--down';
    return '';
  }

  getAnnotationLevelLabel(level: 'interaction' | 'segment'): string {
    return level === 'segment' ? 'Segment Review' : 'Call Review';
  }

  isAnnotationSelected(session: AgentSession, annotationType: 'thumbs_up' | 'thumbs_down'): boolean {
    return session.latestAnnotationType === annotationType;
  }

  async openAnnotationModal(agent: Agent, session: AgentSession): Promise<void> {
    this.annotationModalAgentName = this.getAgentLabel(agent);
    this.annotationModalSession = session;
    this.annotationDraftComment = '';
    this.annotationCommentError = '';

    await this.loadTimelineForSession(session);

    if (session.annotationCount === undefined && !session.annotationLoading) {
      session.annotationLoading = true;
      const bundle = await this.sentimentSessionService.loadSessionAnnotations(session.sessionId);

      if (bundle) {
        this.annotationBundleCache.set(session.sessionId, bundle);
        this.applyAnnotationBundle(session, bundle);
      } else if (session.annotationCount === undefined) {
        session.annotationCount = 0;
      }

      session.annotationLoading = false;
    }
  }

  closeAnnotationModal(): void {
    this.annotationModalSession = null;
    this.annotationModalAgentName = '';
    this.annotationDraftComment = '';
    this.annotationCommentError = '';
  }

  private async loadTimelineForSession(session: AgentSession): Promise<void> {
    if (session.timelineLoading || session.timeline !== undefined) return;

    session.timelineLoading = true;
    try {
      session.timeline = await this.sentimentSessionService.loadSessionTimeline(session.sessionId);
    } finally {
      session.timelineLoading = false;
    }
  }

  getSentimentPercentage(count: number, total: number): number {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  }

  getSentimentTone(sentiment: number): string {
    if (sentiment > 0) return 'positive';
    if (sentiment < 0) return 'negative';
    return 'neutral';
  }

  formatScore(score: number | null | undefined): string {
    return Number(score ?? 0).toFixed(2);
  }

  get riskThresholdBad(): number {
    return this.riskThresholds.bad;
  }

  get riskThresholdCritical(): number {
    return this.riskThresholds.critical;
  }

  getThresholdTooltip(level: 'bad' | 'critical'): string {
    if (level === 'bad') {
      return `Bad: sessions with sentiment score less than or equal to ${this.formatScore(this.riskThresholdBad)} are marked at risk.`;
    }

    return `Critical: sessions with sentiment score less than or equal to ${this.formatScore(this.riskThresholdCritical)} are marked critical.`;
  }

  getMetricClass(metric: string, value: number): string {
    if (metric === 'sentiment') {
      return value > 0 ? 'high' : value < 0 ? 'low' : 'neutral';
    }
    if (metric === 'success') {
      return value > 95 ? 'excellent' : value > 85 ? 'good' : 'fair';
    }
    return '';
  }

  getStatusClass(status: string): string {
    const normalizedStatus = String(status || 'unknown')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `status-${normalizedStatus || 'unknown'}`;
  }

  getRiskClass(riskLevel: RiskLevel): string {
    switch (riskLevel) {
      case 'critical':
        return 'risk-critical';
      case 'bad':
        return 'risk-bad';
      default:
        return 'risk-none';
    }
  }

  getRiskLabel(riskLevel: RiskLevel): string {
    switch (riskLevel) {
      case 'critical':
        return 'Critical';
      case 'bad':
        return 'Yes';
      default:
        return 'No';
    }
  }

  private getRiskLevel(score: number): RiskLevel {
    if (score <= this.riskThresholds.critical) return 'critical';
    if (score <= this.riskThresholds.bad) return 'bad';
    return 'none';
  }

  private getHighestRiskLevel(riskLevels: RiskLevel[]): RiskLevel {
    if (riskLevels.includes('critical')) return 'critical';
    if (riskLevels.includes('bad')) return 'bad';
    return 'none';
  }

  private compareSessionRecency(left: AgentSession, right: AgentSession): number {
    return this.getSessionTimestamp(right) - this.getSessionTimestamp(left);
  }

  private compareSessionDisplayPriority(left: AgentSession, right: AgentSession): number {
    const sentimentGap = this.getSentimentPriority(left.sentiment, left.score) - this.getSentimentPriority(right.sentiment, right.score);
    if (sentimentGap !== 0) {
      return sentimentGap;
    }

    const scoreGap = left.score - right.score;
    if (scoreGap !== 0) {
      return scoreGap;
    }

    return this.compareSessionRecency(left, right);
  }

  private compareAgentDisplayPriority(left: Agent, right: Agent): number {
    const sentimentGap =
      this.getSentimentPriority(this.getLatestSessionSentiment(left), left.liveInsights.currentSentiment) -
      this.getSentimentPriority(this.getLatestSessionSentiment(right), right.liveInsights.currentSentiment);
    if (sentimentGap !== 0) {
      return sentimentGap;
    }

    const scoreGap = left.liveInsights.currentSentiment - right.liveInsights.currentSentiment;
    if (scoreGap !== 0) {
      return scoreGap;
    }

    return left.name.localeCompare(right.name);
  }

  private getSentimentPriority(sentiment: string | null | undefined, score: number): number {
    switch (String(sentiment || '').trim().toLowerCase()) {
      case 'positive':
        return 3;
      case 'neutral':
        return 2;
      case 'negative':
        return 1;
      default:
        return score > 0 ? 3 : score < 0 ? 1 : 2;
    }
  }

  private getSessionTimestamp(session: AgentSession): number {
    if (!session.lastUpdatedAt) return 0;

    const timestamp = new Date(session.lastUpdatedAt).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  getMetricDeltaLabel(metric: 'total' | 'positive' | 'neutral' | 'atRisk' | 'negative'): string {
    if (!this.metrics) return '0% of total';

    switch (metric) {
      case 'total':
        return `${this.metrics.successRate.toFixed(1)}% success rate`;
      case 'positive':
        return `${this.getSentimentPercentage(this.metrics.positiveCount, this.metrics.totalAnalyses)}% of total`;
      case 'neutral':
        return `${this.getSentimentPercentage(this.metrics.neutralCount, this.metrics.totalAnalyses)}% of total`;
      case 'atRisk':
        return `${this.getSentimentPercentage(this.metrics.atRiskCount, this.metrics.totalAnalyses)}% need review`;
      case 'negative':
        return `${this.getSentimentPercentage(this.metrics.negativeCount, this.metrics.totalAnalyses)}% of total`;
      default:
        return '0% of total';
    }
  }

  getSentimentDistributionStyle(): string {
    if (!this.metrics || this.metrics.totalAnalyses === 0) {
      return 'conic-gradient(#e2e8f0 0deg 360deg)';
    }

    const positive = this.getSentimentPercentage(this.metrics.positiveCount, this.metrics.totalAnalyses);
    const neutral = this.getSentimentPercentage(this.metrics.neutralCount, this.metrics.totalAnalyses);
    const atRisk = this.getSentimentPercentage(this.metrics.atRiskCount, this.metrics.totalAnalyses);
    const negative = Math.max(0, 100 - positive - neutral - atRisk);

    return `conic-gradient(
      #4ecb71 0% ${positive}%,
      #f6bf3f ${positive}% ${positive + neutral}%,
      #ff8b3d ${positive + neutral}% ${positive + neutral + atRisk}%,
      #ff4d4f ${positive + neutral + atRisk}% ${positive + neutral + atRisk + negative}%,
      #e2e8f0 ${positive + neutral + atRisk + negative}% 100%
    )`;
  }

  getTopRiskAgents(limit = 3): Agent[] {
    return [...this.agents]
      .filter((agent) => agent.sessions.length > 0)
      .sort((left, right) => {
        const riskGap = this.getRiskPriority(right.atRisk) - this.getRiskPriority(left.atRisk);
        if (riskGap !== 0) {
          return riskGap;
        }

        return left.liveInsights.currentSentiment - right.liveInsights.currentSentiment;
      })
      .slice(0, limit);
  }

  getRealtimeAlerts(limit = 3): Array<{ title: string; subtitle: string; time: string; tone: string }> {
    return this.getTopRiskAgents(limit)
      .map((agent, index) => {
        const score = agent.liveInsights.currentSentiment;
        const tone = score <= this.riskThresholds.critical
          ? 'negative'
          : score <= this.riskThresholds.bad
            ? 'at-risk'
            : score < 0
              ? 'warning'
              : 'positive';

        return {
          title: score <= this.riskThresholds.critical
            ? 'High Negative Sentiment'
            : score <= this.riskThresholds.bad
              ? 'At Risk Session'
              : score < 0
                ? 'Negative Trend Detected'
                : 'Monitor Stable',
          subtitle: `${agent.name} (${agent.loginId})`,
          time: index === 0 ? 'Just now' : `${index * 2} min ago`,
          tone
        };
      });
  }

  getScoreClass(score: number): string {
    if (score > 0) return 'score-positive';
    if (score < 0) return 'score-negative';
    return 'score-neutral';
  }

  getAgentInitials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'AG';
  }

  private getRiskPriority(riskLevel: RiskLevel): number {
    switch (riskLevel) {
      case 'critical':
        return 2;
      case 'bad':
        return 1;
      default:
        return 0;
    }
  }

  buildSparklinePoints(trendData: number[]): string {
    if (!trendData || !trendData.length) return '';

    const max = Math.max(...trendData);
    const min = Math.min(...trendData);
    const range = max - min || 1;

    return trendData
      .map((value, index) => {
        const x = trendData.length === 1 ? 0 : (index / (trendData.length - 1)) * 120;
        const y = 28 - ((value - min) / range) * 24;
        return `${x},${y}`;
      })
      .join(' ');
  }
}
