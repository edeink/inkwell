/** @jsxImportSource @/utils/compiler */
import { Button } from './button';
import { getDefaultTheme, getDefaultTokens } from './theme';

import type { BuildContext } from '@/core/base';
import type { ThemePalette } from '@/styles/theme';

import {
  ClipRect,
  Column,
  Container,
  CrossAxisAlignment,
  MainAxisAlignment,
  MainAxisSize,
  Positioned,
  Row,
  Stack,
  StatefulWidget,
  Text,
  TextAlignVertical,
  type InkwellEvent,
  type WidgetProps,
} from '@/core';

export interface PopconfirmProps extends WidgetProps {
  theme?: ThemePalette;
  width?: number;
  triggerHeight?: number;
  title: string;
  description?: string;
  okText?: string;
  cancelText?: string;
  disabled?: boolean;
  onConfirm?: (e: InkwellEvent) => void;
  onCancel?: (e: InkwellEvent) => void;
}

interface PopconfirmState {
  opened: boolean;
  [key: string]: unknown;
}

export class Popconfirm extends StatefulWidget<PopconfirmProps, PopconfirmState> {
  protected state: PopconfirmState = { opened: false };

  private _lastOverlayLeft: number | null = null;
  private _lastOverlayTop: number | null = null;

  private getOverlayEntryKey(): string {
    return `${String(this.key)}-popconfirm-overlay`;
  }

  private syncOverlay(): void {
    const rt = this.runtime;
    if (!rt) {
      return;
    }
    const overlayKey = this.getOverlayEntryKey();
    if (!this.state.opened) {
      this._lastOverlayLeft = null;
      this._lastOverlayTop = null;
      rt.removeOverlayEntry(overlayKey);
      return;
    }

    const theme = getDefaultTheme(this.props.theme);
    const tokens = getDefaultTokens();
    const panelW = this.props.width ?? 260;
    const gapTop = 8;
    const triggerH = this.props.triggerHeight ?? 32;
    const pos = this.getAbsolutePosition();

    const root = rt.getRootWidget();
    const viewportW = root?.renderObject.size.width ?? null;
    const viewportH = root?.renderObject.size.height ?? null;

    const btnH = tokens.controlHeight.small;
    const titleH = 20;
    const descH = this.props.description ? 18 : 0;
    const contentGap = this.props.description ? 16 : 8;
    const panelH = 24 + titleH + descH + contentGap + btnH;

    let left = pos.dx;
    let top = pos.dy + gapTop + triggerH;

    if (viewportW !== null) {
      left = Math.max(0, Math.min(left, viewportW - panelW));
    }

    if (viewportH !== null) {
      const belowTop = pos.dy + gapTop + triggerH;
      const belowBottom = belowTop + panelH;
      const aboveTop = pos.dy - gapTop - panelH;
      if (belowBottom > viewportH && aboveTop >= 0) {
        top = aboveTop;
      } else {
        top = belowTop;
      }
    }

    this._lastOverlayLeft = left;
    this._lastOverlayTop = top;

    rt.setOverlayEntry(
      overlayKey,
      <Stack key={`${overlayKey}-host`} allowOverflowPositioned={true}>
        <Container
          key={`${overlayKey}-mask`}
          alignment="topLeft"
          pointerEvent="auto"
          onPointerDown={(e) => {
            e.stopPropagation?.();
            this.closeOpened();
          }}
        />
        <Positioned key={overlayKey} left={left} top={top}>
          <ClipRect borderRadius={tokens.borderRadius}>
            <Container
              width={panelW}
              minWidth={200}
              minHeight={120}
              borderRadius={tokens.borderRadius}
              border={{ width: tokens.borderWidth, color: theme.border.base }}
              color={theme.background.container}
              padding={12}
              pointerEvent="auto"
            >
              <Column
                spacing={8}
                crossAxisAlignment={CrossAxisAlignment.Start}
                mainAxisSize={MainAxisSize.Min}
              >
                <Text
                  key="pc-title"
                  text={this.props.title}
                  fontSize={14}
                  fontWeight="bold"
                  color={theme.text.primary}
                  lineHeight={20}
                  pointerEvent="none"
                />
                {this.props.description ? (
                  <Text
                    key="pc-desc"
                    text={this.props.description}
                    fontSize={12}
                    color={theme.text.secondary}
                    lineHeight={18}
                    pointerEvent="none"
                  />
                ) : null}
                <Row
                  key="pc-actions"
                  spacing={8}
                  mainAxisAlignment={MainAxisAlignment.End}
                  crossAxisAlignment={CrossAxisAlignment.Center}
                >
                  <Button
                    theme={theme}
                    btnType="default"
                    size="small"
                    onClick={(e) => {
                      this.closeOpened();
                      this.props.onCancel?.(e);
                    }}
                  >
                    <Text
                      text={this.props.cancelText ?? '取消'}
                      fontSize={12}
                      color={theme.text.primary}
                      textAlignVertical={TextAlignVertical.Center}
                      pointerEvent="none"
                    />
                  </Button>
                  <Button
                    theme={theme}
                    btnType="primary"
                    size="small"
                    onClick={(e) => {
                      this.closeOpened();
                      this.props.onConfirm?.(e);
                    }}
                  >
                    <Text
                      text={this.props.okText ?? '确定'}
                      fontSize={12}
                      color={theme.text.inverse}
                      textAlignVertical={TextAlignVertical.Center}
                      pointerEvent="none"
                    />
                  </Button>
                </Row>
              </Column>
            </Container>
          </ClipRect>
        </Positioned>
      </Stack>,
    );
  }

