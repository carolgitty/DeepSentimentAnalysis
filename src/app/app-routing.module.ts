import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConfigSettingsComponent } from './pages/config-settings/config-settings.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./pages/dashboard/dashboard.module').then(m => m.DashboardModule)
  },
  {
    path: 'word-intelligence',
    loadChildren: () => import('./pages/word-intelligence/word-intelligence.module').then(m => m.WordIntelligenceModule)
  },
  {
    path: 'config',
    component: ConfigSettingsComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
