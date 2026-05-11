import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  DetectedWord,
  TranscriptLine,
  TranscriptData,
  WordEntry,
  WordIntelligenceService
} from '../../services/word-intelligence.service';

interface ExcelIntentSample {
  key: string;
  firstLevel: string;
  intent: string;
  phrases: string[];
}

interface TranscriptRow extends TranscriptData {
  transcriptLoading?: boolean;
  transcriptExpanded?: boolean;
  transcriptLines?: TranscriptLine[];
  monitorActionLoading?: boolean;
}

@Component({
  selector: 'app-word-intelligence',
  templateUrl: './word-intelligence.component.html',
  styleUrls: ['./word-intelligence.component.css']
})
export class WordIntelligenceComponent implements OnInit, OnDestroy {
  loading = false;
  processorLoading = false;
  sessionLoading = false;
  groups: string[] = [];
  words: WordEntry[] = [];
  filteredWords: DetectedWord[] = [];
  availableSessions: TranscriptData[] = [];
  topicSessions: TranscriptRow[] = [];
  filteredWordCount = 0;
  selectedTopicWord = '';
  searchText = '';
  transcriptSearchText = '';
  pageMessage = '';
  pageError = '';
  readonly sourceOptions = ['customer', 'agent'];
  selectedExcelLevelOne = '';
  selectedExcelIntent = '';
  private refreshIntervalMs = 5000;
  private autoRefreshHandle: ReturnType<typeof setInterval> | null = null;

  cloudFilters = {
    source: '',
    department: '',
    direction: '',
    agentId: '',
    teamId: '',
    skill: '',
    fromDateTime: '',
    toDateTime: ''
  };

  constructor(private wordIntelligenceService: WordIntelligenceService) {}

