import * as pc from 'playcanvas';
import type { IViverseApp } from '@viverse/types';
import {
  VideoTextureControls,
  VideoTexture,
  SoundControls,
  VideoTextureAudioZone,
  SoundAudioZone,
} from '@viverse/extension';

export const createMediaScene = (viverseApp: IViverseApp, root: pc.Entity): void => {
  const pcApp = viverseApp.pcApp;

  const flatVideoEntity = new pc.Entity('VideoTextureEntity');
  flatVideoEntity.setPosition(0, 1.5, -2);
  const videoSrc = '/media/sample-video.mp4';
  root.addChild(flatVideoEntity);
  const videoTexture = new VideoTexture(pcApp, flatVideoEntity, videoSrc, {
    projection: 'flat',
    autoPlay: true,
    loop: true,
    muted: true,
    positional: true,
  });
  new VideoTextureControls(pcApp, videoTexture);
  new VideoTextureAudioZone(viverseApp, videoTexture, {
    scale: new pc.Vec3(4, 4, 4),
  });

  const sphericalVideoEntity = new pc.Entity('VideoTextureEntityA');
  sphericalVideoEntity.setLocalScale(3, 3, 3);
  sphericalVideoEntity.setPosition(3, 1.5, -2);
  const videoSrcA = '/media/sample-video.mp4';
  pcApp.root.addChild(sphericalVideoEntity);
  const sphereVideoTexture = new VideoTexture(pcApp, sphericalVideoEntity, videoSrcA, {
    projection: 'spherical',
    renderSide: 'back',
    autoPlay: true,
    muted: false,
    loop: true,
  });
  new VideoTextureControls(pcApp, sphereVideoTexture);

  const soundEntity = new pc.Entity('SoundEntity');
  soundEntity.setPosition(-3, 1.5, -2);
  pcApp.root.addChild(soundEntity);
  const sound = soundEntity.addComponent('sound', {
    positional: true,
    maxDistance: 20,
  }) as pc.SoundComponent;
  const soundAsset = new pc.Asset('music', 'audio', { url: '/media/sample-audio.mp3' });
  pcApp.assets.add(soundAsset);
  sound.addSlot('music', {
    volume: 1,
    loop: true,
    asset: soundAsset.id,
    autoPlay: false,
  });

  new SoundControls(pcApp, sound);
  new SoundAudioZone(viverseApp, sound, {
    scale: new pc.Vec3(4, 4, 4),
  });
};
