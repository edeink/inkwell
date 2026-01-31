/** @jsxImportSource @/utils/compiler */

/**
 * @file 玻璃按钮入口：通用逻辑协调、特效组合与生命周期管理
 * @author @trae
 * @since 0.0.0
 */
import {
  createCyberpunkEffect,
  createFrostEffect,
  createPrismEffect,
  createRimEffect,
  createSparkleEffect,
  createWaveEffect,
} from './effects';
import { GlassButtonPainter as GlassButtonPainterWidget } from './glass-button-painter.tsx';

import type {
  GlassButtonEffect,
  GlassButtonEffectConfigMap,
  GlassButtonEffectName,
  GlassButtonEffectRuntimeContext,
} from './effects';
import type { GlassButtonPainter } from './glass-button-painter.tsx';
import type { BoxConstraints, EventHandler, InkwellEvent, Size, WidgetProps } from '@/core';
import type { ThemePalette } from '@/styles/theme';

import {
  AlignmentGeometry,
  Positioned,
  SizedBox,
  Stack,
  StackFit,
  StatefulWidget,
  Text,
  TextAlign,
  TextAlignVertical,
} from '@/core';
import { applyAlpha } from '@/core/helper/color';
import { Themes } from '@/styles/theme';

/**
 * @description 玻璃按钮可用特效（默认支持 4 种，额外内置 3 种）
 */
export type GlassButtonActiveVariant = Extract<
  GlassButtonEffectName,
  'rim' | 'wave' | 'rhythm' | 'prism' | 'cyberpunk' | 'frost'
>;

type GlassButtonAnyEffectConfig = Partial<
  GlassButtonEffectConfigMap[keyof GlassButtonEffectConfigMap]
>;

export type GlassButtonEffectConfig =
  | GlassButtonAnyEffectConfig
  | {
      hover?: GlassButtonAnyEffectConfig;
      active?: GlassButtonAnyEffectConfig;
    };

export interface GlassButtonProps extends WidgetProps {
  /** 按钮宽度（在布局约束允许时生效） */
  width?: number;
  /** 按钮高度（在布局约束允许时生效） */
  height?: number;
  /** 按钮主题调色板（不传则使用默认主题） */
  theme?: ThemePalette;
  /** 按钮文案 */
  text?: string;
  /** 左侧字形/图标字符（为空则不渲染字形位） */
  glyph?: string;
  /** 特效主色（会注入到特效上下文作为 tint） */
  tint?: string;
  /** 激活特效类型（兼容旧字段：activeType 优先级高于 activeVariant） */
  activeType?: GlassButtonActiveVariant;
  /** 激活特效名称 */
  activeVariant?: GlassButtonActiveVariant;
  /** 音乐频谱数据（仅 rhythm 会读取并参与 update） */
  musicSpectrum?: Float32Array | number[];
  /** 特效配置（由当前 activeVariant 对应的特效解析） */
  config?: GlassButtonEffectConfig;
}

/**
 * @description 玻璃按钮组件
 */
export class GlassButton extends StatefulWidget<GlassButtonProps> {
  private btnW?: number;
  private btnH?: number;
  private theme?: ThemePalette;
  private text: string = '按钮';
  private glyph: string = '';
  private tint: string = '#ffffff';
  private activeVariant: GlassButtonActiveVariant = 'rim';

  private isPressed: boolean = false;
  private activeTarget: number = 0;
  private activeT: number = 0;
  private hoverTarget: number = 0;
  private hoverT: number = 0;
  private phase: number = 0;
  private lastTickAt: number = 0;
  private pressX: number = 0;
  private pressY: number = 0;
  private hoverX: number = 0;
  private hoverY: number = 0;
  private removeTick?: () => void;

  private musicSpectrum?: Float32Array | number[];
  private config?: GlassButtonEffectConfig;

