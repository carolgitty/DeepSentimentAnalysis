import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface ApiResponse {
  success: boolean;
  message: string | null;
}

export interface BucketWordCount {
  word: string | null;
  count: number;
  isAgent: boolean;
  group: string | null;
}

export interface DetectedWord {
  word: string | null;
  count: number;
  group: string | null;
}

export interface WordEntry {
  text: string | null;
  group: string | null;
  source: string | null;
}

export interface ExclusionWordEntry {
  text: string | null;
}

export interface WordCloudDataRequest {
  source: string | null;
  filter: string | null;
}

export interface TranscriptFilterRequest {
  source: string | null;
  agentId: string | null;
  teamId: number | null;
  channel: string | null;
  skill: string | null;
  intent: string | null;
  word: string | null;
  fromDateTime?: string | null;
  toDateTime?: string | null;
}

export interface WordUpsertRequest {
  word: string | null;
  group: string | null;
  source: string | null;
}

export interface WordDeleteRequest {
  word: string | null;
  source: string | null;
}

export interface ExclusionWordRequest {
  word: string | null;
}

export interface TranscriptData {
  sessionId: string | null;
  ucid?: string | null;
  transcriptUrl?: string | null;
  transcripts?: TranscriptLine[] | null;
  agentId: string | null;
  agentName: string | null;
  teamId: number;
  skill?: string | null;
  source: string | null;
  datetime: string | null;
  detectedWords: DetectedWord[] | null;
}

export interface TranscriptLine {
  speaker: string | null;
  transcript: string | null;
  datetime: string | null;
}

interface WordCloudDummyData {
  buckets?: string[];
  wordGroups?: string[];
  words?: WordEntry[];
  exclusionWords?: ExclusionWordEntry[];
  wordCloudData?: BucketWordCount[];
  filteredWordCloudData?: DetectedWord[];
  sessions?: TranscriptData[];
}

@Injectable({
  providedIn: 'root'
})
export class WordIntelligenceService {
  private apiBaseUrl = '';
  private configLoaded = false;
  private useMockData = false;
  private dummyData: WordCloudDummyData | null = null;
  private refreshIntervalMs = 5000;
  private readonly defaultApiBaseUrl = 'http://localhost:5000/api';
  private readonly dummyDataUrl = '/assets/config/app/dummydata.json';

  constructor(private http: HttpClient) {}

  async getDashboardRefreshInterval(): Promise<number> {
    await this.loadConfig();
    return this.refreshIntervalMs;
  }

  async getBucketList(): Promise<string[]> {
    await this.loadConfig();

    if (this.useMockData) {
      const dummyData = await this.loadDummyData();
      return dummyData.buckets || [];
    }

    try {
      const response = await this.http
        .post<string[]>(this.buildWordCloudUrl('/get-bucketlist'), {})
        .toPromise();

      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error loading word cloud buckets:', error);
      return [];
    }
  }

  async triggerProcessor(): Promise<ApiResponse | null> {
    await this.loadConfig();

    if (this.useMockData) {
      return {
        success: true,
        message: 'Dummy word cloud processor completed.'
      };
    }

    try {
      return await this.http
        .post<ApiResponse>(this.buildWordCloudUrl('/trigger-processor'), {})
        .toPromise() ?? null;
    } catch (error) {
      console.error('Error triggering word cloud processor:', error);
      return null;
    }
  }

  async getWordCloudData(payload: WordCloudDataRequest): Promise<BucketWordCount[]> {
    await this.loadConfig();

    if (this.useMockData) {
      const detectedWords = await this.getDummyDetectedWords({
        source: null,
        agentId: null,
        teamId: null,
        channel: null,
        skill: null,
        intent: payload.filter,
        word: null
      });

      return detectedWords.map((item) => ({
        word: item.word,
        count: item.count,
        isAgent: false,
        group: item.group
      }));
    }

    try {
      const response = await this.http
        .post<BucketWordCount[]>(this.buildWordCloudUrl('/get-data'), payload)
        .toPromise();

      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error loading word cloud data:', error);
      return [];
    }
  }