  ngOnInit(): void {
    void this.initializeDashboard();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  async loadDashboard(clearMessages = true): Promise<void> {
    this.loading = true;
    this.pageError = '';

    if (clearMessages) {
      this.pageMessage = '';
    }

    try {
      const [groups, words] = await Promise.all([
        this.wordIntelligenceService.getWordGroups(),
        this.wordIntelligenceService.getWords()
      ]);

      this.groups = groups;
      this.words = words;
      this.syncExcelSelection();

      await this.refreshFilteredData();
    } catch (error) {
      console.error('Failed to load word intelligence dashboard:', error);
      this.pageError = 'Unable to load word intelligence data.';
    } finally {
      this.loading = false;
    }
  }

  private async initializeDashboard(): Promise<void> {
    await this.loadDashboard();
    this.refreshIntervalMs = await this.wordIntelligenceService.getDashboardRefreshInterval();
    this.startAutoRefresh();
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();

    if (this.refreshIntervalMs <= 0) {
      return;
    }

    this.autoRefreshHandle = setInterval(() => {
      if (!this.loading && !this.processorLoading) {
        void this.loadDashboard(false);
      }
    }, this.refreshIntervalMs);
  }

  private stopAutoRefresh(): void {
    if (this.autoRefreshHandle !== null) {
      clearInterval(this.autoRefreshHandle);
      this.autoRefreshHandle = null;
    }
  }

  async refreshFilteredData(): Promise<void> {
    const response = await this.wordIntelligenceService.getFilteredWordCloudData({
      source: this.cloudFilters.source || null,
      department: this.cloudFilters.department || null,
      direction: this.cloudFilters.direction || null,
      agentId: this.cloudFilters.agentId || null,
      teamId: this.cloudFilters.teamId ? Number(this.cloudFilters.teamId) : null,
      channel: null,
      skill: this.cloudFilters.skill || null,
      intent: null,
      word: null,
      fromDateTime: this.toApiDateTime(this.cloudFilters.fromDateTime),
      toDateTime: this.toApiDateTime(this.cloudFilters.toDateTime)
    });

    this.filteredWords = response;
    this.filteredWordCount = response.reduce((sum, item) => sum + (item.count || 0), 0);

    if (this.selectedTopicWord) {
      const selectedTopicKey = this.normalizeKeyword(this.selectedTopicWord);
      const selectedStillVisible = response.some((item) => this.normalizeKeyword(item.word || '') === selectedTopicKey);
      if (selectedStillVisible) {
        await this.loadSessionsForWord(this.selectedTopicWord);
      } else {
        this.selectedTopicWord = '';
        this.topicSessions = [];
      }
    }
  }

  selectExcelLevelOne(group: string): void {
    this.selectedExcelLevelOne = group;
    this.selectedExcelIntent = '';
    this.selectedTopicWord = '';
    this.topicSessions = [];
  }

  closeSessionDetail(): void {
    this.selectedTopicWord = '';
    this.topicSessions = [];
  }

  selectAllExcelLevelOne(): void {
    this.selectedExcelLevelOne = '';
    this.selectedExcelIntent = '';
    this.selectedTopicWord = '';
    this.topicSessions = [];
  }

  selectExcelIntent(intent: string): void {
    this.selectedExcelIntent = intent;
    this.selectedTopicWord = '';
    this.topicSessions = [];
  }

  selectAllExcelIntents(): void {
    this.selectedExcelIntent = '';
    this.selectedTopicWord = '';
    this.topicSessions = [];
  }

  selectAllKeywords(): void {
    this.selectedTopicWord = '';
    this.topicSessions = [];
  }

  async applyExcelFilters(): Promise<void> {
    this.syncExcelSelection();
    await this.refreshFilteredData();
  }

  clearExcelFilters(): void {
    this.searchText = '';
    this.cloudFilters.source = '';
    this.cloudFilters.department = '';
    this.cloudFilters.direction = '';
    this.cloudFilters.agentId = '';
    this.cloudFilters.teamId = '';
    this.cloudFilters.skill = '';
    this.cloudFilters.fromDateTime = '';
    this.cloudFilters.toDateTime = '';
    this.syncExcelSelection();
    void this.refreshFilteredData();
  }

  async triggerProcessor(): Promise<void> {
    this.processorLoading = true;
    this.pageError = '';
    this.pageMessage = '';

    try {
      const response = await this.wordIntelligenceService.triggerProcessor();
      this.pageMessage = response?.message || 'Word cloud processor triggered successfully.';
      await this.refreshFilteredData();
    } catch (error) {
      console.error('Failed to trigger processor:', error);
      this.pageError = 'Unable to trigger the word cloud processor.';
    } finally {
      this.processorLoading = false;
    }
  }

  async loadSessionsForWord(word: string | null | undefined): Promise<void> {
    const normalizedWord = (word || '').trim();
    if (!normalizedWord) {
      this.selectedTopicWord = '';
      this.topicSessions = [];
      return;
    }

    this.sessionLoading = true;
    this.pageMessage = '';

    try {
      const sessions = await this.wordIntelligenceService.getSessions({
        source: this.cloudFilters.source || null,
        department: this.cloudFilters.department || null,
        direction: this.cloudFilters.direction || null,
        agentId: this.cloudFilters.agentId || null,
        teamId: this.cloudFilters.teamId ? Number(this.cloudFilters.teamId) : null,
        channel: null,
        skill: this.cloudFilters.skill || null,
        intent: null,
        word: normalizedWord,
        fromDateTime: this.toApiDateTime(this.cloudFilters.fromDateTime),
        toDateTime: this.toApiDateTime(this.cloudFilters.toDateTime)
      });

      this.availableSessions = sessions;
      const filtered = await this.filterSessionsByTranscriptKeyword(sessions, normalizedWord);
      
      if (filtered.length > 0) {
        this.selectedTopicWord = normalizedWord;
        this.topicSessions = filtered;
        this.upsertDisplayedKeywordCount(normalizedWord, filtered.length);
      } else {
        this.closeSessionDetail();
        this.pageMessage = `No conversations found for "${normalizedWord}".`;
        setTimeout(() => {
          if (this.pageMessage.includes(normalizedWord)) {
            this.pageMessage = '';
          }
        }, 4000);
      }
    } catch (e) {
      this.pageError = 'Unable to load sessions.';
    } finally {
      this.sessionLoading = false;
    }
  }

  get teamIdOptions(): string[] {
    return this.getUniqueValues(this.availableSessions.map((session) =>
      session.teamId === null || session.teamId === undefined ? '' : String(session.teamId)
    )).sort((left, right) => Number(left) - Number(right));
  }

  get agentIdOptions(): string[] {
    return this.getUniqueValues(this.availableSessions.map((session) => session.agentId)).sort();
  }

  get skillOptions(): string[] {
    return this.getUniqueValues(this.availableSessions.map((session) => session.skill)).sort();
  }

  get departmentOptions(): string[] {
    const selectedSource = this.cloudFilters.source.trim().toLowerCase();
    const query = this.searchText.trim().toLowerCase();

    return this.getUniqueValues(
      this.words
        .filter((word) => {
          const source = word.source || '';
          const group = word.group || '';
          const text = word.text || '';
          const levels = this.getGroupLevels(group);
          const matchesSource = !selectedSource || source.toLowerCase() === selectedSource;
          const matchesQuery = !query
            || text.toLowerCase().includes(query)
            || group.toLowerCase().includes(query)
            || levels.firstLevel.toLowerCase().includes(query)
            || levels.secondLevel.toLowerCase().includes(query);

          return matchesSource && matchesQuery;
        })
        .map((word) => this.getGroupLevels(word.group).firstLevel)
    ).sort();
  }

  get directionOptions(): string[] {
    return this.getUniqueValues(this.availableSessions.map((session) => session.direction)).sort();
  }

  get minSessionDateTime(): string | null {
    return this.getSessionDateTimeLimit('min');
  }

  get maxSessionDateTime(): string | null {
    return this.getSessionDateTimeLimit('max');
  }

  skillHasCount(skill: string): boolean {
    const normalizedSkill = skill.trim().toLowerCase();

    return this.availableSessions.some((session) =>
      (session.skill || '').trim().toLowerCase() === normalizedSkill
      && (session.detectedWords || []).some((detectedWord) => this.getKeywordSessionCount(detectedWord.word || '') > 0)
    );
  }

  get filteredExcelIntents(): ExcelIntentSample[] {
    const intents = this.getExcelIntentsForLevelOne(this.selectedExcelLevelOne);

    if (this.selectedExcelLevelOne) {
      return intents;
    }

    return intents.filter((intent) => this.getExcelIntentTotalCount(intent) > 0);
  }

  get selectedExcelSample(): ExcelIntentSample | undefined {
    if (!this.selectedExcelIntent) return undefined;
    return this.filteredExcelIntents.find((item) => item.key === this.selectedExcelIntent);
  }

  get visibleKeywordChips(): string[] {
    if (this.selectedExcelIntent && this.selectedExcelSample) {
      return this.getExcelKeywordChips(this.selectedExcelSample)
        .sort((a, b) => this.sortKeywordsByCountThenName(a, b));
    }

    const allVisiblePhrases = this.filteredExcelIntents.flatMap(intent => intent.phrases);
    return this.getUniqueValues(allVisiblePhrases)
      .filter((keyword) => this.getKeywordSessionCount(keyword) >= 1)
      .sort((a, b) => this.sortKeywordsByCountThenName(a, b));
  }

  get topKeywordChips(): string[] {
    const allKeywords = this.getUniqueValues(this.filteredExcelWords.map((word) => word.text));
    return allKeywords
      .sort((left, right) => this.getKeywordSessionCount(right) - this.getKeywordSessionCount(left))
      .slice(0, 5);
  }

  getExcelKeywordChips(intent: ExcelIntentSample): string[] {
    return intent.phrases;
  }

  get filteredExcelLevelOneGroups(): string[] {
    return this.getUniqueValues(this.filteredExcelWords.map((word) => this.getGroupLevels(word.group).firstLevel));
  }

  getExcelLevelOneIntentCount(group: string): number {
    return this.getUniqueValues(
      this.filteredExcelWords
        .filter((item) => this.getGroupLevels(item.group).firstLevel === group)
        .map((item) => item.group)
    ).length;
  }

  getExcelLevelOneWordCount(group: string): number {
    return this.getUniqueValues(
      this.filteredExcelWords
        .filter((item) => this.getGroupLevels(item.group).firstLevel === group)
        .map((item) => item.text)
    ).length;
  }

  getExcelLevelOneTotalCount(group: string): number {
    return this.getExcelIntentsForLevelOne(group)
      .reduce((sum, item) => sum + this.getExcelIntentTotalCount(item), 0);
  }

  getAllIntentTotalCount(): number {
    return this.filteredExcelLevelOneGroups.reduce((sum, group) => sum + this.getExcelLevelOneTotalCount(group), 0);
  }

  getAllSubintentTotalCount(): number {
    return this.filteredExcelIntents.reduce((sum, intent) => sum + this.getExcelIntentTotalCount(intent), 0);
  }

  getAllKeywordsTotalCount(): number {
    return this.visibleKeywordChips.reduce((sum, keyword) => sum + this.getKeywordSessionCount(keyword), 0);
  }

  getExcelIntentTotalCount(intent: ExcelIntentSample): number {
    return intent.phrases.reduce((sum, phrase) => sum + this.getKeywordSessionCount(phrase), 0);
  }

  getKeywordSessionCount(keyword: string): number {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return 0;
    }

    return this.filteredWords
      .filter((item) => (item.word || '').trim().toLowerCase() === normalizedKeyword)
      .reduce((sum, item) => sum + (item.count || 0), 0);
  }

