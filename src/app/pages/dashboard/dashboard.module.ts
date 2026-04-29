import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard.component';
import { CustomerSentimentComponent } from '../customer-sentiment/customer-sentiment.component';

@NgModule({
  declarations: [
    DashboardComponent,
    CustomerSentimentComponent
  ],
  imports: [
    CommonModule,
    BaseChartDirective,
    DashboardRoutingModule
  ]
})
export class DashboardModule { }
