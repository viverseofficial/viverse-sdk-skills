import * as pc from 'playcanvas';
import type { IViverseApp } from '@viverse/types';
import { SitInteraction } from '@viverse/extension';

type SceneSeatConfig = {
  position: pc.Vec3;
  eulerAngles?: pc.Vec3;
  seatRadius?: number;
  exitPosition?: pc.Vec3;
};

const createBackwardIndicator = (app: pc.Application, seatEntity: pc.Entity): pc.Entity => {
  const indicator = new pc.Entity('BackwardIndicator');
  const color = new pc.Color(0.2, 1, 0.2);

  // Create sphere (head of the arrow)
  const sphere = new pc.Entity('Sphere');
  sphere.addComponent('render', {
    type: 'sphere',
    material: (() => {
      const material = new pc.StandardMaterial();
      material.diffuse = color;
      material.emissive = color;
      material.update();
      return material;
    })(),
  });
  sphere.setLocalScale(0.15, 0.15, 0.15);
  sphere.setLocalPosition(0, 0.5, 0.4);
  indicator.addChild(sphere);

  // Create cylinder (shaft of the arrow)
  const cylinder = new pc.Entity('Cylinder');
  cylinder.addComponent('render', {
    type: 'cylinder',
    material: (() => {
      const material = new pc.StandardMaterial();
      material.diffuse = color;
      material.emissive = color;
      material.update();
      return material;
    })(),
  });
  cylinder.setLocalScale(0.05, 0.5, 0.05);
  cylinder.setLocalPosition(0, 0.5, 0.2);
  cylinder.rotateLocal(90, 0, 0);
  indicator.addChild(cylinder);
  app.root.addChild(indicator);
  const syncPosition = () => {
    const worldPos = seatEntity.getPosition();
    const worldRot = seatEntity.getRotation();
    indicator.setPosition(worldPos);
    indicator.setRotation(worldRot);
  };

  app.on('update', syncPosition);
  return indicator;
};

const createSeatEntity = (
  config: SceneSeatConfig,
  parent: pc.Entity,
  app: pc.Application,
): pc.Entity => {
  const entity = new pc.Entity('SeatSpot');
  entity.setLocalPosition(config.position);
  entity.setEulerAngles(config.eulerAngles || new pc.Vec3(0, 0, 0));

  // Add collision component, only for visualization/debugging purposes
  const radius = config.seatRadius || 0.25;
  entity.addComponent('collision', {
    type: 'cylinder',
    height: 0.01,
    radius,
  });

  // Add to parent seat entity
  parent.addChild(entity);

  // Create backward indicator
  createBackwardIndicator(app, entity);

  return entity;
};

const rollerCoasterMovement = (
  entity: pc.Entity,
  center: pc.Vec3,
  radius: number,
  speed: number,
  app: pc.Application,
  pauseDuration: number = 3,
) => {
  let currentAngle = 0;
  let isPaused = false;
  let pauseTimer = 0;

  const updatePosition = (dt: number) => {
    if (isPaused) {
      pauseTimer += dt;
      if (pauseTimer >= pauseDuration) {
        isPaused = false;
        pauseTimer = 0;
      }
      return;
    }

    currentAngle += speed * dt;

    // Check if returned near the origin (angle close to multiples of 2π)
    if (currentAngle >= 2 * Math.PI) {
      // Check if close to original position (angle is 0)
      const currentX = center.x + Math.cos(currentAngle) * radius;
      const currentZ = center.z + Math.sin(currentAngle) * radius;
      const distanceToOrigin = Math.sqrt(
        Math.pow(currentX - center.x, 2) + Math.pow(currentZ - center.z, 2),
      );

      // Check if close to origin (angle is 0)
      if (distanceToOrigin < 0.5) {
        currentAngle = 0; // Reset angle but keep on track
        isPaused = true;
      } else {
        currentAngle = currentAngle - 2 * Math.PI; // Continue looping to avoid angle accumulation
      }
    }

    // Calculate new position on circular path
    const x = center.x + Math.cos(currentAngle) * radius;
    const z = center.z + Math.sin(currentAngle) * radius;
    const y = center.y + Math.sin(currentAngle * 2) * 0.5; // Add some vertical undulation

    entity.setPosition(x, y, z);

    // Calculate rotation with pitch and roll effects for roller coaster feel
    const facingAngle = currentAngle + Math.PI / 2;
    const yaw = (facingAngle * 180) / Math.PI;

    // Add pitch based on vertical movement speed
    const verticalSpeed = Math.cos(currentAngle * 2) * 2 * speed; // derivative of y movement
    const pitch = verticalSpeed * 15; // Scale factor for pitch intensity

    // Add slight roll based on turning and height changes
    const roll = Math.sin(currentAngle * 3) * 8 + Math.sin(currentAngle * 2) * 3; // Gentle roll effect

    entity.setLocalEulerAngles(pitch, yaw, roll);
  };

  // Add update function to app update loop
  app.on('update', updatePosition);
};

