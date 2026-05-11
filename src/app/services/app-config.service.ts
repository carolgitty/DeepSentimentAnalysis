import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface AppConfig {
  app: {
    name: string;
    version: string;
    port: number;
  };
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
  };
  sdk: {
    tmacServer: string;
  };
  sentiment: {
    thresholds: {
      neutral: number;
      bad: number;
      critical: number;
    };
    updateInterval: number;
  };
  dashboard: {
    refreshInterval: number;
    maxAgents: number;
    pageSize: number;
    useDummy: boolean;
    showMetricsSection: boolean;
    alignMetricsSectionRight: boolean;
    showAgentMonitorSection: boolean;
    showSummarySection: boolean;
    showSentimentDistributionSection: boolean;
    showQuickStatsSection: boolean;
  };
  wordCloud: {
    useDummy: boolean;
    refreshInterval: number;
  };
  features: {
    liveTracking: boolean;
    analytics: boolean;
    exportData: boolean;
  };
  logging: {
    level: string;
    enableConsole: boolean;
    enableFile: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private readonly overrideStorageKey = 'textAnalyzerConfigOverride';
  private readonly defaultConfig: AppConfig = {
    app: {
      name: 'Text Analyzer UI',
      version: '1.0.0',
      port: 4600
    },
    api: {
      baseUrl: '/api/v1/Sentiment/',
      timeout: 30000,
      retryAttempts: 3
    },
    sdk: {
      tmacServer: 'http://devlinux.tetherfi.cloud:5000'
    },
    sentiment: {
      thresholds: {
        neutral: 0,
        bad: -0.5,
        critical: -0.75
      },
      updateInterval: 50000
    },
    dashboard: {
      refreshInterval: 5000,
      maxAgents: 100,
      pageSize: 20,
      useDummy: false,
      showMetricsSection: true,
      alignMetricsSectionRight: true,
      showAgentMonitorSection: true,
      showSummarySection: false,
      showSentimentDistributionSection: false,
      showQuickStatsSection: false
    },
    wordCloud: {
      useDummy: false,
      refreshInterval: 50000
    },
    features: {
      liveTracking: true,
      analytics: true,
      exportData: true
    },
    logging: {
      level: 'info',
      enableConsole: true,
      enableFile: false
    }
  };

  constructor(private http: HttpClient) {}

  async getConfig(): Promise<AppConfig> {
    const fileConfig = await this.loadFileConfig();
    return this.mergeConfig(fileConfig, this.getSavedOverride());
  }

  async getBaseConfig(): Promise<AppConfig> {
    return this.loadFileConfig();
  }

  saveOverride(config: AppConfig): void {
    localStorage.setItem(this.overrideStorageKey, JSON.stringify(config));
  }

  clearOverride(): void {
    localStorage.removeItem(this.overrideStorageKey);
  }

  getSavedOverride(): Partial<AppConfig> | null {
    const rawValue = localStorage.getItem(this.overrideStorageKey);

    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as Partial<AppConfig>;
    } catch (error) {
      console.error('Failed to parse saved config override:', error);
      return null;
    }
  }

  cloneConfig(config: AppConfig): AppConfig {
    return JSON.parse(JSON.stringify(config)) as AppConfig;
  }

  private async loadFileConfig(): Promise<AppConfig> {
    try {
      const config = await this.http.get<Partial<AppConfig>>('/assets/config/app/config.json').toPromise();
      return this.mergeConfig(this.defaultConfig, config ?? {});
    } catch (error) {
      console.warn('Failed to load /assets/config/app/config.json, trying /config.json', error);
      try {
        const fallbackConfig = await this.http.get<Partial<AppConfig>>('/config.json').toPromise();
        return this.mergeConfig(this.defaultConfig, fallbackConfig ?? {});
      } catch (fallbackError) {
        console.error('Failed to load config.json, using defaults', fallbackError);
        return this.cloneConfig(this.defaultConfig);
      }
    }
  }

  private mergeConfig(base: AppConfig, override: Partial<AppConfig> | null): AppConfig {
    if (!override) {
      return this.cloneConfig(base);
    }

    return {
      ...base,
      ...override,
      app: { ...base.app, ...override.app },
      api: { ...base.api, ...override.api },
      sdk: { ...base.sdk, ...override.sdk },
      sentiment: {
        ...base.sentiment,
        ...override.sentiment,
        thresholds: {
          ...base.sentiment.thresholds,
          ...override.sentiment?.thresholds
        }
      },
      dashboard: { ...base.dashboard, ...override.dashboard },
      wordCloud: { ...base.wordCloud, ...override.wordCloud },
      features: { ...base.features, ...override.features },
      logging: { ...base.logging, ...override.logging }
    };
  }
}
