import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WordIntelligenceRoutingModule } from './word-intelligence-routing.module';
import { WordIntelligenceComponent } from './word-intelligence.component';
import { ManageWordsComponent } from './manage-words.component';
import { ManageExclusionWordsComponent } from './manage-exclusion-words.component';

@NgModule({
  declarations: [WordIntelligenceComponent, ManageWordsComponent, ManageExclusionWordsComponent],
  imports: [
    CommonModule,
    FormsModule,
    WordIntelligenceRoutingModule
  ]
})
export class WordIntelligenceModule {}