  async getFilteredWordCloudData(payload: TranscriptFilterRequest): Promise<DetectedWord[]> {
    await this.loadConfig();

    if (this.useMockData) {
      return this.getDummyDetectedWords(payload);
    }

    try {
      const response = await this.http
        .post<DetectedWord[]>(this.buildWordCloudUrl('/get-filtered-data'), payload)
        .toPromise();

      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error loading filtered word cloud data:', error);
      return [];
    }
  }

  async getSessions(payload: TranscriptFilterRequest): Promise<TranscriptData[]> {
    await this.loadConfig();

    if (this.useMockData) {
      return this.filterDummySessions(payload);
    }

    try {
      const response = await this.http
        .post<TranscriptData[]>(this.buildSessionsUrl(''), payload)
        .toPromise();

      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error loading sessions:', error);
      return [];
    }
  }

  async getSessionTranscripts(sessionId: string | null | undefined): Promise<TranscriptLine[]> {
    await this.loadConfig();

    const normalizedSessionId = (sessionId || '').trim();
    if (!normalizedSessionId) {
      return [];
    }

    if (this.useMockData) {
      const dummyData = await this.loadDummyData();
      const session = (dummyData.sessions || []).find((item) => item.sessionId === normalizedSessionId);
      return session?.transcripts || [];
    }

    const encodedId = encodeURIComponent(normalizedSessionId);

    try {
      const response = await this.http
        .post<TranscriptLine[]>(this.buildSentimentUrl(`/sessions/${encodedId}/timeline`), {})
        .toPromise();

      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error loading session transcripts:', error);
      return [];
    }
  }

  async getWords(): Promise<WordEntry[]> {
    await this.loadConfig();

    if (this.useMockData) {
      const dummyData = await this.loadDummyData();
      return dummyData.words || [];
    }

    try {
      const response = await this.http
        .post<WordEntry[]>(this.buildWordsUrl('/get-words'), {})
        .toPromise();

      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error loading words:', error);
      return [];
    }
  }

  async getWordGroups(): Promise<string[]> {
    await this.loadConfig();

    if (this.useMockData) {
      const dummyData = await this.loadDummyData();
      return dummyData.wordGroups || this.getUniqueValues((dummyData.words || []).map((word) => word.group));
    }

    try {
      const response = await this.http
        .post<string[]>(this.buildWordsUrl('/get-word-groups'), {})
        .toPromise();

      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error loading word groups:', error);
      return [];
    }
  }

  async addWord(payload: WordUpsertRequest): Promise<WordEntry | null> {
    await this.loadConfig();

    if (this.useMockData) {
      return {
        text: payload.word,
        group: payload.group,
        source: payload.source
      };
    }

    try {
      return await this.http
        .post<WordEntry>(this.buildWordsUrl('/add-word'), payload)
        .toPromise() ?? null;
    } catch (error) {
      console.error('Error adding word:', error);
      return null;
    }
  }

  async updateWordGroup(payload: WordUpsertRequest): Promise<WordEntry | null> {
    await this.loadConfig();

    if (this.useMockData) {
      return {
        text: payload.word,
        group: payload.group,
        source: payload.source
      };
    }

    try {
      return await this.http
        .post<WordEntry>(this.buildWordsUrl('/update-word-group'), payload)
        .toPromise() ?? null;
    } catch (error) {
      console.error('Error updating word group:', error);
      return null;
    }
  }

  async updateWordSource(payload: WordUpsertRequest): Promise<WordEntry | null> {
    await this.loadConfig();

    if (this.useMockData) {
      return {
        text: payload.word,
        group: payload.group,
        source: payload.source
      };
    }

    try {
      return await this.http
        .post<WordEntry>(this.buildWordsUrl('/update-word-soure'), payload)
        .toPromise() ?? null;
    } catch (error) {
      console.error('Error updating word source:', error);
      return null;
    }
  }

  async deleteWord(payload: WordDeleteRequest): Promise<ApiResponse | null> {
    await this.loadConfig();

    if (this.useMockData) {
      return {
        success: true,
        message: `Dummy word "${payload.word || 'word'}" deleted.`
      };
    }

    try {
      return await this.http
        .post<ApiResponse>(this.buildWordsUrl('/delete-word'), payload)
        .toPromise() ?? null;
    } catch (error) {
      console.error('Error deleting word:', error);
      return null;
    }
  }

