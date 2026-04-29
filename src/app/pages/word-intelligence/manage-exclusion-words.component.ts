import { Component, OnInit } from '@angular/core';
import {
  ExclusionWordEntry,
  WordIntelligenceService
} from '../../services/word-intelligence.service';

interface EditableExclusionWord extends ExclusionWordEntry {
  deleting?: boolean;
}

@Component({
  selector: 'app-manage-exclusion-words',
  templateUrl: './manage-exclusion-words.component.html',
  styleUrls: ['./word-intelligence.component.css']
})
export class ManageExclusionWordsComponent implements OnInit {
  loading = false;
  exclusionWords: EditableExclusionWord[] = [];
  exclusionSearchText = '';
  pageMessage = '';
  pageError = '';

  exclusionForm = {
    word: ''
  };

  constructor(private wordIntelligenceService: WordIntelligenceService) {}

  ngOnInit(): void {
    void this.loadExclusionWords();
  }

  async loadExclusionWords(): Promise<void> {
    this.loading = true;
    this.pageError = '';

    try {
      await this.reloadExclusionWords();
    } catch (error) {
      console.error('Failed to load exclusion words:', error);
      this.pageError = 'Unable to load exclusion words.';
    } finally {
      this.loading = false;
    }
  }

  get filteredExclusionWords(): EditableExclusionWord[] {
    const query = this.exclusionSearchText.trim().toLowerCase();

    return this.exclusionWords.filter((word) =>
      !query || (word.text || '').toLowerCase().includes(query)
    );
  }

  async addExclusionWord(): Promise<void> {
    const word = this.exclusionForm.word.trim();
    if (!word) {
      this.pageError = 'Exclusion word is required before adding a new entry.';
      return;
    }

    this.pageError = '';
    const created = await this.wordIntelligenceService.addExclusionWord({ word });

    if (!created) {
      this.pageError = 'Unable to add the exclusion word right now.';
      return;
    }

    this.pageMessage = `Added "${word}" to the exclusion list.`;
    this.exclusionForm.word = '';
    await this.reloadExclusionWords();
  }

  async deleteExclusionWord(word: EditableExclusionWord): Promise<void> {
    word.deleting = true;
    this.pageError = '';

    try {
      const response = await this.wordIntelligenceService.deleteExclusionWord({
        word: word.text
      });

      if (!response?.success) {
        this.pageError = response?.message || `Unable to delete "${word.text || 'word'}".`;
        return;
      }

      this.pageMessage = response.message || `Deleted "${word.text || 'word'}" from the exclusion list.`;
      await this.reloadExclusionWords();
    } finally {
      word.deleting = false;
    }
  }

  trackExclusionWord(index: number, word: EditableExclusionWord): string {
    return word.text || `exclusion-word-${index}`;
  }

  private async reloadExclusionWords(): Promise<void> {
    const exclusionWords = await this.wordIntelligenceService.getExclusionWords();
    this.exclusionWords = exclusionWords.map((word) => this.toEditableExclusionWord(word));
  }

  private toEditableExclusionWord(word: ExclusionWordEntry): EditableExclusionWord {
    return {
      ...word
    };
  }
}