  getLevelOneInitial(group: string): string {
    return (group || '?').trim().charAt(0).toUpperCase() || '?';
  }

  getLevelOneIconClass(group: string): string {
    return `product-card__icon--${this.getStableIndex(group, 8)}`;
  }

  isSelectedTopic(word: string | null | undefined): boolean {
    return (word || '') === this.selectedTopicWord;
  }

  async toggleTranscript(session: TranscriptRow): Promise<void> {
    session.transcriptExpanded = !session.transcriptExpanded;

    if (!session.transcriptExpanded || session.transcriptLines !== undefined) {
      return;
    }

    session.transcriptLoading = true;

    try {
      session.transcriptLines = await this.wordIntelligenceService.getSessionTranscripts(session.sessionId);
    } finally {
      session.transcriptLoading = false;
    }
  }

  private async filterSessionsByTranscriptKeyword(
    sessions: TranscriptData[],
    keyword: string
  ): Promise<TranscriptRow[]> {
    const normalizedKeyword = keyword.trim().toLowerCase();

    const checks: Array<TranscriptRow | null> = await Promise.all(sessions.map(async (session) => {
      const transcripts = await this.wordIntelligenceService.getSessionTranscripts(session.sessionId);
      return this.transcriptsIncludeKeyword(transcripts, normalizedKeyword)
        ? {
          ...session,
          transcriptLines: transcripts
        }
        : null;
    }));

    return checks.filter((session): session is TranscriptRow => session !== null);
  }

