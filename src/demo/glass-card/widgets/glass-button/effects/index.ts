/**
 * @file 玻璃按钮特效聚合导出
 * @author @trae
 * @since 0.0.0
 */
export * from './effect-types';
export * from './frost-effect';
export * from './glitch-effect';
export * from './prism-effect';
export * from './rhythm-effect';
export * from './rim-effect';
export * from './wave-effect';

export { createSparkleEffect, createSparkleEffect as createRhythmEffect } from './rhythm-effect';

import type { GlassButtonEffectName } from './effect-types';
import type { GlassButtonFrostEffectConfig } from './frost-effect';
import type { GlassButtonCyberpunkEffectConfig } from './glitch-effect';
import type { GlassButtonPrismEffectConfig } from './prism-effect';
import type { GlassButtonMusicConfig } from './rhythm-effect';
import type { GlassButtonRimEffectConfig } from './rim-effect';
import type { GlassButtonWaveEffectConfig } from './wave-effect';

export type GlassButtonEffectConfigMap = {
  rim: GlassButtonRimEffectConfig;
  wave: GlassButtonWaveEffectConfig;
  rhythm: GlassButtonMusicConfig;
  prism: GlassButtonPrismEffectConfig;
  cyberpunk: GlassButtonCyberpunkEffectConfig;
  frost: GlassButtonFrostEffectConfig;
};

export type GlassButtonEffectConfigByName<Name extends GlassButtonEffectName> =
  Name extends keyof GlassButtonEffectConfigMap ? GlassButtonEffectConfigMap[Name] : never;
