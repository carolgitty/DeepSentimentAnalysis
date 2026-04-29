import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WordIntelligenceComponent } from './word-intelligence.component';
import { ManageWordsComponent } from './manage-words.component';
import { ManageExclusionWordsComponent } from './manage-exclusion-words.component';

const routes: Routes = [
  {
    path: '',
    component: WordIntelligenceComponent
  },
  {
    path: 'manage-words',
    component: ManageWordsComponent
  },
  {
    path: 'manage-exclusion-words',
    component: ManageExclusionWordsComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WordIntelligenceRoutingModule {}
