import * as pc from 'playcanvas';
import { PickInteraction } from '@viverse/extension';
import type { IViverseApp } from '@viverse/types';

export const createPickableGLB = (
  name: string,
  viverseApp: IViverseApp,
  url: string,
  position: pc.Vec3,
  options?: {
    scale?: pc.Vec3;
    gripOptions?: {
      entityName?: string;
      positionOffset?: pc.Vec3;
      rotationOffset?: pc.Vec3;
      scale?: pc.Vec3;
      showDebug?: boolean;
    };
  },
): pc.Entity => {
  const app = viverseApp.pcApp as pc.Application;

  const rootEntity = new pc.Entity('PickableModel' + (name ? `_${name}` : ''));
  rootEntity.setPosition(position);

  if (options?.scale) {
    rootEntity.setLocalScale(options.scale);
  }

  if (options?.gripOptions) {
    const grip = new pc.Entity('gripPoint');
    grip.setLocalPosition(options.gripOptions.positionOffset || new pc.Vec3());
    grip.setLocalEulerAngles(options.gripOptions.rotationOffset || new pc.Vec3());
    grip.setLocalScale(options.gripOptions.scale || new pc.Vec3(1, 1, 1));

    if (options.gripOptions.showDebug) {
      grip.addComponent('render', { type: 'sphere', material: new pc.StandardMaterial() });
      const mat = grip.render?.material as pc.StandardMaterial;
      if (mat) {
        mat.diffuse = new pc.Color(1, 0, 0, 0.5);
        mat.opacity = 0.5;
        mat.blendType = pc.BLEND_NORMAL;
        mat.update();
      }
    }

    rootEntity.addChild(grip);
    new PickInteraction(viverseApp, rootEntity, { name, gripPoint: grip });
  }

  app.assets.loadFromUrl(url, 'container', (err, asset) => {
    if (err) {
      console.error('Failed to load GLB:', url, err);
      return;
    }
    const container = asset as pc.Asset;
    const resource = container.resource as pc.ContainerResource;
    const modelEntity: pc.Entity = resource.instantiateRenderEntity();
    modelEntity.name = `Model(${url.split('/')?.pop()})`;

    if (!options?.scale) {
      modelEntity.setLocalScale(0.3, 0.3, 0.3);
    }

    rootEntity.addChild(modelEntity);
  });

  return rootEntity;
};

export const createPickableScene = (viverseApp: IViverseApp, root: pc.Entity): void => {
  const teddy = createPickableGLB(
    'Teddy',
    viverseApp,
    'glb/teddy-bear.glb',
    new pc.Vec3(-2, 1, 0),
    {
      scale: new pc.Vec3(0.2, 0.2, 0.2),
      gripOptions: {
        entityName: 'TeddyGrip',
        positionOffset: new pc.Vec3(0.5, -1.5, 0.8),

        rotationOffset: new pc.Vec3(90, 90, 90),
        scale: new pc.Vec3(0.5, 0.5, 0.5),
        showDebug: true,
      },
    },
  );

  const sword = createPickableGLB(
    'Sword',
    viverseApp,
    'glb/autumn-sword.glb',
    new pc.Vec3(-2, 1, 1),
    {
      scale: new pc.Vec3(0.1, 0.1, 0.1),
      gripOptions: {
        entityName: 'SwordGrip',
        positionOffset: new pc.Vec3(0, 0, -2),
        rotationOffset: new pc.Vec3(0, -180, 180),
        scale: new pc.Vec3(0.5, 0.5, 0.5),
        showDebug: true,
      },
    },
  );

  const ak47 = createPickableGLB('AK47', viverseApp, 'glb/ak47.glb', new pc.Vec3(2, 1, 0), {
    scale: new pc.Vec3(0.001, 0.001, 0.001),
    gripOptions: {
      entityName: 'AKGrip',
      positionOffset: new pc.Vec3(-0.5, -100, 0),
      rotationOffset: new pc.Vec3(0, 0, 90),
      scale: new pc.Vec3(100, 100, 100),
      showDebug: true,
    },
  });

  root.addChild(teddy);
  root.addChild(ak47);
  root.addChild(sword);
};
