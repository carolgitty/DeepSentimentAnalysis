import { Component, OnInit } from '@angular/core';
import { AgentDesktopBridgeService } from './services/agent-desktop-bridge.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Text Analyzer UI';
  tmacVersion = '';

  constructor(private agentDesktopBridgeService: AgentDesktopBridgeService) {}

  ngOnInit(): void {
    if (!this.agentDesktopBridgeService.canRequestParentData()) {
      return;
    }

    void this.loadTmacVersion();
    void this.loadAgentData();
  }

  async loadTmacVersion(): Promise<void> {
    try {
      const response = await this.agentDesktopBridgeService.getTmacVersion();
      console.log('RTSA**** TMAC version response from SDK client:', response);
      this.tmacVersion = this.normalizeTmacVersion(response);
    } catch (error) {
      console.warn('Unable to load TMAC version from SDK client.', error);
      this.tmacVersion = '';
    }
  }

  async loadAgentData(): Promise<void> {
    try {
      const response = await this.agentDesktopBridgeService.getAgentData();
      console.log('RTSA**** Agent data response from Agent Desktop:', response);
    } catch (error) {
      console.warn('Unable to load agent data from Agent Desktop.', error);
    }
  }

  private normalizeTmacVersion(response: any): string {
    if (typeof response === 'string' || typeof response === 'number') {
      return String(response).trim();
    }

    return String(
      response?.tacversion ??
      response?.tmacVersion ??
      response?.tmacversion ??
      response?.version ??
      response?.response ??
      ''
    ).trim();
  }
}