const createDynamicExitPoint = (parent: pc.Entity, app: pc.Application): pc.Entity => {
  const exitPoint = new pc.Entity('DynamicExitPoint');
  exitPoint.setLocalPosition(1.5, 0, 0);

  // Add render component for visualization
  exitPoint.addComponent('render', {
    type: 'sphere',
    material: (() => {
      const material = new pc.StandardMaterial();
      material.diffuse = new pc.Color(1, 0.2, 0.2); // Red color
      material.metalness = 0.3;
      material.update();
      return material;
    })(),
  });

  exitPoint.setLocalScale(0.3, 0.3, 0.3);
  parent.addChild(exitPoint);

  // Add floating animation
  let time = 0;
  const floatSpeed = 2;
  const floatAmplitude = 0.5;
  const originalY = exitPoint.getLocalPosition().y;

  const updateFloat = (dt: number) => {
    time += dt;
    const newY = originalY + Math.sin(time * floatSpeed) * floatAmplitude;
    const currentPos = exitPoint.getLocalPosition();
    exitPoint.setLocalPosition(currentPos.x, newY, currentPos.z);
  };

  app.on('update', updateFloat);

  return exitPoint;
};

export const createSeat = (
  name: string,
  viverseApp: IViverseApp,
  url: string,
  position: pc.Vec3,
  options?: {
    eulerAngles?: pc.Vec3;
    scale?: pc.Vec3;
    seats?: SceneSeatConfig[];
  },
): pc.Entity => {
  const app = viverseApp.pcApp as pc.Application;

  const rootEntity = new pc.Entity('Seat' + (name ? `_${name}` : ''));
  rootEntity.setPosition(position);

  if (options?.scale) {
    rootEntity.setLocalScale(options.scale);
  }

  if (options?.eulerAngles) {
    rootEntity.setLocalEulerAngles(options.eulerAngles);
  }

  // Create seat entities as children of the seat
  if (options?.seats) {
    options.seats.forEach((config, index) => {
      const seatEntity = createSeatEntity(config, rootEntity, app);
      const seatName = `${name}_Seat_${index}`;

      // Register each seat as an individual seat
      viverseApp.systems.localPlayer?.modules.interaction?.addSeat(seatName, seatEntity, {
        exitPosition: config.exitPosition,
        seatRadius: config.seatRadius || 0.25,
      });
    });
  }

  app.assets.loadFromUrl(url, 'container', (err, asset) => {
    if (err) {
      console.error('Failed to load GLB:', url, err);
      return;
    }
    const container = asset as pc.Asset;
    const resource = container.resource as pc.ContainerResource;
    const modelEntity: pc.Entity = resource.instantiateRenderEntity({
      castShadows: true,
    });
    modelEntity.name = `Model(${url.split('/')?.pop()})`;
    rootEntity.addChild(modelEntity);
  });

  return rootEntity;
};