  async getExclusionWords(): Promise<ExclusionWordEntry[]> {
    await this.loadConfig();

    if (this.useMockData) {
      const dummyData = await this.loadDummyData();
      return dummyData.exclusionWords || [];
    }

    try {
      const response = await this.http
        .post<ExclusionWordEntry[]>(this.buildWordsUrl('/get-exclusion-words'), {})
        .toPromise();

      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error loading exclusion words:', error);
      return [];
    }
  }

  async addExclusionWord(payload: ExclusionWordRequest): Promise<ExclusionWordEntry | null> {
    await this.loadConfig();

    if (this.useMockData) {
      return { text: payload.word };
    }

    try {
      return await this.http
        .post<ExclusionWordEntry>(this.buildWordsUrl('/add-exclusion-word'), payload)
        .toPromise() ?? null;
    } catch (error) {
      console.error('Error adding exclusion word:', error);
      return null;
    }
  }

  async deleteExclusionWord(payload: ExclusionWordRequest): Promise<ApiResponse | null> {
    await this.loadConfig();

    if (this.useMockData) {
      return {
        success: true,
        message: `Dummy exclusion word "${payload.word || 'word'}" deleted.`
      };
    }

    try {
      return await this.http
        .post<ApiResponse>(this.buildWordsUrl('/delete-exclusion-word'), payload)
        .toPromise() ?? null;
    } catch (error) {
      console.error('Error deleting exclusion word:', error);
      return null;
    }
  }

  private async loadConfig(): Promise<void> {
    if (this.configLoaded) {
      return;
    }

    try {
      const config = await this.http.get<any>('/assets/config/app/config.json').toPromise();
      this.apiBaseUrl = this.normalizeBaseUrl(config?.api?.baseUrl);
      this.useMockData = config?.wordCloud?.useDummy === true;
      this.refreshIntervalMs = this.getConfiguredRefreshInterval(config);
      this.configLoaded = true;
    } catch (error) {
      console.warn('Failed to load config from /assets/config/app/config.json, trying /config.json', error);
      try {
        const fallbackConfig = await this.http.get<any>('/config.json').toPromise();
        this.apiBaseUrl = this.normalizeBaseUrl(fallbackConfig?.api?.baseUrl);
        this.useMockData = fallbackConfig?.wordCloud?.useDummy === true;
        this.refreshIntervalMs = this.getConfiguredRefreshInterval(fallbackConfig);
      } catch (fallbackError) {
        console.error('Failed to load config.json, using default API URL', fallbackError);
        this.apiBaseUrl = this.defaultApiBaseUrl;
        this.useMockData = false;
      } finally {
        this.configLoaded = true;
      }
    }
  }

  private getConfiguredRefreshInterval(config: any): number {
    const wordCloudRefreshInterval = config?.wordCloud?.refreshInterval;

    return typeof wordCloudRefreshInterval === 'number' && wordCloudRefreshInterval >= 1000
      ? wordCloudRefreshInterval
      : 5000;
  }

  private async loadDummyData(): Promise<WordCloudDummyData> {
    if (this.dummyData) {
      return this.dummyData;
    }

    try {
      this.dummyData = await this.http.get<WordCloudDummyData>(this.dummyDataUrl).toPromise() ?? {};
    } catch (error) {
      console.error('Failed to load word cloud dummy data:', error);
      this.dummyData = {};
    }

    return this.dummyData;
  }

  private async getDummyDetectedWords(payload: TranscriptFilterRequest): Promise<DetectedWord[]> {
    const sessions = await this.filterDummySessions(payload);
    const wordSourceMap = await this.getDummyWordSourceMap();
    const sourceQuery = (payload.source || '').trim().toLowerCase();
    const wordQuery = (payload.word || '').trim().toLowerCase();
    const intentQuery = (payload.intent || '').trim().toLowerCase();
    const counts = new Map<string, DetectedWord>();

    sessions.forEach((session) => {
      const sessionWordKeys = new Set<string>();

      (session.detectedWords || []).forEach((detectedWord) => {
        const word = (detectedWord.word || '').trim();
        const group = (detectedWord.group || '').trim();
        const source = wordSourceMap.get(word.toLowerCase()) || '';

        if (!word) {
          return;
        }

        if (sourceQuery && source !== sourceQuery) {
          return;
        }

        if (wordQuery && word.toLowerCase() !== wordQuery) {
          return;
        }

        if (intentQuery && group.toLowerCase() !== intentQuery) {
          return;
        }

        const key = `${word.toLowerCase()}|${group.toLowerCase()}`;
        if (sessionWordKeys.has(key)) {
          return;
        }

        sessionWordKeys.add(key);
        const existing = counts.get(key);

        if (existing) {
          existing.count += 1;
        } else {
          counts.set(key, {
            word,
            group,
            count: 1
          });
        }
      });
    });

    return [...counts.values()];
  }

