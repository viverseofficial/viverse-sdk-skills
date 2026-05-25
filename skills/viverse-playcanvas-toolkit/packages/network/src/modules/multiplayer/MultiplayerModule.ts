import { BaseModule, Debugger } from '@viverse/core';
import {
  MessageType,
  ModuleName,
  SystemName,
  type CompetitionResponse,
  type CustomMessagePayload,
  type FormattedMessage,
  type FormattedSystemMessage,
  type IMultiplayerAdapter,
  type IMultiplayerModule,
  type IRemotePlayersManager,
  type MessagePayload,
  type MultiplayerModuleOptionsType,
  type SystemInterfaceMap,
  type SystemMessagePayload,
  type IInteractableItemsManager,
  type IRemotePlayer,
  type IChatManager,
  type IAudioManager,
} from '@viverse/types';
import { PlaySdkMultiplayerAdapter } from './adapters/PlaySdkMultiplayerAdapter';
import { RemotePlayersManager } from './components/remote-players/RemotePlayersManager';
import { InteractableItemsManager } from './components/interactable-items/InteractableItemsManager';
import { ChatManager } from './components/chat/ChatManager';
import { AudioManager } from './components/audio/AudioManager';

export class MultiplayerModule
  extends BaseModule<ModuleName.Multiplayer, SystemName.Network>
  implements IMultiplayerModule
{
  static moduleName = ModuleName.Multiplayer as const;

  readonly sessionId: string = crypto.randomUUID();
  readonly sessionIds: Set<string> = new Set();
  readonly defaultRoomId: string;

  private _adapter: IMultiplayerAdapter;
  private _isInitialized: boolean = false;
  private _autoJoinDefaultRoom: boolean = true;

  private _remotePlayers: IRemotePlayersManager;
  private _interactableItems: IInteractableItemsManager;
  private _chat: IChatManager;
  private _audio: IAudioManager;
  private _currentRoomId: string | null = null;

  constructor(
    system: SystemInterfaceMap[SystemName.Network],
    options?: MultiplayerModuleOptionsType,
  ) {
    super(system);

    const appId = this.system.viverseApp.appId || 'default';
    this.defaultRoomId = `room-${appId}`;

    const {
      adapter,
      avatarClasses = [],
      avatarFadeOnOverlap = true,
      autoJoinDefaultRoom = true,
    } = options || {};

    // Initialize adapter
    this._autoJoinDefaultRoom = autoJoinDefaultRoom;
    this._adapter = adapter || new PlaySdkMultiplayerAdapter();
    this._bindAdapterEvents();

    // Initialize managers
    this._remotePlayers = new RemotePlayersManager(this.system, {
      avatarClasses,
      avatarFadeOnOverlap,
    });
    this._interactableItems = new InteractableItemsManager(this.system, this);
    this._chat = new ChatManager(this.system);
    this._audio = new AudioManager(this.system, this);
    this._bindEvents();
  }

  get adapter(): IMultiplayerAdapter {
    return this._adapter;
  }

  get remotePlayers(): IRemotePlayersManager {
    return this._remotePlayers;
  }

  get interactableItems(): IInteractableItemsManager {
    return this._interactableItems;
  }

  get chat(): IChatManager {
    return this._chat;
  }

  get audio(): IAudioManager {
    return this._audio;
  }

  get currentRoomId(): string | null {
    return this._currentRoomId;
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  private _bindAdapterEvents(): void {
    this._adapter.onConnected?.(this._handleConnected.bind(this));
    this._adapter.onClientConnected?.(this._handleClientConnected.bind(this));
    this._adapter.onClientDisconnected?.(this._handleClientDisconnected.bind(this));
    this._adapter.onMessageReceived?.(this._handleMessageReceived.bind(this));
    this._adapter.onCompetitionReceived?.(this._handleCompetitionReceived.bind(this));
  }

  private _bindEvents(): void {
    this.viverseApp.on('multiplayer:send-system-message', this._handleSendSystemMessage, this);
    this.viverseApp.on('multiplayer:send-competition', this._handleSendCompetition, this);
  }

  private _unbindEvents(): void {
    this.viverseApp.off('multiplayer:send-system-message', this._handleSendSystemMessage, this);
    this.viverseApp.off('multiplayer:send-competition', this._handleSendCompetition, this);
  }

  private _handleConnected(): void {
    this.system.emit('multiplayer:connected');
  }

  private _handleClientConnected(userSessionId: string): void {
    this.sessionIds.add(userSessionId);
    this.system.emit('multiplayer:client-connected', userSessionId);
  }

  private _handleClientDisconnected(userSessionId: string): void {
    this._remotePlayers.removePlayer(userSessionId);
    this.sessionIds.delete(userSessionId);
    this.system.emit('multiplayer:client-disconnected', userSessionId);
  }

  private _parseMessage(message: string): FormattedMessage {
    return JSON.parse(message);
  }

  private _handleMessageReceived(message: string): void {
    const parsedMessage = this._parseMessage(message);
    const { messageType } = parsedMessage;

    if (messageType === MessageType.System) {
      this._handleReceivedSystemMessage(parsedMessage);
      this.viverseApp.emit('multiplayer:system-message-received', parsedMessage);
    } else if (messageType === MessageType.Custom) {
      this.viverseApp.emit('multiplayer:custom-message-received', parsedMessage);
    }
  }

  private _handleSendSystemMessage(message: SystemMessagePayload): void {
    this.sendSystemMessage(message);
  }

  private _handleSendCompetition(actionName: string, actionMsg: string, actionId: string): void {
    this.sendCompetition(actionName, actionMsg, actionId);
  }

  private async _initializeAdapter(): Promise<void> {
    await this._adapter.initialize(this.system.viverseApp);
    if (this._autoJoinDefaultRoom) await this.joinDefaultRoom();
  }

  async initialize(): Promise<void> {
    if (this._isInitialized) return;

    try {
      this._initializeAdapter().then(() => {
        // Don't await here to prevent blocking initialization flow
        this._isInitialized = true;
      });
    } catch (error) {
      Debugger.error('Failed to setup the Multiplayer module:', error);
    }
  }

  getRemotePlayer(userSessionId: string): IRemotePlayer | null {
    return this._remotePlayers.players.get(userSessionId) || null;
  }

  checkIsMasterUser(): boolean {
    return this._adapter.checkIsMasterUser?.() ?? false;
  }

  private _handleReceivedSystemMessage(message: FormattedSystemMessage): void {
    const { payload } = message;

    if (payload.type === 'player') {
      this._remotePlayers.handleMessageReceived({ ...message, payload });
    } else if (payload.type === 'interactable-items') {
      this._interactableItems.handleMessageReceived({ ...message, payload });
    } else if (payload.type === 'chat') {
      this._chat.handleMessageReceived({ ...message, payload });
    }
  }

  private _formatMessage<T extends MessagePayload>(payload: T, type: MessageType): string {
    const message = {
      messageType: type,
      messageId: crypto.randomUUID(),
      userSessionId: this.sessionId,
      clientTime: Date.now(),
      payload,
    };

    return JSON.stringify(message);
  }

  private _send(message: string) {
    if (this._adapter.connected) this._adapter.sendMessage(message);
  }

  private _handleCompetitionReceived(data: CompetitionResponse): void {
    if (data.actionName === 'interaction') {
      this._interactableItems.handleCompetitionReceived(data);
    }

    this.viverseApp.emit('multiplayer:competition-received', data);
  }

  sendCompetition(actionName: string, actionMsg: string, actionId: string): void {
    if (!this._adapter.connected) return;
    this._adapter.sendCompetition?.(actionName, actionMsg, actionId);
  }

  sendSystemMessage(message: SystemMessagePayload): void {
    const formattedMessage = this._formatMessage(message, MessageType.System);
    this._send(formattedMessage);
  }

  sendMessage<T extends CustomMessagePayload>(message: T): void {
    const formattedMessage = this._formatMessage(message, MessageType.Custom);
    this._send(formattedMessage);
  }

  async joinDefaultRoom(): Promise<void> {
    await this.switchRoom(this.defaultRoomId);
  }

  async joinRoom(roomId: string, adapterAttributes?: unknown): Promise<void> {
    await this._adapter.joinRoom(roomId, this.sessionId, adapterAttributes);
    this._currentRoomId = roomId;
  }

  async leaveRoom(adapterAttributes?: unknown): Promise<void> {
    await this._adapter.leaveRoom(adapterAttributes);
    this._currentRoomId = null;
  }

  async switchRoom(roomId: string, adapterAttributes?: unknown): Promise<void> {
    await this._adapter.switchRoom(roomId, this.sessionId, adapterAttributes);
    this._currentRoomId = roomId;
  }

  update(dt: number): void {
    this._remotePlayers.update(dt);
    this._interactableItems.update(dt);
  }

  destroy(): void {
    this._isInitialized = false;
    this._adapter.destroy?.();
    this._unbindEvents();
    this._chat.destroy();
    this._audio.destroy();
    this._remotePlayers.destroy();
  }
}