  private effects?: Partial<Record<GlassButtonEffectName, GlassButtonEffect>>;
  private customEffect?: GlassButtonEffect;

  private painter?: GlassButtonPainter;

  private userPointerDownCapture?: EventHandler;
  private userPointerUpCapture?: EventHandler;
  private userPointerMoveCapture?: EventHandler;
  private userPointerEnterCapture?: EventHandler;
  private userPointerLeaveCapture?: EventHandler;
  private userPointerOutCapture?: EventHandler;

  /**
   * @description 指针进入：进入 hover 状态并启动逐帧更新
   * @param e {InkwellEvent} 指针事件
   * @returns {void}
   */
  private onPointerEnterCapture = (e: InkwellEvent) => {
    const user = this.userPointerEnterCapture;
    if (user) {
      user(e);
    }
    this.hoverX = Number.isFinite(e.x) ? e.x : this.hoverX;
    this.hoverY = Number.isFinite(e.y) ? e.y : this.hoverY;
    this.hoverTarget = 1;
    this.syncPainter();
    this.ensureTicking();
    this.markNeedsPaint();
  };

  /**
   * @description 指针按下：进入 active 状态并记录按下位置
   * @param e {InkwellEvent} 指针事件
   * @returns {void}
   */
  private onPointerDownCapture = (e: InkwellEvent) => {
    const user = this.userPointerDownCapture;
    if (user) {
      user(e);
    }
    this.isPressed = true;
    this.pressX = Number.isFinite(e.x) ? e.x : this.pressX;
    this.pressY = Number.isFinite(e.y) ? e.y : this.pressY;
    this.hoverX = this.pressX;
    this.hoverY = this.pressY;
    this.activeTarget = 1;
    this.hoverTarget = 1;
    this.syncPainter();
    this.ensureTicking();
    this.markNeedsPaint();
  };

  /**
   * @description 指针抬起：退出 active，保持 hover 并继续动画回弹
   * @param e {InkwellEvent} 指针事件
   * @returns {void}
   */
  private onPointerUpCapture = (e: InkwellEvent) => {
    const user = this.userPointerUpCapture;
    if (user) {
      user(e);
    }
    this.isPressed = false;
    this.activeTarget = 0;
    this.hoverX = Number.isFinite(e.x) ? e.x : this.hoverX;
    this.hoverY = Number.isFinite(e.y) ? e.y : this.hoverY;
    this.hoverTarget = 1;
    this.syncPainter();
    this.ensureTicking();
    this.markNeedsPaint();
  };

  /**
   * @description 指针移动：更新 hover 锚点并启动逐帧更新
   * @param e {InkwellEvent} 指针事件
   * @returns {void}
   */
  private onPointerMoveCapture = (e: InkwellEvent) => {
    const user = this.userPointerMoveCapture;
    if (user) {
      user(e);
    }
    this.hoverX = Number.isFinite(e.x) ? e.x : this.hoverX;
    this.hoverY = Number.isFinite(e.y) ? e.y : this.hoverY;
    if (!this.isPressed) {
      this.hoverTarget = 1;
    }
    this.syncPainter();
    this.ensureTicking();
    this.markNeedsPaint();
  };

  /**
   * @description 指针离开：若未按下则退出 hover/active，并停止后续动画
   * @param e {InkwellEvent} 指针事件
   * @returns {void}
   */
  private onPointerLeaveCapture = (e: InkwellEvent) => {
    const user = this.userPointerLeaveCapture;
    if (user) {
      user(e);
    }
    if (this.isPressed) {
      return;
    }
    this.activeTarget = 0;
    this.hoverTarget = 0;
    this.syncPainter();
    this.ensureTicking();
    this.markNeedsPaint();
  };

