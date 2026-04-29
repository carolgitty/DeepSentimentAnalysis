import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BaseChartDirective } from 'ng2-charts';

import { CustomerSentimentComponent } from './customer-sentiment.component';

describe('CustomerSentimentComponent', () => {
    let component: CustomerSentimentComponent;
    let fixture: ComponentFixture<CustomerSentimentComponent>;

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                declarations: [CustomerSentimentComponent],
                imports: [BaseChartDirective]
            }).compileComponents();
        })
    );

    beforeEach(() => {
        fixture = TestBed.createComponent(CustomerSentimentComponent);
        component = fixture.componentInstance;
        component.timeline = [];
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
