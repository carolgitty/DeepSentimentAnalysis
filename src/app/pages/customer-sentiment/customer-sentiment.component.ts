import { Component, Input, OnChanges } from '@angular/core';
import { TimelineItem } from '../../services/sentiment-session.service';

interface ChartPoint {
  x: number;
  y: number;
  value: string;
}

interface HoveredPoint {
  x: number;
  y: number;
  value: string;
}

@Component({
  selector: 'customer-sentiment',
  templateUrl: './customer-sentiment.component.html',
  styleUrls: ['./customer-sentiment.component.scss']
})
export class CustomerSentimentComponent implements OnChanges {
  @Input() timeline: TimelineItem[] = [];
  @Input() loading = false;
  @Input() badThreshold = -0.5;
  @Input() criticalThreshold = -0.75;

  readonly yAxisLabels = [1, 0.5, 0, -0.5, -1];
  readonly xSlots = 8;

  hasChartData = false;
  positivePercent = 0;
  negativePercent = 0;
  positivePill = '0% ↗';
  negativePill = '0% ↘';
  pointMarkers: ChartPoint[] = [];
  polylinePoints = '';
  xAxisLabels: string[] = [];
  hoveredPoint: HoveredPoint | null = null;

  ngOnChanges(): void {
    const customerTimeline = this.timeline.filter((item) => item.speaker === 'customer');
    this.hasChartData = customerTimeline.length > 0;

    const positiveCount = customerTimeline.filter((item) => item.score > 0).length;
    const negativeCount = customerTimeline.filter((item) => item.score < 0).length;
    const totalPoints = customerTimeline.length || 1;

    this.positivePercent = Math.round((positiveCount / totalPoints) * 100);
    this.negativePercent = Math.round((negativeCount / totalPoints) * 100);
    this.positivePill = `${this.positivePercent}% ↗`;
    this.negativePill = `${this.negativePercent}% ↘`;

    this.pointMarkers = this.buildPointMarkers(customerTimeline);
    this.polylinePoints = this.pointMarkers.map((point) => `${point.x},${point.y}`).join(' ');
    this.xAxisLabels = this.buildXAxisLabels(customerTimeline);
    this.hoveredPoint = null;
  }

  getGridX(index: number): number {
    return 12 + (index * (76 / (this.xSlots - 1)));
  }

  getGridY(value: number): number {
    return 8 + ((1 - value) / 2) * 44;
  }

  shouldShowThreshold(value: number): boolean {
    return value >= -1 && value <= 1;
  }

  showPointTooltip(point: ChartPoint): void {
    this.hoveredPoint = point;
  }

  hidePointTooltip(): void {
    this.hoveredPoint = null;
  }

  private buildPointMarkers(timeline: TimelineItem[]): ChartPoint[] {
    if (!timeline.length) {
      return [];
    }

    return timeline.map((item, index) => ({
      x: timeline.length === 1 ? 50 : 12 + (index * (76 / (timeline.length - 1))),
      y: this.getGridY(item.score),
      value: item.score.toFixed(2)
    }));
  }

  private buildXAxisLabels(timeline: TimelineItem[]): string[] {
    if (!timeline.length) {
      return Array.from({ length: this.xSlots }, () => '00:00');
    }

    const labels = timeline.map((item, index) => this.getChartLabel(item, index));
    return Array.from({ length: this.xSlots }, (_, index) => labels[index] ?? labels[labels.length - 1] ?? '00:00');
  }

  private getChartLabel(item: TimelineItem, index: number): string {
    const timestamp = new Date(item.datetime);

    if (Number.isNaN(timestamp.getTime())) {
      return `00:${String(index).padStart(2, '0')}`;
    }

    return timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
}
