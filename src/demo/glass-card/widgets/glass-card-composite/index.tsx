/** @jsxImportSource @/utils/compiler */
import { FrostedGlassCard } from '../frosted-glass-card';

import type { ThemePalette } from '@/styles/theme';

import {
  Column,
  Container,
  MainAxisAlignment,
  Positioned,
  Stack,
  StatefulWidget,
  Text,
  type Widget,
  type WidgetProps,
} from '@/core';
import { CrossAxisAlignment } from '@/core/flex/type';
import { Themes } from '@/styles/theme';

export interface GlassCardCompositeProps extends WidgetProps {
  width?: number;
  height?: number;
  theme?: ThemePalette;
  title?: string;
  subtitle?: string;
  imageSrc?: string;
  animate?: boolean;
  blurPx?: number;
  glassAlpha?: number;
  windowRatio?: number;
  windowRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
    radius?: number;
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function computeWindowRect(
  width: number,
  height: number,
  windowRatio: number,
): {
  radius: number;
  padding: number;
  windowX: number;
  windowY: number;
  windowW: number;
  windowH: number;
  windowR: number;
} {
  const radius = Math.min(24, height * 0.12);
  const padding = Math.max(12, Math.min(20, Math.min(width, height) * 0.06));
  const windowW = clamp(width * windowRatio, 88, Math.min(180, width - padding * 2 - 40));
  const windowH = clamp(height - padding * 2, 96, height - padding * 2);
  const windowX = width - padding - windowW;
  const windowY = (height - windowH) / 2;
  const windowR = Math.min(radius * 0.7, 14);
  return { radius, padding, windowX, windowY, windowW, windowH, windowR };
}

type SuggestedTextStyle = { fill: string; stroke: string };

export class GlassCardComposite extends StatefulWidget<
  GlassCardCompositeProps,
  { textStyle: SuggestedTextStyle | null }
> {
  state: { textStyle: SuggestedTextStyle | null } = { textStyle: null };

  private handleSuggestedTextStyleChange = (style: SuggestedTextStyle) => {
    const prev = this.state.textStyle;
    if (prev && prev.fill === style.fill && prev.stroke === style.stroke) {
      return;
    }
    this.setState({ textStyle: style });
  };

  /**
   * 组合示例组件：
   * - 底层：FrostedGlassCard（负责磨砂与清晰窗口“镂空”）
   * - 底图：可选传入整卡背景图（cover 铺满、居中裁剪）
   * - 内容层：文本/徽标叠加在上层，避免被磨砂层二次采样导致模糊
   */
  render(): Widget {
    const theme = this.props.theme ?? Themes.light;
    const width = typeof this.props.width === 'number' ? this.props.width : 520;
    const height = typeof this.props.height === 'number' ? this.props.height : 260;
    const windowRatio = typeof this.props.windowRatio === 'number' ? this.props.windowRatio : 0.32;
    const resolvedWindow =
      this.props.windowRect &&
      typeof this.props.windowRect.x === 'number' &&
      typeof this.props.windowRect.y === 'number' &&
      typeof this.props.windowRect.width === 'number' &&
      typeof this.props.windowRect.height === 'number'
        ? {
            x: clamp(this.props.windowRect.x, 0, width),
            y: clamp(this.props.windowRect.y, 0, height),
            width: clamp(this.props.windowRect.width, 16, width),
            height: clamp(this.props.windowRect.height, 16, height),
            radius: this.props.windowRect.radius,
          }
        : null;

    const { padding, windowX, windowY, windowW, windowH, windowR } = resolvedWindow
      ? {
          padding: Math.max(12, Math.min(20, Math.min(width, height) * 0.06)),
          windowX: clamp(resolvedWindow.x, 0, Math.max(0, width - resolvedWindow.width)),
          windowY: clamp(resolvedWindow.y, 0, Math.max(0, height - resolvedWindow.height)),
          windowW: resolvedWindow.width,
          windowH: resolvedWindow.height,
          windowR: clamp(
            typeof resolvedWindow.radius === 'number'
              ? resolvedWindow.radius
              : Math.min(Math.min(24, height * 0.12) * 0.7, 14),
            0,
            Math.min(resolvedWindow.width, resolvedWindow.height) / 2,
          ),
        }
      : computeWindowRect(width, height, clamp(windowRatio, 0.2, 0.5));

    const leftContentW = Math.max(0, windowX - padding * 2);
    const sampleRect = {
      x: padding,
      y: Math.max(0, (height - height * 0.6) / 2),
      width: leftContentW,
      height: height * 0.6,
    };
    const textStyle = this.state.textStyle ?? {
      fill: theme.text.primary,
      stroke: theme.background.base,
    };

    return (
      <Container key="glass-card-composite" width={width} height={height} color="transparent">
        <Stack key="glass-card-stack">
          <FrostedGlassCard
            key="glass-card-base"
            width={width}
            height={height}
            theme={theme}
            backgroundImageSrc={this.props.imageSrc}
            blurPx={this.props.blurPx}
            glassAlpha={this.props.glassAlpha}
            windowRatio={windowRatio}
            windowRect={
              resolvedWindow
                ? { x: windowX, y: windowY, width: windowW, height: windowH, radius: windowR }
                : undefined
            }
            textSampleRect={leftContentW > 0 ? sampleRect : undefined}
            onSuggestedTextStyleChange={
              leftContentW > 0 ? this.handleSuggestedTextStyleChange : undefined
            }
            animate={this.props.animate}
          />

          {leftContentW > 0 ? (
            <Positioned
              key="glass-card-content"
              left={padding}
              top={0}
              width={leftContentW}
              height={height}
            >
              <Container width={leftContentW} height={height} color="transparent">
                <Column
                  key="glass-card-content-col"
                  spacing={10}
                  mainAxisAlignment={MainAxisAlignment.Center}
                  crossAxisAlignment={CrossAxisAlignment.Start}
                >
                  {this.props.title ? (
                    <Text
                      text={this.props.title}
                      fontSize={22}
                      fontWeight="bold"
                      color={textStyle.fill}
                      strokeColor={textStyle.stroke}
                      strokeWidth={3}
                    />
                  ) : null}
                  {this.props.subtitle ? (
                    <Text
                      text={this.props.subtitle}
                      fontSize={14}
                      lineHeight={20}
                      color={textStyle.fill}
                      strokeColor={textStyle.stroke}
                      strokeWidth={2}
                    />
                  ) : null}
                </Column>
              </Container>
            </Positioned>
          ) : null}
        </Stack>
      </Container>
    );
  }
}