  private transcriptsIncludeKeyword(transcripts: TranscriptLine[], normalizedKeyword: string): boolean {
    if (!normalizedKeyword) {
      return false;
    }

    return transcripts.some((item) =>
      (item.transcript || '').toLowerCase().includes(normalizedKeyword)
    );
  }

  highlightKeyword(text: string, keyword: string | undefined): string {
    if (!text) return '';
    if (!keyword) return text;
    
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedKeyword})`, 'gi');
    return text.replace(regex, '<mark class="highlight-mark">$1</mark>');
  }


  private syncExcelSelection(): void {
    const levelOneGroups = this.filteredExcelLevelOneGroups;

    if (!levelOneGroups.length) {
      this.selectedExcelLevelOne = '';
      this.selectedExcelIntent = '';
      return;
    }

    if (this.selectedExcelLevelOne && !levelOneGroups.includes(this.selectedExcelLevelOne)) {
      this.selectedExcelLevelOne = levelOneGroups[0];
    }

    const intents = this.filteredExcelIntents;

    if (this.selectedExcelLevelOne && !intents.length) {
      this.selectedExcelIntent = '';
      return;
    }

    if (this.selectedExcelIntent && !intents.some((item) => item.key === this.selectedExcelIntent)) {
      this.selectedExcelIntent = '';
    }
  }

  async searchTranscripts(): Promise<void> {
    const query = this.transcriptSearchText.trim();

    if (!query) {
      return;
    }

    await this.loadAllSessionsForKeyword(query);
  }

  private async loadAllSessionsForKeyword(keyword: string): Promise<void> {
    const normalizedKeyword = keyword.trim();

    if (!normalizedKeyword) {
      return;
    }

    this.sessionLoading = true;
    this.pageMessage = '';

    try {
      const sessions = await this.wordIntelligenceService.getSessions({
        source: this.cloudFilters.source || null,
        department: this.cloudFilters.department || null,
        direction: this.cloudFilters.direction || null,
        agentId: this.cloudFilters.agentId || null,
        teamId: this.cloudFilters.teamId ? Number(this.cloudFilters.teamId) : null,
        channel: null,
        skill: this.cloudFilters.skill || null,
        intent: null,
        word: null,
        fromDateTime: this.toApiDateTime(this.cloudFilters.fromDateTime),
        toDateTime: this.toApiDateTime(this.cloudFilters.toDateTime)
      });

      this.availableSessions = sessions;
      const filtered = await this.filterSessionsByTranscriptKeyword(sessions, normalizedKeyword);
      
      if (filtered.length > 0) {
        this.selectedTopicWord = normalizedKeyword;
        this.topicSessions = filtered;
        this.upsertDisplayedKeywordCount(normalizedKeyword, filtered.length);
      } else {
        this.closeSessionDetail();
        this.pageMessage = `No conversations found for "${normalizedKeyword}".`;
        setTimeout(() => {
          if (this.pageMessage.includes(normalizedKeyword)) {
            this.pageMessage = '';
          }
        }, 4000);
      }
    } catch (e) {
      this.pageError = 'Unable to load sessions.';
    } finally {
      this.sessionLoading = false;
    }
  }

  private get filteredExcelWords(): WordEntry[] {
    const query = this.searchText.trim().toLowerCase();
    const selectedSource = this.cloudFilters.source.trim().toLowerCase();
    const selectedDepartment = this.cloudFilters.department.trim().toLowerCase();

    return this.words.filter((word) => {
      const group = word.group || '';
      const text = word.text || '';
      const source = word.source || '';
      const levels = this.getGroupLevels(group);
      const matchesSource = !selectedSource || source.toLowerCase() === selectedSource;
      const matchesDepartment = !selectedDepartment || levels.firstLevel.toLowerCase() === selectedDepartment;
      const matchesQuery = !query
        || text.toLowerCase().includes(query)
        || group.toLowerCase().includes(query)
        || levels.firstLevel.toLowerCase().includes(query)
        || levels.secondLevel.toLowerCase().includes(query);

      return matchesSource && matchesDepartment && matchesQuery;
    });
  }

  private upsertDisplayedKeywordCount(keyword: string, count: number): void {
    const keywordKey = this.normalizeKeyword(keyword);
    if (!keywordKey) {
      return;
    }

    const existingWord = this.filteredWords.find((word) => this.normalizeKeyword(word.word || '') === keywordKey);
    if (existingWord) {
      existingWord.count = Math.max(existingWord.count || 0, count);
      return;
    }

    this.filteredWords.push({ word: keyword, count, group: null });
  }

  private normalizeKeyword(keyword: string): string {
    return keyword.trim().toLowerCase();
  }

  private sortKeywordsByCountThenName(left: string, right: string): number {
    const countDifference = this.getKeywordSessionCount(right) - this.getKeywordSessionCount(left);
    return countDifference || left.localeCompare(right);
  }

  private getExcelIntentsForLevelOne(group: string): ExcelIntentSample[] {
    return this.getUniqueValues(
      this.filteredExcelWords
        .filter((item) => !group || this.getGroupLevels(item.group).firstLevel === group)
        .map((item) => item.group)
    )
      .map((intentGroup) => ({
      key: intentGroup,
      firstLevel: this.getGroupLevels(intentGroup).firstLevel,
      intent: this.getGroupLevels(intentGroup).secondLevel,
      phrases: this.getUniqueValues(
        this.filteredExcelWords
          .filter((item) => (item.group || '') === intentGroup)
          .map((item) => item.text)
      )
    }));
  }

  private getGroupLevels(group: string | null | undefined): { firstLevel: string; secondLevel: string } {
    const [firstLevel, ...rest] = (group || '')
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean);
    const secondLevel = rest.join(' / ') || firstLevel || '';

    return {
      firstLevel: firstLevel || '',
      secondLevel
    };
  }

  private toApiDateTime(value: string): string | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  private getSessionDateTimeLimit(mode: 'min' | 'max'): string | null {
    const times = this.availableSessions
      .map((session) => session.datetime ? new Date(session.datetime).getTime() : NaN)
      .filter((time) => !Number.isNaN(time));

    if (!times.length) {
      return null;
    }

    const limit = mode === 'min' ? Math.min(...times) : Math.max(...times);
    return this.toDateTimeLocalValue(new Date(limit));
  }

  private toDateTimeLocalValue(date: Date): string {
    const pad = (value: number): string => String(value).padStart(2, '0');

    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private getStableIndex(value: string, length: number): number {
    const total = value
      .split('')
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);

    return total % length;
  }

  private getUniqueValues(values: Array<string | null | undefined>): string[] {
    return [...new Set(values
      .map((value) => (value || '').trim())
      .filter(Boolean)
    )];
  }
}
