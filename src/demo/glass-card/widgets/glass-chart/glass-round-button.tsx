/** @jsxImportSource @/utils/compiler */
import { GlassRoundButtonCanvas } from './glass-round-button-effect';

import type { ThemePalette } from '@/styles/theme';

import {
  Container,
  Icon,
  Positioned,
  Stack,
  StatefulWidget,
  type InkwellEvent,
  type Widget,
  type WidgetProps,
} from '@/core';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * 圆形玻璃按钮：
 * - 负责处理 hover/down 交互状态
 * - 视觉本体由 GlassRoundButtonCanvas 绘制
 */
export interface GlassRoundButtonProps extends WidgetProps {
  theme: ThemePalette;
  size: number;
  border: string;
  iconSvg: string;
  iconColor: string;
  onPress?: (e: InkwellEvent) => void;
}

export class GlassRoundButton extends StatefulWidget<
  GlassRoundButtonProps,
  { hoverT: number; downT: number }
> {
  state = { hoverT: 0, downT: 0 };

  private handlePointerEnter = () => {
    this.setState({ hoverT: 1 });
  };

  private handlePointerLeave = () => {
    this.setState({ hoverT: 0, downT: 0 });
  };

  private handlePointerDown = (e: InkwellEvent) => {
    e.stopPropagation?.();
    this.setState({ downT: 1 });
    this.props.onPress?.(e);
  };

  private handlePointerUp = (e: InkwellEvent) => {
    e.stopPropagation?.();
    this.setState({ downT: 0 });
  };

  render(): Widget {
    const d = Math.max(1, this.props.size);
    const r = d / 2;
    const iconSize = Math.max(14, Math.min(18, d * 0.52));
    const hoverT = clamp01(this.state.hoverT);
    const downT = clamp01(this.state.downT);

    return (
      <Container
        width={d}
        height={d}
        borderRadius={r}
        cursor="pointer"
        onPointerEnter={this.handlePointerEnter}
        onPointerLeave={this.handlePointerLeave}
        onPointerDown={this.handlePointerDown}
        onPointerUp={this.handlePointerUp}
      >
        <Stack>
          <Positioned left={0} top={0} right={0} bottom={0}>
            <GlassRoundButtonCanvas
              theme={this.props.theme}
              border={this.props.border}
              hoverT={hoverT}
              downT={downT}
            />
          </Positioned>
          <Positioned left={0} top={0} right={0} bottom={0}>
            <Container alignment="center" pointerEvent="none">
              <Icon svg={this.props.iconSvg} size={iconSize} color={this.props.iconColor} />
            </Container>
          </Positioned>
        </Stack>
      </Container>
    );
  }
}