  /**
   * @description 指针出界：与 leave 行为一致（用于兼容不同事件派发策略）
   * @param e {InkwellEvent} 指针事件
   * @returns {void}
   */
  private onPointerOutCapture = (e: InkwellEvent) => {
    const user = this.userPointerOutCapture;
    if (user) {
      user(e);
    }
    if (this.isPressed) {
      return;
    }
    this.activeTarget = 0;
    this.hoverTarget = 0;
    this.syncPainter();
    this.ensureTicking();
    this.markNeedsPaint();
  };

  /**
   * @description 初始化：读取 props、注入事件回调、创建特效与同步 painter
   * @param data {GlassButtonProps} 初始 props
   * @returns {Widget} 当前组件实例
   */
  createElement(data: GlassButtonProps) {
    this.btnW = typeof data.width === 'number' ? data.width : undefined;
    this.btnH = typeof data.height === 'number' ? data.height : undefined;
    this.theme = data.theme;
    this.text = typeof data.text === 'string' && data.text ? data.text : this.text;
    this.glyph = typeof data.glyph === 'string' ? data.glyph : '';
    this.tint = typeof data.tint === 'string' && data.tint ? data.tint : this.tint;

    const nextActiveType = (data as unknown as { activeType?: unknown }).activeType;
    const nextActiveVariant = (data as unknown as { activeVariant?: unknown }).activeVariant;
    const nextActive = (typeof nextActiveType === 'string' ? nextActiveType : nextActiveVariant) as
      | GlassButtonActiveVariant
      | undefined;
    this.activeVariant =
      nextActive === 'rim' ||
      nextActive === 'wave' ||
      nextActive === 'rhythm' ||
      nextActive === 'prism' ||
      nextActive === 'cyberpunk' ||
      nextActive === 'frost'
        ? nextActive
        : this.activeVariant;

    const nextMusicSpectrum = (data as unknown as { musicSpectrum?: unknown }).musicSpectrum;
    this.musicSpectrum =
      nextMusicSpectrum instanceof Float32Array || Array.isArray(nextMusicSpectrum)
        ? (nextMusicSpectrum as Float32Array | number[])
        : undefined;

    const nextConfig =
      (data as unknown as { config?: unknown; musicConfig?: unknown }).config ??
      (data as unknown as { config?: unknown; musicConfig?: unknown }).musicConfig;
    this.config =
      nextConfig && typeof nextConfig === 'object'
        ? (nextConfig as GlassButtonEffectConfig)
        : undefined;

    const nextCursor = (data as unknown as { cursor?: unknown }).cursor;
    if (typeof nextCursor === 'undefined') {
      (data as unknown as { cursor: string }).cursor = 'pointer';
    }

    const nextDownCapture = (data as unknown as { onPointerDownCapture?: unknown })
      .onPointerDownCapture;
    this.userPointerDownCapture =
      typeof nextDownCapture === 'function' && nextDownCapture !== this.onPointerDownCapture
        ? (nextDownCapture as EventHandler)
        : undefined;
    (data as unknown as { onPointerDownCapture: EventHandler }).onPointerDownCapture =
      this.onPointerDownCapture;

    const nextUpCapture = (data as unknown as { onPointerUpCapture?: unknown }).onPointerUpCapture;
    this.userPointerUpCapture =
      typeof nextUpCapture === 'function' && nextUpCapture !== this.onPointerUpCapture
        ? (nextUpCapture as EventHandler)
        : undefined;
    (data as unknown as { onPointerUpCapture: EventHandler }).onPointerUpCapture =
      this.onPointerUpCapture;

    const nextMoveCapture = (data as unknown as { onPointerMoveCapture?: unknown })
      .onPointerMoveCapture;
    this.userPointerMoveCapture =
      typeof nextMoveCapture === 'function' && nextMoveCapture !== this.onPointerMoveCapture
        ? (nextMoveCapture as EventHandler)
        : undefined;
    (data as unknown as { onPointerMoveCapture: EventHandler }).onPointerMoveCapture =
      this.onPointerMoveCapture;

    const nextEnterCapture = (data as unknown as { onPointerEnterCapture?: unknown })
      .onPointerEnterCapture;
    this.userPointerEnterCapture =
      typeof nextEnterCapture === 'function' && nextEnterCapture !== this.onPointerEnterCapture
        ? (nextEnterCapture as EventHandler)
        : undefined;
    (data as unknown as { onPointerEnterCapture: EventHandler }).onPointerEnterCapture =
      this.onPointerEnterCapture;

    const nextLeaveCapture = (data as unknown as { onPointerLeaveCapture?: unknown })
      .onPointerLeaveCapture;
    this.userPointerLeaveCapture =
      typeof nextLeaveCapture === 'function' && nextLeaveCapture !== this.onPointerLeaveCapture
        ? (nextLeaveCapture as EventHandler)
        : undefined;
    (data as unknown as { onPointerLeaveCapture: EventHandler }).onPointerLeaveCapture =
      this.onPointerLeaveCapture;

    const nextOutCapture = (data as unknown as { onPointerOutCapture?: unknown })
      .onPointerOutCapture;
    this.userPointerOutCapture =
      typeof nextOutCapture === 'function' && nextOutCapture !== this.onPointerOutCapture
        ? (nextOutCapture as EventHandler)
        : undefined;
    (data as unknown as { onPointerOutCapture: EventHandler }).onPointerOutCapture =
      this.onPointerOutCapture;

    this.ensureEffects();
    this.syncPainter();
    return super.createElement(data);
  }

