import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppConfigService } from './app-config.service';

export type SupervisorInteractionActionMode = 'silent' | 'whisper' | 'barge-in';

export interface AgentDesktopSessionRef {
  sessionId: string;
  ucid?: string | null;
  interactionId?: string | null;
  agentId?: string | null;
  deviceId?: string | null;
  tmacServerName?: string | null;
  channel?: string | null;
}

export interface AgentDesktopAgentStatus {
  agentId: string;
  status: string;
  raw: any;
}

export interface AgentDesktopSupervisorContext {
  supervisorId: string;
  supervisorTeamId?: string | number | null;
  deviceId?: string | null;
  tmacServer?: string | null;
  facCodes?: Partial<Record<SupervisorInteractionActionMode, FacCodeConfig>>;
}

export interface FacCodeConfig {
  code: string;
  suffix?: string | null;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: unknown) => void;
  timeoutHandle: ReturnType<typeof setTimeout>;
}

@Injectable({
  providedIn: 'root'
})
export class AgentDesktopBridgeService {
  private readonly defaultTmacServer = 'http://devlinux.tetherfi.cloud:5000';
  private readonly pendingRequests = new Map<string, PendingRequest>();
  private configTmacServer = this.defaultTmacServer;
  private configLoadPromise: Promise<void> | null = null;
  private agentData: any = null;
  private readonly agentDataSubject = new BehaviorSubject<any>(null);
  private supervisorContext: AgentDesktopSupervisorContext = {
    supervisorId: ''
  };
  private readonly debugEnabled =
    typeof window !== 'undefined' &&
    (
      window.localStorage?.getItem('agentDesktopBridgeDebug') === 'true' ||
      (window as any).__agentDesktopBridgeDebug === true
    );