  private async filterDummySessions(payload: TranscriptFilterRequest): Promise<TranscriptData[]> {
    const dummyData = await this.loadDummyData();
    const sourceQuery = (payload.source || '').trim().toLowerCase();
    const agentIdQuery = (payload.agentId || '').trim().toLowerCase();
    const channelQuery = (payload.channel || '').trim().toLowerCase();
    const skillQuery = (payload.skill || '').trim().toLowerCase();
    const intentQuery = (payload.intent || '').trim().toLowerCase();
    const wordQuery = (payload.word || '').trim().toLowerCase();
    const wordSourceMap = await this.getDummyWordSourceMap();
    const fromTime = payload.fromDateTime ? new Date(payload.fromDateTime).getTime() : null;
    const toTime = payload.toDateTime ? new Date(payload.toDateTime).getTime() : null;

    return (dummyData.sessions || []).filter((session) => {
      const sessionTime = session.datetime ? new Date(session.datetime).getTime() : null;
      const matchesAgent = !agentIdQuery || (session.agentId || '').toLowerCase().includes(agentIdQuery);
      const matchesTeam = payload.teamId === null || session.teamId === payload.teamId;
      const matchesChannel = !channelQuery || (session.source || '').toLowerCase() === channelQuery;
      const matchesSkill = !skillQuery || (session.skill || '').toLowerCase().includes(skillQuery);
      const matchesFrom = fromTime === null || sessionTime === null || sessionTime >= fromTime;
      const matchesTo = toTime === null || sessionTime === null || sessionTime <= toTime;
      const matchesIntent = !intentQuery || (session.detectedWords || []).some((item) =>
        (item.group || '').toLowerCase() === intentQuery
      );
      const matchesWord = !wordQuery || (session.detectedWords || []).some((item) =>
        (item.word || '').toLowerCase() === wordQuery
      );
      const matchesSource = !sourceQuery || (session.detectedWords || []).some((item) =>
        wordSourceMap.get((item.word || '').toLowerCase()) === sourceQuery
      );

      return matchesAgent
        && matchesTeam
        && matchesChannel
        && matchesSkill
        && matchesFrom
        && matchesTo
        && matchesIntent
        && matchesWord
        && matchesSource;
    });
  }

  private async getDummyWordSourceMap(): Promise<Map<string, string>> {
    const dummyData = await this.loadDummyData();

    return new Map((dummyData.words || []).map((word) => [
      (word.text || '').trim().toLowerCase(),
      (word.source || '').trim().toLowerCase()
    ]));
  }

  private getUniqueValues(values: Array<string | null | undefined>): string[] {
    return [...new Set(values
      .map((value) => (value || '').trim())
      .filter(Boolean)
    )];
  }

  private normalizeBaseUrl(baseUrl?: string): string {
    const normalizedBaseUrl = (baseUrl || this.defaultApiBaseUrl).replace(/\/+$/, '');
    return normalizedBaseUrl.replace(/\/v1\/sentiment$/i, '');
  }

  private getApiUrl(): string {
    return this.apiBaseUrl || this.defaultApiBaseUrl;
  }

  private buildWordCloudUrl(path: string): string {
    return `${this.getApiUrl()}/v1/WordCloud${path}`;
  }

  private buildWordsUrl(path: string): string {
    return `${this.getApiUrl()}/v1/Words${path}`;
  }

  private buildSessionsUrl(path: string): string {
    return `${this.getApiUrl()}/v1/Sessions${path}`;
  }

  private buildSentimentUrl(path: string): string {
    return `${this.getApiUrl()}/v1/sentiment${path}`;
  }
}
