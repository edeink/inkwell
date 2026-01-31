/** @jsxImportSource @/utils/compiler */
import { GlassChartProgressRing, GlassChartSlot } from './glass-chart-effect';
import { GlassRoundButton } from './glass-round-button';
import { MINUS_SVG, PLUS_SVG } from './svgs';

import type { ThemePalette } from '@/styles/theme';

import {
  CrossAxisAlignment,
  MainAxisAlignment,
  MainAxisSize,
  Positioned,
  RichText,
  Row,
  SizedBox,
  Stack,
  StatefulWidget,
  Text,
  type InkwellEvent,
  type Widget,
  type WidgetProps,
} from '@/core';
import { applyAlpha } from '@/core/helper/color';
import { Themes } from '@/styles/theme';

/**
 * GlassChart demo 卡片：
 * - GlassChartSlot 绘制背景/槽位结构
 * - GlassChartProgressRing 绘制进度环本体（可切换不同风格）
 * - 底部按钮负责调节进度与切换风格
 */
export interface GlassChartCardProps extends WidgetProps {
  width?: number;
  height?: number;
  theme?: ThemePalette;
  title?: string;
  progress?: number;
}

const DEFAULT_TITLE = 'Chart';
const DEFAULT_WIDTH = 360;
const DEFAULT_HEIGHT = 460;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const clampPercent = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export class GlassChartCard extends StatefulWidget<
  GlassChartCardProps,
  { percentTarget: number; progress: number }
> {
  /**
   * percentTarget: UI 输入目标值（整数百分比）
   * progress: 绘制进度（0~1）
   * progressStyle: 进度环风格
   */
  protected state = {
    percentTarget: 36,
    progress: 0.36,
  };

  /**
   * 仅用于 demo 过渡动画的 RAF 句柄，避免多次触发叠加。
   */
  private progressRaf: number | null = null;

  protected initWidget(data: GlassChartCardProps): void {
    const initialProgress =
      typeof data.progress === 'number' && Number.isFinite(data.progress)
        ? clamp01(data.progress)
        : 0.36;
    const pct = clampPercent(initialProgress * 100);
    this.state = { ...this.state, progress: pct / 100, percentTarget: pct };
  }

  protected didUpdateWidget(oldProps: GlassChartCardProps): void {
    const nextProgressRaw = this.data.progress;
    const oldProgressRaw = oldProps.progress;
    if (
      typeof nextProgressRaw === 'number' &&
      Number.isFinite(nextProgressRaw) &&
      nextProgressRaw !== oldProgressRaw
    ) {
      const pct = clampPercent(clamp01(nextProgressRaw) * 100);
      this.animateToPercent(pct);
    }
  }

  dispose(): void {
    if (this.progressRaf != null) {
      cancelAnimationFrame(this.progressRaf);
      this.progressRaf = null;
    }
    super.dispose();
  }

  private animateToPercent(nextPercent: number): void {
    const pct = clampPercent(nextPercent);
    if (this.progressRaf != null) {
      cancelAnimationFrame(this.progressRaf);
      this.progressRaf = null;
    }

    const from = clamp01(this.state.progress);
    const to = pct / 100;
    const duration = 320;
    const startTime = Date.now();

    this.setState({ percentTarget: pct });

    const loop = () => {
      const t = clamp01((Date.now() - startTime) / duration);
      const eased = easeOutCubic(t);
      const next = from + (to - from) * eased;
      if (t < 1) {
        this.setState({ progress: next });
        this.progressRaf = requestAnimationFrame(loop);
      } else {
        this.progressRaf = null;
        this.setState({ progress: to });
      }
    };

    this.progressRaf = requestAnimationFrame(loop);
  }

  private handleDelta = (delta: number) => (e: InkwellEvent) => {
    e.stopPropagation?.();
    const next = clampPercent(this.state.percentTarget + delta);
    this.animateToPercent(next);
  };

  render(): Widget {
    const theme = this.props.theme ?? Themes.light;
    const width = typeof this.props.width === 'number' ? this.props.width : DEFAULT_WIDTH;
    const height = typeof this.props.height === 'number' ? this.props.height : DEFAULT_HEIGHT;
    const title =
      typeof this.props.title === 'string' && this.props.title ? this.props.title : DEFAULT_TITLE;

    const p = clamp01(this.state.progress);
    const percent = clampPercent(p * 100);

    const pad = Math.max(18, Math.min(28, width * 0.08));
    const titleSize = Math.round(Math.min(34, Math.max(18, height * 0.07)));

    const cy = height * 0.49;
    const ringR = Math.min(width, height) * 0.335;
    const ringW = Math.max(22, Math.min(44, ringR * 0.32));
    const innerR = Math.max(1, ringR - ringW * 0.5);
    const diskR = Math.max(1, innerR - Math.max(10, ringW * 0.2));
    const midY = cy - diskR * 0.05;

    const numSize = Math.round(Math.min(62, Math.max(28, diskR * 0.52)));
    const unitSize = Math.round(numSize * 0.34);

    const btnR = Math.max(18, Math.min(24, Math.min(width, height) * 0.055));
    const btnD = btnR * 2;
    const btnGap = Math.max(16, btnR * 0.9);
    const bottomPad = Math.max(btnR + 18, pad * 0.95);

    const border = applyAlpha(theme.text.primary, theme === Themes.dark ? 0.18 : 0.08);
    const iconColor = applyAlpha(theme.text.primary, theme === Themes.dark ? 0.86 : 0.78);

    return (
      <SizedBox width={width} height={height}>
        <Stack>
          <Positioned left={0} top={0} right={0} bottom={0}>
            <GlassChartSlot theme={theme} />
          </Positioned>
          <Positioned left={0} top={0} right={0} bottom={0}>
            <GlassChartProgressRing theme={theme} progress={p} />
          </Positioned>

          <Positioned left={pad} top={pad}>
            <Text
              text={title}
              fontSize={titleSize}
              fontWeight={800}
              color={theme.text.primary}
              pointerEvent="none"
            />
          </Positioned>

          <Positioned left={8} right={0} top={midY - numSize / 2 + 8}>
            <Row
              mainAxisAlignment={MainAxisAlignment.Center}
              crossAxisAlignment={CrossAxisAlignment.Center}
              mainAxisSize={MainAxisSize.Max}
              pointerEvent="none"
            >
              <RichText spacing={Math.max(4, numSize * 0.06)} alignBaseline={true}>
                <Text
                  text={String(percent)}
                  fontSize={numSize}
                  fontWeight={900}
                  color={theme.text.primary}
                />
                <Text
                  text="%"
                  fontSize={unitSize}
                  fontWeight={800}
                  color={applyAlpha(theme.text.primary, theme === Themes.dark ? 0.86 : 0.9)}
                />
              </RichText>
            </Row>
          </Positioned>

          <Positioned left={0} right={0} bottom={bottomPad - btnR}>
            <Row
              mainAxisAlignment={MainAxisAlignment.Center}
              crossAxisAlignment={CrossAxisAlignment.Center}
              mainAxisSize={MainAxisSize.Max}
              spacing={btnGap}
              pointerEvent="auto"
            >
              <GlassRoundButton
                theme={theme}
                size={btnD}
                border={border}
                iconSvg={MINUS_SVG}
                iconColor={iconColor}
                onPress={this.handleDelta(-1)}
              />
              <GlassRoundButton
                theme={theme}
                size={btnD}
                border={border}
                iconSvg={PLUS_SVG}
                iconColor={iconColor}
                onPress={this.handleDelta(1)}
              />
            </Row>
          </Positioned>
        </Stack>
      </SizedBox>
    );
  }
}