  constructor(
    private ngZone: NgZone,
    private appConfigService: AppConfigService
  ) {
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handleMessage);
    }

    this.configLoadPromise = this.loadConfiguredTmacServer();
  }


  canRequestParentData(): boolean {
    return typeof window !== 'undefined' && Boolean(window.parent) && window.parent !== window;
  }

  invokeSdk<T = any>(
    method: string,
    params: any[] = [],
    timeoutMs = 99999,
    callback = `${method}Done`
  ): Promise<T> {
    this.debugLog('invokeSdk requested', { method, params });
    return this.postMessageRequest<T>('invokesdk', { method, params }, callback, timeoutMs);
  }

  setSupervisorContext(context: AgentDesktopSupervisorContext): void {
    this.supervisorContext = {
      ...this.supervisorContext,
      ...context,
      supervisorId: String(context.supervisorId || '').trim(),
      facCodes: {
        ...this.supervisorContext.facCodes,
        ...context.facCodes
      }
    };

    this.debugLog('supervisor context updated from query params', this.supervisorContext);
  }

  async getTmacVersion(): Promise<any> {
    const tmacServer = await this.getConfiguredTmacServer();
    
    return this.invokeSdk('getTMACVersion', [tmacServer], 99999, 'getTMACVersionDone');
  }
  
    async getAgentData(): Promise<any> {
    const tmacServer = await this.getConfiguredTmacServer();
    
    return this.invokeSdk('getAgentData', [tmacServer], 99999, 'getAgentDataDone');
  }
  getAgentDataChanges(): Observable<any> {
    return this.agentDataSubject.asObservable();
  }

  isInterventionFeatureEnabled(mode: SupervisorInteractionActionMode): boolean {
    const agentData = this.agentData?.data || this.agentData?.response?.Data || this.agentData?.response || this.agentData || {};
    const featuresList = agentData.featuresList || agentData.FeaturesList || [];
    if (!featuresList.length) {
      return false;
    }

    const featureName =
      mode === 'silent' ? 'AllowSupervisorToSilentMonitor' :
      mode === 'whisper' ? 'AllowSupervisorToWhisper' :
      'AllowSupervisorToBargeIn';
    const normalizedFeatureName = featureName.toLowerCase();
    const feature = featuresList.find((item: any) =>
      String(item?.Feature || '').trim().toLowerCase() === normalizedFeatureName
    );

    return feature?.IsEnabled === true;
  }

  async getAgentStatus(agentId: string, tmacServerOverride?: string | null): Promise<AgentDesktopAgentStatus> {
    const normalizedAgentId = String(agentId || '').trim();
    if (!normalizedAgentId) {
      throw new Error('Agent ID is required to get agent status.');
    }

    const configuredTmacServer = await this.getConfiguredTmacServer();
    const tmacServer = String(tmacServerOverride ?? configuredTmacServer ?? '').trim();
    const response = await this.invokeSdk(
      'getAgentStatus',
      [{ agentId: normalizedAgentId, tmacServer }],
      99999,
      'getAgentStatusDone'
    );

    return {
      agentId: normalizedAgentId,
      status: this.extractAgentStatus(response),
      raw: response
    };
  }


  async performInteractionAction(session: AgentDesktopSessionRef, mode: SupervisorInteractionActionMode): Promise<any> {
    const facCode = this.getFacCode(mode);
    if (facCode?.code) {
      return this.performVoiceBargeInWithFac(session, mode, facCode);
    }

    return this.performVoiceBargeInNonFac(session, mode);
  }

  private async performVoiceBargeInNonFac(session: AgentDesktopSessionRef, mode: SupervisorInteractionActionMode): Promise<any> {
    const tmacServer = session.tmacServerName || await this.getConfiguredTmacServer();
    const response = await this.invokeSdk('voiceBargeinNonFAC', [
      {
        supervisorId: this.getSupervisorId(),
        bargeinToAgent: session.agentId,
        bargeinToInteractionid: session.interactionId,
        active: mode,
        sendCallToNumber: this.supervisorContext.deviceId || '',
        tmacServer
      }
    ], 99999, 'voiceBargeinNonFACDone');
    console.log('RTSA**** Voice Barge-in SDK response:', response);
    return response;
  }

  private async performVoiceBargeInWithFac(
    session: AgentDesktopSessionRef,
    mode: SupervisorInteractionActionMode,
    facCode: FacCodeConfig
  ): Promise<any> {
    if (!session.interactionId) {
      throw new Error('Interaction ID is required for FAC voice intervention.');
    }

    const phoneNumber = `${facCode.code}${this.getFacSuffixValue(facCode, session)}`;
    const response = await this.invokeSdk('makeCall', [
      {
        interactionId: String(session.interactionId),
        number: phoneNumber,
        source: '',
        sourceId: ''
      }
    ], 99999, 'makeCallDone');

    console.log('RTSA**** Voice FAC intervention SDK response:', {
      mode,
      phoneNumber,
      response
    });

    return response;
  }

  private async getConfiguredTmacServer(): Promise<string> {
    if (this.configLoadPromise) {
      await this.configLoadPromise;
    }

    return this.getConfiguredTmacServerSync();
  }

  private getConfiguredTmacServerSync(): string {
    return this.configTmacServer || this.defaultTmacServer;
  }

  private async loadConfiguredTmacServer(): Promise<void> {
    try {
      const config = await this.appConfigService.getConfig();
      this.configTmacServer = String(config.sdk?.tmacServer || this.defaultTmacServer).trim() || this.defaultTmacServer;
      this.debugLog('configured TMAC server loaded', this.configTmacServer);
    } catch (error) {
      this.configTmacServer = this.defaultTmacServer;
      console.warn('Failed to load TMAC server from config, using default.', error);
    } finally {
      this.configLoadPromise = null;
    }
  }

  private getSupervisorId(): string {
    if (!this.supervisorContext.supervisorId) {
      throw new Error('Supervisor ID is missing from query params.');
    }

    return this.supervisorContext.supervisorId;
  }

  private getFacCode(mode: SupervisorInteractionActionMode): FacCodeConfig | null {
    const facCode = this.supervisorContext.facCodes?.[mode];
    if (!facCode?.code) {
      return null;
    }

    return {
      code: String(facCode.code || '').trim(),
      suffix: String(facCode.suffix || '').trim()
    };
  }

  private getFacSuffixValue(facCode: FacCodeConfig, session: AgentDesktopSessionRef): string {
    const suffix = String(facCode.suffix || '').trim().toLowerCase();

    if (suffix === 'stationid') {
      return String(this.supervisorContext.deviceId || session.deviceId || '').trim();
    }

    if (suffix === 'agentid') {
      return String(session.agentId || '').trim();
    }

    return String(session.agentId || '').trim();
  }

  private postMessageRequest<T>(fn: string, data?: any, callback = `${fn}Done`, timeoutMs = 15000): Promise<T> {
    if (typeof window === 'undefined' || !window.parent || window.parent === window) {
      this.debugLog('parent window unavailable', { fn, data });
      return Promise.reject(new Error('Agent desktop parent window is not available.'));
    }

    return new Promise<T>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(callback.toLowerCase());
        reject(new Error(`Timed out waiting for parent response to ${fn}.`));
      }, timeoutMs);

      this.pendingRequests.set(callback.toLowerCase(), { resolve, reject, timeoutHandle });

      this.debugLog('posting message to parent', {
        fn,
        callback,
        data
      });

      this.postMessage(fn, data, callback);
    });
  }

  private postMessage(fn: string, data?: any, callback?: string): void {
    if (typeof window === 'undefined' || !window.parent || window.parent === window) {
      this.debugLog('parent window unavailable', { fn, data });
      return;
    }

    window.parent.postMessage(
      {
        function: fn,
        name: window.name || "",
        callback,
        data,
        destination: 'tmac',
        source: 'sentidashboard',
        userObject: null
      },
      '*'
    );
  }

  private handleMessage = (event: MessageEvent): void => {
    const payload = event.data;

    if (!payload || payload.source !== 'tmac' || typeof payload.function !== 'string') {
      return;
    }

    const fn = payload.function.toLowerCase();

    if (fn === 'gettmacversiondone') {
      this.debugLog('getTMACVersionDone callback received', payload);
    } else if (fn === 'getagentdatadone') {
      this.debugLog('getAgentDataDone callback received', payload);
    } else if (fn === 'getagentstatusdone') {
      this.debugLog('getAgentStatusDone callback received', payload);
    } else if (fn === 'makecalldone') {
      this.debugLog('makeCallDone callback received', payload);
    } else if (fn === 'voicebargeinnonfacdone') {
      this.debugLog('Voice Barge-in action completed', payload);
      console.log('RTSA**** Voice Barge-in SDK callback payload:', payload);
    }

    const pendingRequest = this.pendingRequests.get(fn);
    if (!pendingRequest) {
      this.debugLog('received unmatched response', payload);
      return;
    }

    this.pendingRequests.delete(fn);
    clearTimeout(pendingRequest.timeoutHandle);

    this.debugLog('received response from parent', payload);
    if (fn === 'getagentdatadone') {
      this.storeAgentData(payload.data);
    }
    this.ngZone.run(() => pendingRequest.resolve(payload.data ?? payload));
  };

  private storeAgentData(data: any): void {
    this.agentData = data;
    this.applyAgentDataToSupervisorContext(data);
    this.ngZone.run(() => this.agentDataSubject.next(data));
    this.debugLog('agent data stored', data);
  }

  private applyAgentDataToSupervisorContext(data: any): void {
    const agentData = data?.data || data?.response?.Data || data?.response || data || {};
    const supervisorId = String(
      agentData.supervisorId ||
      agentData.SupervisorId ||
      agentData.supervisorID ||
      agentData.agentId ||
      agentData.AgentId ||
      agentData.AgentLoginID ||
      ''
    ).trim();
    const deviceId = String(
      agentData.deviceId ||
      agentData.DeviceId ||
      agentData.deviceID ||
      agentData.stationId ||
      agentData.StationId ||
      agentData.StationID ||
      ''
    ).trim();
    const tmacServer = String(
      agentData.tmacServer ||
      agentData.TmacServer ||
      agentData.tmacServerName ||
      agentData.TmacServerName ||
      ''
    ).trim();

    this.supervisorContext = {
      ...this.supervisorContext,
      supervisorId: this.supervisorContext.supervisorId || supervisorId,
      deviceId: this.supervisorContext.deviceId || deviceId,
      tmacServer: this.supervisorContext.tmacServer || tmacServer
    };
  }

  private extractAgentStatus(response: any): string {
    const data = response?.response?.Data ?? response?.Data ?? response?.data ?? response?.response ?? response ?? {};
    const resultPayload = response?.response ?? response?.data?.response ?? response?.data ?? response ?? {};
    const resultCode = Number(resultPayload.ResultCode ?? resultPayload.resultCode);
    const resultMessage = String(resultPayload.ResultMessage ?? resultPayload.resultMessage ?? '').trim();

    if (Number.isFinite(resultCode) && resultCode >= 0 && resultMessage) {
      return this.normalizeAgentStatus(resultMessage);
    }

    if (typeof data === 'string') {
      return this.normalizeAgentStatus(data);
    }

    return this.normalizeAgentStatus(String(
      data.status ??
      data.Status ??
      data.agentStatus ??
      data.AgentStatus ??
      data.currentStatus ??
      data.CurrentStatus ??
      data.state ??
      data.State ??
      ''
    ));
  }

  private normalizeAgentStatus(status: string): string {
    const normalizedStatus = String(status || '').trim();
    return normalizedStatus.toLowerCase() === 'active' ? 'To be updated' : normalizedStatus;
  }

  private debugLog(message: string, data?: unknown): void {
    if (!this.debugEnabled) {
      return;
    }

    console.debug('[AgentDesktopBridge]', message, data);
  }
}
