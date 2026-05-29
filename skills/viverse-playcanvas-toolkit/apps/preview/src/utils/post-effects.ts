import * as pc from 'playcanvas';
import type { IPostEffect, IViverseApp } from '@viverse/types';
import { PostEffectType } from '@viverse/types';
import {
  BlendEffect,
  BloomEffect,
  BrightnessContrastEffect,
  EdgeDetectEffect,
  FxaaEffect,
  HorizontalTiltShiftEffect,
  HueSaturationEffect,
  SSAOEffect,
  VerticalTiltShiftEffect,
  VignetteEffect,
} from '@viverse/extension';

const getPostEffectInstance = (
  graphicsDevice: pc.GraphicsDevice,
  postEffectType: PostEffectType,
  config?: object,
): IPostEffect | null => {
  if (postEffectType === PostEffectType.BlendEffect) {
    return new BlendEffect(graphicsDevice, config);
  } else if (postEffectType === PostEffectType.BloomEffect) {
    return new BloomEffect(graphicsDevice, config);
  } else if (postEffectType === PostEffectType.BrightnessContrastEffect) {
    return new BrightnessContrastEffect(graphicsDevice, config);
  } else if (postEffectType === PostEffectType.EdgeDetectEffect) {
    return new EdgeDetectEffect(graphicsDevice, config);
  } else if (postEffectType === PostEffectType.FxaaEffect) {
    return new FxaaEffect(graphicsDevice);
  } else if (postEffectType === PostEffectType.HorizontalTiltShiftEffect) {
    return new HorizontalTiltShiftEffect(graphicsDevice, config);
  } else if (postEffectType === PostEffectType.HueSaturationEffect) {
    return new HueSaturationEffect(graphicsDevice, config);
  } else if (postEffectType === PostEffectType.SSAOEffect) {
    return new SSAOEffect(graphicsDevice, config);
  } else if (postEffectType === PostEffectType.VerticalTiltShiftEffect) {
    return new VerticalTiltShiftEffect(graphicsDevice, config);
  } else if (postEffectType === PostEffectType.VignetteEffect) {
    return new VignetteEffect(graphicsDevice, config);
  }

  return null;
};

export const applyPostEffects = (viverseApp: IViverseApp): void => {
  const cameraModule = viverseApp.systems.localPlayer?.modules.camera;
  const bloom = getPostEffectInstance(viverseApp.pcApp.graphicsDevice, PostEffectType.BloomEffect);
  const hueSaturation = getPostEffectInstance(
    viverseApp.pcApp.graphicsDevice,
    PostEffectType.HueSaturationEffect,
    {
      hue: 1,
    },
  );
  if (bloom !== null) {
    cameraModule?.addPostEffect(bloom);
  }
  if (hueSaturation !== null) {
    cameraModule?.addPostEffect(hueSaturation);
  }
};
