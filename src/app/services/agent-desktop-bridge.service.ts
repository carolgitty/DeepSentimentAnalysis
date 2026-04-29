import { Injectable, NgZone } from '@angular/core';

export type VoiceMonitorMode = 'silent' | 'whisper' | 'barge-in';
export type ChatMonitorMode = 'silent' | 'whisper' | 'conf';

export interface AgentDesktopSessionRef {
  sessionId: string;
  interactionId?: string | null;
  agentId?: string | null;
  deviceId?: string | null;
  tmacServerName?: string | null;
  channel?: string | null;
}

export interface AgentDesktopAgentData {
  agentId: string;
  deviceId: string;
  tmacServer: string;
  agentName?: string;
  teamId?: string;
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
  private readonly pendingRequests = new Map<string, PendingRequest>();
  private cachedAgentData: AgentDesktopAgentData | null = null;
  private readonly debugEnabled =
    typeof window !== 'undefined' &&
    (
      window.localStorage?.getItem('agentDesktopBridgeDebug') === 'true' ||
      (window as any).__agentDesktopBridgeDebug === true
    );

  constructor(private ngZone: NgZone) {
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handleMessage);
    }
  }

  async getAgentData(forceRefresh = false): Promise<AgentDesktopAgentData> {
    if (!forceRefresh && this.cachedAgentData) {
      return this.cachedAgentData;
    }

    const response = await this.postMessageRequest<AgentDesktopAgentData>('getagentdata', undefined, 10000);
    this.cachedAgentData = response;
    return response;
  }

  invokeSdk<T = any>(method: string, params: any[] = [], timeoutMs = 15000): Promise<T> {
    this.debugLog('invokeSdk requested', { method, params });
    return this.postMessageRequest<T>('invokesdk', { method, params }, timeoutMs);
  }

  async performVoiceBargeIn(session: AgentDesktopSessionRef, mode: VoiceMonitorMode): Promise<any> {
    if (!session.interactionId || !session.agentId || !session.tmacServerName) {
      // throw new Error('Voice monitoring requires interactionId, agentId, and tmacServerName.');
    }

    const agentData = await this.getAgentData();

    return this.invokeSdk('voiceBargeinNonFAC', [
      {
        supervisorId: agentData.agentId,
        bargeinToAgent: session.agentId,
        bargeinToInteractionid: session.interactionId,
        active: mode,
        sendCallToNumber: agentData.deviceId,
        tmacServer: session.tmacServerName
      }
    ]);
  }

  async performChatBargeIn(session: AgentDesktopSessionRef, mode: ChatMonitorMode): Promise<any> {
    if (!session.interactionId || !session.sessionId || !session.agentId || !session.tmacServerName) {
      throw new Error('Chat monitoring requires interactionId, sessionId, agentId, and tmacServerName.');
    }

    const agentData = await this.getAgentData();
    const normalizedChannel = (session.channel || '').toLowerCase();
    const chatMode =
      normalizedChannel === 'audiochat'
        ? 'audio'
        : normalizedChannel === 'videochat'
          ? 'video'
          : 'text';

    return this.invokeSdk('transferTextChat', [
      {
        agentId: session.agentId,
        deviceId: session.deviceId || '',
        tmacServer: session.tmacServerName,
        chatMode,
        comment: '',
        conferenceType: mode,
        interactionId: session.interactionId,
        lineId: 'bargein',
        sessionId: session.sessionId,
        toAgentId: agentData.agentId,
        toTmacServer: agentData.tmacServer
      }
    ]);
  }

  canUseVoiceMonitor(session: AgentDesktopSessionRef): boolean {
    return Boolean(session.interactionId && session.agentId && session.tmacServerName);
  }

  canUseChatMonitor(session: AgentDesktopSessionRef): boolean {
    return Boolean(
      session.interactionId &&
      session.sessionId &&
      session.agentId &&
      session.tmacServerName &&
      session.channel
    );
  }

  private postMessageRequest<T>(fn: string, data?: any, timeoutMs = 15000): Promise<T> {
    if (typeof window === 'undefined' || !window.parent || window.parent === window) {
      this.debugLog('parent window unavailable', { fn, data });
      return Promise.reject(new Error('Agent desktop parent window is not available.'));
    }

    const callback = `codex_${fn}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    return new Promise<T>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(callback);
        reject(new Error(`Timed out waiting for parent response to ${fn}.`));
      }, timeoutMs);

      this.pendingRequests.set(callback, { resolve, reject, timeoutHandle });

      this.debugLog('posting message to parent', {
        fn,
        callback,
        data
      });

      window.parent.postMessage(
        {
          destination: 'tmac',
          source: 'launcher',
          function: fn,
          callback,
          data
        },
        '*'
      );
    });
  }

  private handleMessage = (event: MessageEvent): void => {
    const payload = event.data;

    if (!payload || payload.source !== 'tmac' || typeof payload.function !== 'string') {
      return;
    }

    const pendingRequest = this.pendingRequests.get(payload.function);
    if (!pendingRequest) {
      this.debugLog('received unmatched response', payload);
      return;
    }

    this.pendingRequests.delete(payload.function);
    clearTimeout(pendingRequest.timeoutHandle);

    this.debugLog('received response from parent', payload);
    this.ngZone.run(() => pendingRequest.resolve(payload.data));
  };

  private debugLog(message: string, data?: unknown): void {
    if (!this.debugEnabled) {
      return;
    }

    console.debug('[AgentDesktopBridge]', message, data);
  }
}
