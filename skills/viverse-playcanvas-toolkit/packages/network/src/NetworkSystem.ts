import { BaseSystem, registerModule } from '@viverse/core';
import type {
  IViverseApp,
  StoreWithSelector,
  ModuleInterfaceMap,
  INetworkSystem,
  NetworkSystemOptionsType,
  NetworkSystemStore,
} from '@viverse/types';
import { ModuleName, SystemName } from '@viverse/types';
import createStore from './core/store';

export class NetworkSystem extends BaseSystem<SystemName.Network> implements INetworkSystem {
  static systemName = SystemName.Network as const;

  readonly modules: Partial<ModuleInterfaceMap> = {};
  readonly store: StoreWithSelector<NetworkSystemStore>;
  protected _options: NetworkSystemOptionsType;

  constructor(viverseApp: IViverseApp, options: NetworkSystemOptionsType) {
    super(viverseApp);
    this._options = options;
    this.store = createStore();
    this.pcApp.on('update', this.update, this);
  }

  async start(): Promise<void> {
    await this._setupMultiplayerModule();
  }

  private async _setupMultiplayerModule(): Promise<void> {
    const { modules = [] } = this._options || {};
    const multiplayer = modules.find((module) => module.name === ModuleName.Multiplayer);
    if (!multiplayer) return;

    const { Module: MultiplayerModule, options } = multiplayer;
    const instance = new MultiplayerModule(this, options);
    await instance.initialize();
    registerModule(this.modules, instance.name, instance);
  }

  update(dt: number): void {
    for (const moduleName in this.modules) {
      const name = moduleName as keyof ModuleInterfaceMap;
      const module = this.modules[name];
      if (module && module.update) module.update(dt);
    }
  }

  destroy(): void {
    super.destroy();
    this.pcApp.off('update', this.update, this);
    Object.values(this.modules).forEach((module) => {
      if (module.destroy) module.destroy();
      delete this.modules[module.name];
    });
  }
}