  /**
   * @description props 更新后同步 painter 并触发重绘
   * @returns {void}
   */
  protected didUpdateWidget(): void {
    this.syncPainter();
    this.markNeedsPaint();
  }

  /**
   * @description 释放：停止逐帧更新并释放特效资源
   * @returns {void}
   */
  dispose(): void {
    this.stopTicking();
    this.disposeEffects();
    super.dispose();
  }

  /**
   * @description 在运行时切换特效（传入字符串时等价于切换 activeVariant）
   * @param effect {GlassButtonEffect | GlassButtonActiveVariant} 特效实例或名称
   * @returns {void}
   */
  useEffect(effect: GlassButtonEffect | GlassButtonActiveVariant): void {
    if (typeof effect === 'string') {
      this.customEffect = undefined;
      this.activeVariant = effect;
    } else {
      this.customEffect = effect;
    }
    this.syncPainter();
    this.ensureTicking();
    this.markNeedsPaint();
  }

  /**
   * @description 确保进入逐帧更新：用于 hover/active 动画与特效推进
   */
  private ensureTicking(): void {
    const rt = this.runtime;
    if (!rt) {
      return;
    }
    if (!this.removeTick) {
      this.removeTick = rt.addTickListener(() => {
        this.handleActiveTick();
      });
    }
    rt.requestTick();
  }

  /**
   * @description 停止逐帧更新并重置计时基准
   */
  private stopTicking(): void {
    if (this.removeTick) {
      this.removeTick();
      this.removeTick = undefined;
    }
    this.lastTickAt = 0;
  }

  /**
   * @description 每帧推进交互状态，并驱动特效 update
   */
  private handleActiveTick(): void {
    const rt = this.runtime;
    if (!rt || this.isDisposed()) {
      this.stopTicking();
      return;
    }
    const now = performance.now();
    const dt =
      this.lastTickAt > 0 ? Math.max(0, Math.min(0.05, (now - this.lastTickAt) / 1000)) : 0;
    this.lastTickAt = now;
    if (dt > 0) {
      const speed = 18;
      const k = 1 - Math.exp(-speed * dt);
      this.activeT += (this.activeTarget - this.activeT) * k;
      this.hoverT += (this.hoverTarget - this.hoverT) * k;
      this.phase += dt;
      this.updateEffects(dt);
      this.syncPainter();
    }
    const needsKeepAlive = this.activeTarget > 0.5 || this.hoverTarget > 0.5;
    const diffA = Math.abs(this.activeTarget - this.activeT);
    const diffH = Math.abs(this.hoverTarget - this.hoverT);
    const needsAnimate = diffA > 0.002 || diffH > 0.002;
    if (!needsKeepAlive && !needsAnimate) {
      this.activeT = this.activeTarget;
      this.hoverT = this.hoverTarget;
      this.stopTicking();
      this.markNeedsPaint();
      return;
    }
    this.markNeedsPaint();
    rt.requestTick();
  }