export const createSeatScene = (viverseApp: IViverseApp, root: pc.Entity): void => {
  const victorian = createSeat(
    'Victorian',
    viverseApp,
    'glb/victorian-seat.glb',
    new pc.Vec3(-2.8, 0.6, 1.5),
    {
      scale: new pc.Vec3(0.5, 0.5, 0.5),
      eulerAngles: new pc.Vec3(0, 65, 0),
      seats: [
        {
          position: new pc.Vec3(0.9, 0.2, 0.25),
        },
        {
          position: new pc.Vec3(-0.9, 0.2, 0.25),
        },
      ],
    },
  );

  // GamingChair with roller coaster movement
  const originalGamingChairPosition = new pc.Vec3(2.5, -0.1, 2.2);
  const gamingChair = createSeat(
    'GamingChair',
    viverseApp,
    'glb/gaming-chair.glb',
    originalGamingChairPosition.clone(),
    {
      scale: new pc.Vec3(0.4, 0.4, 0.4),
      seats: [
        {
          position: new pc.Vec3(0, 2.5, 0.2),
          exitPosition: new pc.Vec3(0, 0.5, 0),
        },
      ],
    },
  );

  // Add roller coaster movement to gaming chair
  const app = viverseApp.pcApp as pc.Application;
  const circleRadius = 3;
  const moveSpeed = 0.3;
  const pauseDuration = 3;
  rollerCoasterMovement(
    gamingChair,
    originalGamingChairPosition,
    circleRadius,
    moveSpeed,
    app,
    pauseDuration,
  );

  const sciFiChair = createSeat(
    'SciFiSeat',
    viverseApp,
    'glb/sci-fi-seat.glb',
    new pc.Vec3(3.2, 0, -1.8),
    {
      scale: new pc.Vec3(0.015, 0.015, 0.015),
      eulerAngles: new pc.Vec3(0, -105, 0),
      seats: [
        {
          position: new pc.Vec3(0, 50, 8),
          seatRadius: 0.25,
        },
      ],
    },
  );

  const sofa = createSeat('Sofa', viverseApp, 'glb/sofa.glb', new pc.Vec3(-1.8, 0.4, -3.1), {
    eulerAngles: new pc.Vec3(0, 155, 0),
    seats: [
      {
        position: new pc.Vec3(0, 0.35, 0),
        seatRadius: 0.7,
      },
    ],
  });

  // For debug rotated seat
  sofa.rotateLocal(90, 0, 0);
  const position = sofa.getPosition();
  sofa.setLocalPosition(position.x, position.y + 1, position.z);

  // use SitInteraction for BarSeat
  const barSeat = createSeat('BarSeat', viverseApp, 'glb/bar-seat.glb', new pc.Vec3(0.5, 0, 3.5), {
    scale: new pc.Vec3(1, 1.2, 1.2),
  });

  const barSeatEntity = new pc.Entity('BarSeat_SeatSpot');
  barSeatEntity.setLocalPosition(0, 0.88, 0);
  barSeat.addChild(barSeatEntity);
  const pcApp = viverseApp.pcApp as pc.Application;
  const dynamicExitPoint = createDynamicExitPoint(barSeatEntity, pcApp);
  const barSeatInteractionConfig = {
    name: 'BarSeat_Interactive',
    seatRadius: 0.18,
    standUpOnMoveInput: false,
    useHintIcon: true,
    rangeRadius: {
      inner: 1.0,
      outer: 2.0,
    },
    exitPoint: dynamicExitPoint,
  };
  new SitInteraction(viverseApp, barSeatEntity, barSeatInteractionConfig);
  createBackwardIndicator(pcApp, barSeatEntity);

  root.addChild(victorian);
  root.addChild(gamingChair);
  root.addChild(sciFiChair);
  root.addChild(sofa);
  root.addChild(barSeat);
};
