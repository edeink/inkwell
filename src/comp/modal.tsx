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
  Row,
  SizedBox,
  Stack,
  StatefulWidget,
  Text,
  TextAlignVertical,
  type InkwellEvent,
  type WidgetProps,
} from '@/core';

export interface ModalProps extends WidgetProps {
  theme?: ThemePalette;
  open: boolean;
  viewportWidth: number;
  viewportHeight: number;
  width?: number;
  title?: string;
  maskClosable?: boolean;
  okText?: string;
  cancelText?: string;
  onOk?: (e: InkwellEvent) => void;
  onCancel?: (e: InkwellEvent) => void;
}

interface ModalState {
  visible: boolean;
  progress: number;
  [key: string]: unknown;
}

class ModalInner extends StatefulWidget<ModalProps, ModalState> {
  protected state: ModalState = { visible: false, progress: 0 };
  private raf: number | null = null;
  private animStart = 0;
  private animFrom = 0;
  private animTo = 0;
  private animDuration = 0;

  protected override initWidget(data: ModalProps) {
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

  protected override didUpdateWidget(oldProps: ModalProps): void {
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

    const dialogW = this.props.width ?? 520;
    const progress = this.state.progress;
    const maskAlpha = 0.45 * progress;
    const maskColor = `rgba(0, 0, 0, ${maskAlpha})`;
    const slide = (1 - progress) * 24;

    return (
      <SizedBox key={this.key} width={this.props.viewportWidth} height={this.props.viewportHeight}>
        <Stack allowOverflowPositioned={true}>
          <Container
            key="modal-mask"
            width={this.props.viewportWidth}
            height={this.props.viewportHeight}
            color={maskColor}
            pointerEvent="auto"
            onPointerDown={(e: InkwellEvent) => {
              e.stopPropagation?.();
              if (this.props.maskClosable !== false) {
                this.props.onCancel?.(e);
              }
            }}
          />
          <Container
            key="modal-center"
            width={this.props.viewportWidth}
            height={this.props.viewportHeight}
            alignment="center"
            padding={{ bottom: slide }}
            pointerEvent="none"
          >
            <Container
              key="modal-dialog"
              width={dialogW}
              minWidth={320}
              minHeight={160}
              borderRadius={tokens.borderRadius}
              border={{ width: tokens.borderWidth, color: theme.border.base }}
              color={theme.background.container}
              padding={16}
              pointerEvent="auto"
            >
              <Column
                spacing={12}
                crossAxisAlignment={CrossAxisAlignment.Start}
                mainAxisSize={MainAxisSize.Min}
              >
                {this.props.title ? (
                  <Text
                    key="modal-title"
                    text={this.props.title}
                    fontSize={16}
                    color={theme.text.primary}
                    lineHeight={24}
                    fontWeight="bold"
                    pointerEvent="none"
                  />
                ) : null}
                <Container key="modal-body" pointerEvent="auto">
                  {this.data.children ?? []}
                </Container>
                <Row
                  key="modal-footer"
                  spacing={8}
                  mainAxisAlignment={MainAxisAlignment.End}
                  crossAxisAlignment={CrossAxisAlignment.Center}
                >
                  <Button theme={theme} btnType="default" onClick={(e) => this.props.onCancel?.(e)}>
                    <Text
                      text={this.props.cancelText ?? '取消'}
                      fontSize={14}
                      color={theme.text.primary}
                      textAlignVertical={TextAlignVertical.Center}
                      pointerEvent="none"
                    />
                  </Button>
                  <Button theme={theme} btnType="primary" onClick={(e) => this.props.onOk?.(e)}>
                    <Text
                      text={this.props.okText ?? '确定'}
                      fontSize={14}
                      color={theme.text.inverse}
                      textAlignVertical={TextAlignVertical.Center}
                      pointerEvent="none"
                    />
                  </Button>
                </Row>
              </Column>
            </Container>
          </Container>
        </Stack>
      </SizedBox>
    );
  }
}

export function Modal(props: ModalProps) {
  return <ModalInner {...props} />;
}
