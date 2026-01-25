/** @jsxImportSource @/utils/compiler */
import { Button } from './button';
import { getDefaultTheme, getDefaultTokens } from './theme';

import type { ThemePalette } from '@/styles/theme';

import {
  Column,
  Container,
  CrossAxisAlignment,
  MainAxisAlignment,
  MainAxisSize,
  Positioned,
  Row,
  SizedBox,
  Stack,
  StatefulWidget,
  Text,
  TextAlignVertical,
  type InkwellEvent,
  type WidgetProps,
} from '@/core';

export interface DrawerProps extends WidgetProps {
  theme?: ThemePalette;
  open: boolean;
  viewportWidth: number;
  viewportHeight: number;
  width?: number;
  title?: string;
  maskClosable?: boolean;
  onClose?: (e: InkwellEvent) => void;
}

interface DrawerState {
  visible: boolean;
  progress: number;
  [key: string]: unknown;
}

class DrawerInner extends StatefulWidget<DrawerProps, DrawerState> {
  protected state: DrawerState = { visible: false, progress: 0 };
  private raf: number | null = null;
  private animStart = 0;
  private animFrom = 0;
  private animTo = 0;
  private animDuration = 0;

  protected override initWidget(data: DrawerProps) {
    super.initWidget(data);
    if (data.open) {
      this.state.visible = true;
      this.state.progress = 0;
      this.startAnim(0, 1, 180);
    } else {
      this.state.visible = false;
      this.state.progress = 0;
    }
  }

  protected override didUpdateWidget(oldProps: DrawerProps): void {
    const nextOpen = this.props.open;
    const prevOpen = oldProps.open;
    if (nextOpen === prevOpen) {
      return;
    }
    if (nextOpen) {
      this.setState({ visible: true, progress: 0 });
      this.startAnim(0, 1, 180);
    } else {
      if (this.state.visible) {
        this.startAnim(this.state.progress, 0, 160, () => {
          this.setState({ visible: false, progress: 0 });
        });
      }
    }
  }

  override dispose(): void {
    if (typeof cancelAnimationFrame === 'function' && this.raf !== null) {
      cancelAnimationFrame(this.raf);
    }
    this.raf = null;
    super.dispose();
  }

  private startAnim(from: number, to: number, duration: number, onDone?: () => void): void {
    if (typeof requestAnimationFrame !== 'function') {
      this.setState({ progress: to });
      if (to === 0) {
        onDone?.();
      }
      return;
    }
    if (typeof cancelAnimationFrame === 'function' && this.raf !== null) {
      cancelAnimationFrame(this.raf);
    }
    this.animStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.animFrom = from;
    this.animTo = to;
    this.animDuration = Math.max(1, duration);

    const step = (ts: number) => {
      if (this._disposed) {
        this.raf = null;
        return;
      }
      const t = Math.max(0, Math.min(1, (ts - this.animStart) / this.animDuration));
      const eased = 1 - Math.pow(1 - t, 3);
      const next = this.animFrom + (this.animTo - this.animFrom) * eased;
      this.setState({ progress: next });
      if (t >= 1) {
        this.raf = null;
        if (this.animTo === 0) {
          onDone?.();
        }
        return;
      }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  protected render() {
    const theme = getDefaultTheme(this.props.theme);
    const tokens = getDefaultTokens();

    if (!this.state.visible) {
      return <Container key={this.key} width={0} height={0} pointerEvent="none" />;
    }

    const drawerW = this.props.width ?? 378;
    const progress = this.state.progress;
    const maskAlpha = 0.45 * progress;
    const maskColor = `rgba(0, 0, 0, ${maskAlpha})`;
    const right = -Math.max(0, (1 - progress) * drawerW);

    return (
      <SizedBox key={this.key} width={this.props.viewportWidth} height={this.props.viewportHeight}>
        <Stack allowOverflowPositioned={true}>
          <Container
            key="drawer-mask"
            width={this.props.viewportWidth}
            height={this.props.viewportHeight}
            color={maskColor}
            pointerEvent="auto"
            onPointerDown={(e: InkwellEvent) => {
              e.stopPropagation?.();
              if (this.props.maskClosable !== false) {
                this.props.onClose?.(e);
              }
            }}
          />
          <Positioned
            key="drawer-panel"
            right={right}
            top={0}
            width={drawerW}
            height={this.props.viewportHeight}
          >
            <Container
              width={drawerW}
              height={this.props.viewportHeight}
              minWidth={280}
              minHeight={160}
              alignment="topLeft"
              color={theme.background.container}
              border={{ width: tokens.borderWidth, color: theme.border.base }}
              pointerEvent="auto"
            >
              <Column
                spacing={0}
                crossAxisAlignment={CrossAxisAlignment.Start}
                mainAxisSize={MainAxisSize.Min}
              >
                <Container
                  key="drawer-header"
                  height={56}
                  padding={{ left: 16, right: 16 }}
                  border={{ width: tokens.borderWidth, color: theme.border.secondary }}
                  color={theme.background.container}
                  alignment="center"
                >
                  <Row
                    mainAxisAlignment={MainAxisAlignment.SpaceBetween}
                    crossAxisAlignment={CrossAxisAlignment.Center}
                  >
                    <Text
                      key="drawer-title"
                      text={this.props.title ?? '抽屉'}
                      fontSize={16}
                      fontWeight="bold"
                      color={theme.text.primary}
                      textAlignVertical={TextAlignVertical.Center}
                      pointerEvent="none"
                    />
                    <Button theme={theme} btnType="text" onClick={(e) => this.props.onClose?.(e)}>
                      <Text
                        text="关闭"
                        fontSize={14}
                        color={theme.text.secondary}
                        textAlignVertical={TextAlignVertical.Center}
                        pointerEvent="none"
                      />
                    </Button>
                  </Row>
                </Container>
                <Container key="drawer-body" padding={16} pointerEvent="auto">
                  {this.data.children ?? []}
                </Container>
              </Column>
            </Container>
          </Positioned>
        </Stack>
      </SizedBox>
    );
  }
}

export function Drawer(props: DrawerProps) {
  return <DrawerInner {...props} />;
}
