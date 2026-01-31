/**
 * @file 玻璃按钮特效统一类型与上下文定义
 * @author @trae
 * @since 0.0.0
 */
import type { ThemePalette } from '@/styles/theme';

/**
 * @description 玻璃按钮特效名称（用于切换不同特效实现）
 */
export type GlassButtonEffectName = 'rim' | 'wave' | 'rhythm' | 'prism' | 'cyberpunk' | 'frost';

/**
 * @description 运行时注入给特效的上下文（在下一帧循环中更新）
 */
export interface GlassButtonEffectRuntimeContext {
  /** 当前主题 */
  theme: ThemePalette;
  /** 当前按钮宽度 */
  width: number;
  /** 当前按钮高度 */
  height: number;
  /** 当前 tint 颜色 */
  tint: string;
  /** 当前全局时间相位（秒） */
  phase: number;
  /** active 过渡进度（0..1） */
  activeT: number;
  /** hover 过渡进度（0..1） */
  hoverT: number;
  /** 可选：音乐频谱数据（0..1 或 0..255） */
  musicSpectrum?: Float32Array | number[];
  /** 可选：特效配置（由外层按钮透传，具体形状由各特效自行解析） */
  config?: unknown;
  /** 用于生成可复现随机数的种子 */
  seed: string;
}

/**
 * @description 绘制阶段注入给特效的上下文
 */
export interface GlassButtonEffectPaintContext {
  /** Canvas 2D 上下文 */
  ctx: CanvasRenderingContext2D;
  /** 当前主题 */
  theme: ThemePalette;
  /** 按钮宽度 */
  width: number;
  /** 按钮高度 */
  height: number;
  /** 按钮圆角半径 */
  radius: number;
  /** tint 颜色 */
  tint: string;
  /** 当前全局时间相位（秒） */
  phase: number;
  /**
   * @description 统一的滤镜设置函数
   * @param value {string | null} 新滤镜或恢复原滤镜
   * @returns {boolean} 当前 ctx 是否支持 filter
   */
  setFilter: (value: string | null) => boolean;
  /** 合成后的特效强度（0..1），已包含 hover->active 的自然过渡 */
  strength: number;
  /** 合成后特效锚点 X（像素） */
  x: number;
  /** 合成后特效锚点 Y（像素） */
  y: number;
  /** active 强度（0..1） */
  activeT: number;
  /** hover 强度（0..1） */
  hoverT: number;
}

/**
 * @description 玻璃按钮特效统一接口
 */
export interface GlassButtonEffect {
  /** 特效名称 */
  readonly name: GlassButtonEffectName;
  /**
   * @description 暂停特效更新（暂停后 update 不再推进内部状态）
   * @returns {void}
   */
  pause(): void;
  /**
   * @description 恢复特效更新
   * @returns {void}
   */
  resume(): void;
  /**
   * @description 在下一帧循环中更新内部状态（统一由按钮 nextTick 循环驱动）
   * @param dt {number} 帧时间（秒）
   * @param ctx {GlassButtonEffectRuntimeContext} 运行时上下文
   * @returns {void}
   */
  update(dt: number, ctx: GlassButtonEffectRuntimeContext): void;
  /**
   * @description 绘制特效
   * @param ctx {GlassButtonEffectPaintContext} 绘制上下文
   * @returns {void}
   */
  paint(ctx: GlassButtonEffectPaintContext): void;
  /**
   * @description 释放资源，解绑引用，确保可被 GC
   * @returns {void}
   */
  dispose(): void;
}

/**
 * @description 创建具备 pause/resume 的基础特效包装器
 * @param name {GlassButtonEffectName} 特效名称
 * @param impl {Omit<GlassButtonEffect, 'name' | 'pause' | 'resume'>} 特效实现
 * @returns {GlassButtonEffect} 可直接挂载到按钮的特效实例
 */
export function createPausableEffect(
  name: GlassButtonEffectName,
  impl: Omit<GlassButtonEffect, 'name' | 'pause' | 'resume'>,
): GlassButtonEffect {
  let paused = false;
  return {
    name,
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
    },
    update(dt, ctx) {
      if (paused) {
        return;
      }
      impl.update(dt, ctx);
    },
    paint(ctx) {
      impl.paint(ctx);
    },
    dispose() {
      impl.dispose();
    },
  };
}
