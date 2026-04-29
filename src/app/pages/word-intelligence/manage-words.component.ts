import { Component, OnInit } from '@angular/core';
import { WordEntry, WordIntelligenceService } from '../../services/word-intelligence.service';

interface EditableWord extends WordEntry {
  draftGroup: string;
  draftSource: string;
  saving?: boolean;
  deleting?: boolean;
}

@Component({
  selector: 'app-manage-words',
  templateUrl: './manage-words.component.html',
  styleUrls: ['./word-intelligence.component.css']
})
export class ManageWordsComponent implements OnInit {
  loading = false;
  groups: string[] = [];
  words: EditableWord[] = [];
  searchText = '';
  pageMessage = '';
  pageError = '';
  readonly sourceOptions = ['customer', 'agent'];

  addForm = {
    word: '',
    group: '',
    source: 'customer'
  };

  constructor(private wordIntelligenceService: WordIntelligenceService) {}

  ngOnInit(): void {
    void this.loadWords();
  }

  async loadWords(): Promise<void> {
    this.loading = true;
    this.pageError = '';

    try {
      await this.reloadWords();
    } catch (error) {
      console.error('Failed to load word dictionary:', error);
      this.pageError = 'Unable to load word dictionary.';
    } finally {
      this.loading = false;
    }
  }

  get filteredWordLibrary(): EditableWord[] {
    const query = this.searchText.trim().toLowerCase();

    return this.words.filter((word) => {
      return !query
        || (word.text || '').toLowerCase().includes(query)
        || (word.group || '').toLowerCase().includes(query)
        || (word.source || '').toLowerCase().includes(query);
    });
  }

  async addWord(): Promise<void> {
    const word = this.addForm.word.trim();
    if (!word || !this.addForm.group.trim() || !this.addForm.source.trim()) {
      this.pageError = 'Word, intent, and source are required before adding a new entry.';
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

  trackWord(index: number, word: EditableWord): string {
    return `${word.text || 'word'}-${word.source || index}`;
  }

  private async reloadWords(): Promise<void> {
    const [groups, words] = await Promise.all([
      this.wordIntelligenceService.getWordGroups(),
      this.wordIntelligenceService.getWords()
    ]);

    this.groups = groups;
    this.words = words.map((word) => this.toEditableWord(word));

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

}