  /**
   * @description 将当前交互/特效状态同步给绘制层（painter）
   * @returns {void}
   */
  private syncPainter(): void {
    const painter = this.painter;
    if (!painter) {
      return;
    }
    const theme = this.theme ?? Themes.light;
    painter.setFrameState({
      theme,
      tint: this.tint,
      glyph: this.glyph,
      activeVariant: this.activeVariant,
      activeT: this.activeT,
      hoverT: this.hoverT,
      pressX: this.pressX,
      pressY: this.pressY,
      hoverX: this.hoverX,
      hoverY: this.hoverY,
      phase: this.phase,
      effect: this.getActiveEffect(),
    });
  }

  /**
   * @description 懒加载创建内置特效实例（在首次 createElement 时触发）
   * @returns {void}
   */
  private ensureEffects(): void {
    if (this.effects) {
      return;
    }
    this.effects = {
      rim: createRimEffect(),
      wave: createWaveEffect(),
      prism: createPrismEffect(),
      rhythm: createSparkleEffect(),
      cyberpunk: createCyberpunkEffect(),
      frost: createFrostEffect(),
    };
  }

  /**
   * @description 释放所有特效实例与自定义特效引用
   * @returns {void}
   */
  private disposeEffects(): void {
    if (this.effects) {
      for (const k of Object.keys(this.effects) as GlassButtonEffectName[]) {
        this.effects[k]?.dispose();
      }
      this.effects = undefined;
    }
    if (this.customEffect) {
      this.customEffect.dispose();
      this.customEffect = undefined;
    }
  }

  /**
   * @description 获取特效随机种子（尽量稳定，便于特效“记住”风格）
   * @returns {string} 种子
   */
  private getEffectSeed(): string {
    return String((this.props as unknown as { key?: unknown }).key ?? this.key ?? '');
  }

  /**
   * @description 获取当前生效的特效（优先自定义，其次 activeVariant）
   * @returns {GlassButtonEffect} 当前特效
   */
  private getActiveEffect(): GlassButtonEffect {
    if (this.customEffect) {
      return this.customEffect;
    }
    this.ensureEffects();
    const fx = this.effects?.[this.activeVariant];
    if (fx) {
      return fx;
    }
    return this.effects?.rim ?? createRimEffect();
  }

  /**
   * @description 生成特效运行时上下文（用于 update）
   */
  private createEffectRuntimeContext(): GlassButtonEffectRuntimeContext {
    const theme = this.theme ?? Themes.light;
    const { width, height } = this.renderObject.size;
    return {
      theme,
      width,
      height,
      tint: this.tint,
      phase: this.phase,
      activeT: this.activeT,
      hoverT: this.hoverT,
      musicSpectrum: this.musicSpectrum,
      config: this.config,
      seed: this.getEffectSeed(),
    };
  }

  /**
   * @description 推进当前生效特效的 update（统一由按钮逐帧循环驱动）
   * @param dt {number} 帧时间（秒）
   * @returns {void}
   */
  private updateEffects(dt: number): void {
    const fx = this.getActiveEffect();
    const ctx = this.createEffectRuntimeContext();
    fx.update(dt, ctx);
  }

