import * as pc from 'playcanvas';
import { loadFontAsset } from '@viverse/core';
import { Billboard, OpenLinkAction } from '@viverse/extension';
import { BillboardAxisAlignment, BillboardTargetType, type IViverseApp } from '@viverse/types';

export const createBillboardScene = async (viverseApp: IViverseApp, root: pc.Entity) => {
  const targetRig = new pc.Entity('TargetRig');
  const targetEntity = new pc.Entity('TargetEntity');
  targetEntity.addComponent('render', {
    type: 'sphere',
  });
  targetEntity.setLocalScale(0.1, 0.1, 0.1);
  targetEntity.setLocalPosition(0, 2.5, 0);
  targetRig.addChild(targetEntity);
  root.addChild(targetRig);
  let time = 0;

  viverseApp.pcApp.on('update', (dt) => {
    time += dt * 10;
    targetRig.setLocalEulerAngles(time, time, time);
  });

  const createBillboard = (
    name: string,
    targetType: BillboardTargetType,
    axisAlignment: BillboardAxisAlignment,
  ) => {
    const billboard = new pc.Entity(name);
    billboard.addComponent('element', {
      type: 'image',
      color: new pc.Color(
        axisAlignment === BillboardAxisAlignment.X ? 1 : 0,
        axisAlignment === BillboardAxisAlignment.Y ? 1 : 0,
        axisAlignment === BillboardAxisAlignment.Z ? 1 : 0,
      ),
      pivot: [0.5, 0.5, 0.5, 0.5],
      anchor: [0.5, 0.5, 0.5, 0.5],
      width: 1,
      height: 1,
      layers: [pc.LAYERID_WORLD],
    });

    billboard.setLocalPosition(0, 1, 0);

    new Billboard(viverseApp, billboard, targetType, {
      axisAlignment: axisAlignment,
      targetEntity: targetEntity,
      targetPosition: null,
      rotateLocal: new pc.Vec3(0, 180, 0),
    });
    root.addChild(billboard);
    return billboard;
  };

  const billboard1 = createBillboard(
    'Billboard1',
    BillboardTargetType.Entity,
    BillboardAxisAlignment.X,
  );
  const billboard2 = createBillboard(
    'Billboard2',
    BillboardTargetType.Entity,
    BillboardAxisAlignment.Y,
  );
  const billboard3 = createBillboard(
    'Billboard3',
    BillboardTargetType.Entity,
    BillboardAxisAlignment.Z,
  );
  const billboard4 = createBillboard(
    'Billboard4',
    BillboardTargetType.Entity,
    BillboardAxisAlignment.None,
  );

  root.addChild(billboard1);
  root.addChild(billboard2);
  root.addChild(billboard3);
  root.addChild(billboard4);
};

export const createLinkButtons = async (viverseApp: IViverseApp, root: pc.Entity) => {
  const fontAsset = await loadFontAsset(viverseApp.pcApp, `roboto-medium`, '/fonts/');

  const screen = new pc.Entity('LinkButtonScreen');
  screen.addComponent('screen', {
    referenceResolution: new pc.Vec2(1280, 1024),
    screenSpace: true,
  });
  root.addChild(screen);

  const createButton = (name: string, text: string, offset: pc.Vec2) => {
    const button = new pc.Entity(name);
    button.addComponent('element', {
      type: 'image',
      color: new pc.Color(0.5, 0.5, 0.5),
      pivot: [0.5, 0.5],
      anchor: [0.5, 0.5, 0.5, 0.5],
      width: 180,
      height: 70,
      layers: [pc.LAYERID_WORLD],
    });
    button.addComponent('button', {
      hoverTint: new pc.Color(0.7, 0.7, 0.7),
      transitionMode: pc.BUTTON_TRANSITION_MODE_TINT,
      imageEntity: button,
    });
    button.element!.useInput = true;

    const textEntity = new pc.Entity(`${name}Text`);
    textEntity.addComponent('element', {
      type: 'text',
      text: text,
      fontSize: 24,
      fontAsset: fontAsset,
      color: new pc.Color(1, 1, 1),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      alignment: [0.5, 0.5],
      autoWidth: true,
      autoHeight: true,
      useInput: true,
      layers: [pc.LAYERID_WORLD],
    });
    button.addChild(textEntity);
    button.setLocalPosition(offset.x, offset.y, 0);
    return button;
  };

  const newTabButton = createButton('NewTabButton', 'New Tab', new pc.Vec2(200, 0));
  const currentTabButton = createButton('CurrentTabButton', 'Current Tab', new pc.Vec2(-200, 0));

  newTabButton.button!.on('click', () => {
    new OpenLinkAction(viverseApp, {
      link: 'https://www.viverse.com',
      openInNewTab: true,
    }).execute();
  });
  currentTabButton.button!.on('click', () => {
    new OpenLinkAction(viverseApp, {
      link: 'https://www.viverse.com',
      openInNewTab: false,
    }).execute();
  });

  screen.addChild(newTabButton);
  screen.addChild(currentTabButton);
};