  private toggleOpened = (e: InkwellEvent) => {
    if (this.props.disabled) {
      return;
    }
    e.stopPropagation?.();
    this.setState({ opened: !this.state.opened });
    this.syncOverlay();
  };

  private toggleOpenedByTriggerCapture = (e: InkwellEvent) => {
    if (this.props.disabled) {
      return;
    }
    this.setState({ opened: !this.state.opened });
    this.syncOverlay();
  };

  private closeOpened = () => {
    if (this.state.opened) {
      this.setState({ opened: false });
      this.syncOverlay();
    }
  };
  override paint(context: BuildContext): void {
    super.paint(context);

    if (!this.state.opened) {
      return;
    }
    if (!this.runtime) {
      return;
    }

    const gapTop = 8;
    const triggerH = this.props.triggerHeight ?? 32;
    const pos = this.getAbsolutePosition();

    const tokens = getDefaultTokens();
    const panelW = this.props.width ?? 260;
    const root = this.runtime.getRootWidget();
    const viewportW = root?.renderObject.size.width ?? null;
    const viewportH = root?.renderObject.size.height ?? null;

    const btnH = tokens.controlHeight.small;
    const titleH = 20;
    const descH = this.props.description ? 18 : 0;
    const contentGap = this.props.description ? 16 : 8;
    const panelH = 24 + titleH + descH + contentGap + btnH;

    let left = pos.dx;
    let top = pos.dy + gapTop + triggerH;

    if (viewportW !== null) {
      left = Math.max(0, Math.min(left, viewportW - panelW));
    }

    if (viewportH !== null) {
      const belowTop = pos.dy + gapTop + triggerH;
      const belowBottom = belowTop + panelH;
      const aboveTop = pos.dy - gapTop - panelH;
      if (belowBottom > viewportH && aboveTop >= 0) {
        top = aboveTop;
      } else {
        top = belowTop;
      }
    }

    if (this._lastOverlayLeft !== left || this._lastOverlayTop !== top) {
      this.syncOverlay();
    }
  }

  override dispose(): void {
    const rt = this.runtime;
    if (rt) {
      rt.removeOverlayEntry(this.getOverlayEntryKey());
    }
    super.dispose();
  }

  render() {
    return (
      <Container
        key={`${this.key}-trigger`}
        pointerEvent="auto"
        onClick={this.toggleOpenedByTriggerCapture}
      >
        {this.props.children as unknown as WidgetProps[]}
      </Container>
    );
  }
}