  /**
   * @description 根据约束与 props 计算按钮最终尺寸（用于自身与子节点一致）
   */
  private computeButtonSize(constraints: BoxConstraints): Size {
    const maxW = Number.isFinite(constraints.maxWidth) ? constraints.maxWidth : 420;
    const maxH = Number.isFinite(constraints.maxHeight) ? constraints.maxHeight : 240;
    const minW = Number.isFinite(constraints.minWidth) ? constraints.minWidth : 0;
    const minH = Number.isFinite(constraints.minHeight) ? constraints.minHeight : 0;
    const w0 = typeof this.btnW === 'number' ? this.btnW : 240;
    const h0 = typeof this.btnH === 'number' ? this.btnH : 72;
    const width = Math.max(minW, Math.min(w0, maxW));
    const height = Math.max(minH, Math.min(h0, maxH));
    return { width, height };
  }

  /**
   * @description 为子节点提供与自身一致的紧约束（确保绘制层覆盖按钮区域）
   * @param constraints {BoxConstraints} 父约束
   * @returns {BoxConstraints} 子约束
   */
  protected getConstraintsForChild(constraints: BoxConstraints): BoxConstraints {
    const s = this.computeButtonSize(constraints);
    return { minWidth: s.width, maxWidth: s.width, minHeight: s.height, maxHeight: s.height };
  }

  /**
   * @description 执行布局：按约束计算最终尺寸
   * @param constraints {BoxConstraints} 布局约束
   * @returns {Size} 布局尺寸
   */
  protected performLayout(constraints: BoxConstraints): Size {
    return this.computeButtonSize(constraints);
  }

  /**
   * @description 渲染按钮：包含绘制层与文本/字形层
   * @returns {unknown} JSX 元素
   */
  protected render() {
    const theme = this.theme ?? Themes.light;
    const constraints = this.renderObject.constraints as BoxConstraints | undefined;
    const size = constraints
      ? this.computeButtonSize(constraints)
      : { width: this.btnW ?? 240, height: this.btnH ?? 72 };
    const width = size.width;
    const height = size.height;

    const pad = Math.max(14, height * 0.2);
    const tileSize = this.glyph ? Math.min(height - pad, height * 0.72) : 0;
    const tileX = pad * 0.92;
    const tileY = (height - tileSize) / 2;
    const textX = this.glyph ? tileX + tileSize + pad * 0.82 : 0;
    const textW = this.glyph ? Math.max(0, width - textX) : width;

    const textSize = Math.round(Math.min(18, Math.max(12, height * 0.24)));
    const glyphSize = Math.round(tileSize * 0.52);

    return (
      <Stack alignment={AlignmentGeometry.TopLeft} fit={StackFit.Expand}>
        <GlassButtonPainterWidget
          ref={(w: unknown) => {
            this.painter = (w as unknown as GlassButtonPainter) || undefined;
            this.syncPainter();
          }}
          theme={theme}
          tint={this.tint}
          glyph={this.glyph}
          activeVariant={this.activeVariant}
        />
        {this.glyph ? (
          <Positioned left={tileX} top={tileY}>
            <SizedBox width={tileSize} height={tileSize}>
              <Text
                text={this.glyph}
                fontSize={glyphSize}
                fontWeight={800}
                color={applyAlpha(theme.text.primary, theme === Themes.dark ? 0.92 : 0.88)}
                textAlign={TextAlign.Center}
                textAlignVertical={TextAlignVertical.Center}
                height={tileSize}
              />
            </SizedBox>
          </Positioned>
        ) : null}

        <Positioned left={this.glyph ? textX : 0} top={0}>
          <SizedBox width={textW} height={height}>
            <Text
              text={this.text}
              fontSize={textSize}
              fontWeight={750}
              color={applyAlpha(theme.text.primary, theme === Themes.dark ? 0.92 : 0.9)}
              textAlign={this.glyph ? TextAlign.Left : TextAlign.Center}
              textAlignVertical={TextAlignVertical.Center}
              height={height}
            />
          </SizedBox>
        </Positioned>
      </Stack>
    );
  }
}
