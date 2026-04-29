import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  DetectedWord,
  TranscriptLine,
  TranscriptData,
  WordEntry,
  WordIntelligenceService
} from '../../services/word-intelligence.service';

interface EditableWord extends WordEntry {
  draftGroup: string;
  draftSource: string;
  saving?: boolean;
  deleting?: boolean;
}

interface TrendingGroup {
  key: string;
  label: string;
}

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
  buckets: string[] = [];
  groups: string[] = [];
  words: EditableWord[] = [];
  filteredWords: DetectedWord[] = [];
  availableSessions: TranscriptData[] = [];
  topicSessions: TranscriptRow[] = [];
  filteredWordCount = 0;
  selectedBucket = '';
  selectedGroup = '';
  selectedTopicWord = '';
  searchText = '';
  pageMessage = '';
  pageError = '';
  readonly sourceOptions = ['customer', 'agent'];
  selectedExcelLevelOne = '';
  selectedExcelIntent = '';
  private refreshIntervalMs = 5000;
  private autoRefreshHandle: ReturnType<typeof setInterval> | null = null;

  addForm = {
    word: '',
    group: '',
    source: 'customer'
  };

  cloudFilters = {
    source: '',
    agentId: '',
    teamId: '',
    channel: '',
    skill: '',
    intent: '',
    word: '',
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
      const [buckets, groups, words] = await Promise.all([
        this.wordIntelligenceService.getBucketList(),
        this.wordIntelligenceService.getWordGroups(),
        this.wordIntelligenceService.getWords()
      ]);

      this.buckets = buckets;
      this.groups = groups;
      this.words = words.map((word) => this.toEditableWord(word));
      await this.loadAvailableSessions();
      this.syncExcelSelection();

      if (!this.selectedBucket) {
        this.selectedBucket = this.buckets[0] || '';
      }

      if (!this.addForm.group && this.groups.length) {
        this.addForm.group = this.groups[0];
      }

      await this.refreshFilteredData();
    } catch (error) {
      console.error('Failed to load word intelligence dashboard:', error);
      this.pageError = 'Unable to load word intelligence data.';
    } finally {
      this.loading = false;
    }
  }

  private async loadAvailableSessions(): Promise<void> {
    this.availableSessions = await this.wordIntelligenceService.getSessions({
      source: null,
      agentId: null,
      teamId: null,
      channel: null,
      skill: null,
      intent: null,
      word: null,
      fromDateTime: null,
      toDateTime: null
    });
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
      agentId: this.cloudFilters.agentId || null,
      teamId: this.cloudFilters.teamId ? Number(this.cloudFilters.teamId) : null,
      channel: null,
      skill: this.cloudFilters.skill || null,
      intent: this.cloudFilters.intent || null,
      word: this.cloudFilters.word || null,
      fromDateTime: this.toApiDateTime(this.cloudFilters.fromDateTime),
      toDateTime: this.toApiDateTime(this.cloudFilters.toDateTime)
    });

    this.filteredWords = response;
    this.filteredWordCount = response.reduce((sum, item) => sum + (item.count || 0), 0);

    if (this.selectedTopicWord) {
      const selectedStillVisible = response.some((item) => (item.word || '') === this.selectedTopicWord);
      if (selectedStillVisible) {
        await this.loadSessionsForWord(this.selectedTopicWord);
      } else {
        this.selectedTopicWord = '';
        this.topicSessions = [];
      }
    }
  }

  selectTrendingGroup(group: string): void {
    this.selectedGroup = group;
  }

  selectExcelLevelOne(group: string): void {
    this.selectedExcelLevelOne = group;
    this.selectedExcelIntent = this.filteredExcelIntents[0]?.key || '';
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

  async applyExcelFilters(): Promise<void> {
    this.syncExcelSelection();
    await this.refreshFilteredData();
    await this.loadSessionsForSearchKeyword();
  }

  clearExcelFilters(): void {
    this.searchText = '';
    this.cloudFilters.source = '';
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

  async addWord(): Promise<void> {
    const word = this.addForm.word.trim();
    if (!word || !this.addForm.group.trim() || !this.addForm.source.trim()) {
      this.pageError = 'Word, group, and source are required before adding a new entry.';
      return;
    }

    this.pageError = '';
    const created = await this.wordIntelligenceService.addWord({
      word,
      group: this.addForm.group.trim(),
      source: this.addForm.source.trim()
    });

    if (!created) {
      this.pageError = 'Unable to add the word right now.';
      return;
    }

    this.pageMessage = `Added "${word}" to ${this.addForm.group.trim()}.`;
    this.addForm.word = '';
    await this.reloadWords();
  }

  async saveWord(word: EditableWord): Promise<void> {
    word.saving = true;
    this.pageError = '';

    try {
      const payload = {
        word: word.text,
        group: word.draftGroup,
        source: word.draftSource
      };

      if (word.group !== word.draftGroup) {
        await this.wordIntelligenceService.updateWordGroup(payload);
      }

      if (word.source !== word.draftSource) {
        await this.wordIntelligenceService.updateWordSource(payload);
      }

      this.pageMessage = `Saved updates for "${word.text || 'word'}".`;
      await this.reloadWords();
    } finally {
      word.saving = false;
    }
  }

  async deleteWord(word: EditableWord): Promise<void> {
    word.deleting = true;
    this.pageError = '';

    try {
      const response = await this.wordIntelligenceService.deleteWord({
        word: word.text,
        source: word.source
      });

      if (!response?.success) {
        this.pageError = response?.message || `Unable to delete "${word.text || 'word'}".`;
        return;
      }

      this.pageMessage = response.message || `Deleted "${word.text || 'word'}".`;
      await this.reloadWords();
    } finally {
      word.deleting = false;
    }
  }

  async loadSessionsForWord(word: string | null | undefined): Promise<void> {
    const normalizedWord = (word || '').trim();
    if (!normalizedWord) {
      this.selectedTopicWord = '';
      this.topicSessions = [];
      return;
    }

    this.selectedTopicWord = normalizedWord;
    this.sessionLoading = true;

    try {
      const sessions = await this.wordIntelligenceService.getSessions({
        source: this.cloudFilters.source || null,
        agentId: this.cloudFilters.agentId || null,
        teamId: this.cloudFilters.teamId ? Number(this.cloudFilters.teamId) : null,
        channel: null,
        skill: this.cloudFilters.skill || null,
        intent: this.cloudFilters.intent || null,
        word: null,
        fromDateTime: this.toApiDateTime(this.cloudFilters.fromDateTime),
        toDateTime: this.toApiDateTime(this.cloudFilters.toDateTime)
      });

      this.topicSessions = await this.filterSessionsByTranscriptKeyword(sessions, normalizedWord);
    } finally {
      this.sessionLoading = false;
    }
  }

  get filteredWordLibrary(): EditableWord[] {
    const query = this.searchText.trim().toLowerCase();

    return this.words.filter((word) => {
      const matchesQuery = !query
        || (word.text || '').toLowerCase().includes(query)
        || (word.group || '').toLowerCase().includes(query)
        || (word.source || '').toLowerCase().includes(query);

      return matchesQuery;
    });
  }

  get totalTrackedWords(): number {
    return this.words.length;
  }

  get totalCloudMentions(): number {
    return this.filteredWords.reduce((sum, item) => sum + (item.count || 0), 0);
  }

  get dominantGroupLabel(): string {
    if (!this.filteredWords.length) {
      return 'No cloud data';
    }

    const groupCounts = this.filteredWords.reduce<Record<string, number>>((accumulator, item) => {
      const key = item.group || 'ungrouped';
      accumulator[key] = (accumulator[key] || 0) + (item.count || 0);
      return accumulator;
    }, {});

    return Object.entries(groupCounts)
      .sort((left, right) => right[1] - left[1])[0]?.[0] || 'No cloud data';
  }

  get trendingTopics(): DetectedWord[] {
    return [...this.filteredWords]
      .filter((item) => !this.selectedGroup || (item.group || '').toLowerCase() === this.selectedGroup.toLowerCase())
      .sort((left, right) => (right.count || 0) - (left.count || 0));
  }

  get trendingGroups(): TrendingGroup[] {
    return [
      { key: '', label: 'All Topics' },
      ...this.groups.map((group) => ({
        key: group,
        label: this.toTitleCase(group)
      }))
    ];
  }

  getTopicChipClass(index: number): string {
    const classes = [
      'topic-chip--blue',
      'topic-chip--green',
      'topic-chip--purple',
      'topic-chip--indigo',
      'topic-chip--violet'
    ];

    return classes[index % classes.length];
  }

  get activeTrendingGroupLabel(): string {
    if (!this.selectedGroup) {
      return 'All Topics';
    }

    return this.toTitleCase(this.selectedGroup);
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

  skillHasCount(skill: string): boolean {
    const normalizedSkill = skill.trim().toLowerCase();

    return this.availableSessions.some((session) =>
      (session.skill || '').trim().toLowerCase() === normalizedSkill
      && (session.detectedWords || []).some((detectedWord) => this.getKeywordSessionCount(detectedWord.word || '') > 0)
    );
  }

  get filteredExcelIntents(): ExcelIntentSample[] {
    return this.getExcelIntentsForLevelOne(this.selectedExcelLevelOne);
  }

  get selectedExcelSample(): ExcelIntentSample | undefined {
    return this.filteredExcelIntents.find((item) => item.key === this.selectedExcelIntent)
      ?? this.filteredExcelIntents[0];
  }

  get visibleKeywordChips(): string[] {
    if (this.selectedExcelIntent) {
      return this.selectedExcelSample ? this.getExcelKeywordChips(this.selectedExcelSample) : [];
    }

    return [];
  }

  get selectedExcelSkillPreview(): string {
    return this.selectedExcelSample?.phrases.join(', ') || 'No backend words mapped';
  }

  getExcelSkillPreview(intent: ExcelIntentSample): string {
    return intent.phrases.length ? intent.phrases.join(', ') : 'No backend words mapped';
  }

  getExcelIntentPhraseCount(intent: ExcelIntentSample): number {
    return intent.phrases.length;
  }

  getExcelKeywordChips(intent: ExcelIntentSample): string[] {
    return intent.phrases;
  }

  get excelLevelOneGroups(): string[] {
    return this.getUniqueValues(this.words.map((word) => this.getGroupLevels(word.group).firstLevel));
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

  getLevelOneIcon(group: string): string {
    const icons = ['#', '@', '$', '%', '&', '+', '*', '~'];
    return icons[this.getStableIndex(group, icons.length)];
  }

  getLevelOneIconClass(group: string): string {
    return `product-card__icon--${this.getStableIndex(group, 8)}`;
  }

  isSelectedTopic(word: string | null | undefined): boolean {
    return (word || '') === this.selectedTopicWord;
  }

  trackWord(index: number, word: EditableWord): string {
    return `${word.text || 'word'}-${word.source || index}`;
  }

  getSessionDetectedWords(session: TranscriptData): string {
    return (session.detectedWords || [])
      .map((item) => `${item.word || 'Unknown'} (${item.count})`)
      .join(', ');
  }

  getTranscriptLink(session: TranscriptData): string {
    return session.transcriptUrl || (session.sessionId ? `/transcripts/${encodeURIComponent(session.sessionId)}` : '');
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

  private async reloadWords(): Promise<void> {
    const [groups, words] = await Promise.all([
      this.wordIntelligenceService.getWordGroups(),
      this.wordIntelligenceService.getWords()
    ]);

    this.groups = groups;
    this.words = words.map((word) => this.toEditableWord(word));
    this.syncExcelSelection();

    if (!this.addForm.group && this.groups.length) {
      this.addForm.group = this.groups[0];
    }
  }

  private toEditableWord(word: WordEntry): EditableWord {
    return {
      ...word,
      draftGroup: word.group || '',
      draftSource: word.source || 'customer'
    };
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
      this.selectedExcelIntent = intents[0]?.key || '';
    }
  }

  private async loadSessionsForSearchKeyword(): Promise<void> {
    const query = this.searchText.trim();

    if (!query) {
      return;
    }

    const matchingKeyword = this.getUniqueValues(this.words.map((word) => word.text)).find((keyword) => {
      const normalizedKeyword = keyword.toLowerCase();
      const normalizedQuery = query.toLowerCase();

      return normalizedKeyword === normalizedQuery || normalizedKeyword.includes(normalizedQuery);
    });

    await this.loadAllSessionsForKeyword(matchingKeyword || query);
  }

  private async loadAllSessionsForKeyword(keyword: string): Promise<void> {
    const normalizedKeyword = keyword.trim();

    if (!normalizedKeyword) {
      return;
    }

    this.selectedTopicWord = normalizedKeyword;
    this.sessionLoading = true;

    try {
      const sessions = await this.wordIntelligenceService.getSessions({
        source: null,
        agentId: null,
        teamId: null,
        channel: null,
        skill: null,
        intent: null,
        word: null,
        fromDateTime: null,
        toDateTime: null
      });

      this.topicSessions = await this.filterSessionsByTranscriptKeyword(sessions, normalizedKeyword);
    } finally {
      this.sessionLoading = false;
    }
  }

  private get filteredExcelWords(): EditableWord[] {
    const query = this.searchText.trim().toLowerCase();
    const selectedSource = this.cloudFilters.source.trim().toLowerCase();

    return this.words.filter((word) => {
      const group = word.group || '';
      const text = word.text || '';
      const source = word.source || '';
      const levels = this.getGroupLevels(group);
      const matchesSource = !selectedSource || source.toLowerCase() === selectedSource;
      const matchesQuery = !query
        || text.toLowerCase().includes(query)
        || group.toLowerCase().includes(query)
        || levels.firstLevel.toLowerCase().includes(query)
        || levels.secondLevel.toLowerCase().includes(query);

      return matchesSource && matchesQuery;
    });
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

  private toTitleCase(value: string): string {
    return value
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}

