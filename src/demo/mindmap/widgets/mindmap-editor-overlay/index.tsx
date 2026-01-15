/** @jsxImportSource @/utils/compiler */

import type { WidgetProps } from '@/core/base';
import type { ThemePalette } from '@/styles/theme';

import { Container, Positioned, StatefulWidget, TextArea } from '@/core';
import { getCurrentThemeMode, Themes } from '@/styles/theme';

export type MindMapEditorRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type MindMapEditorOverlayProps = WidgetProps & {
  targetKey: string | null;
  rect: MindMapEditorRect | null;
  value: string;
  theme?: ThemePalette;
  onCommit: (value: string) => void;
  onCancel: () => void;
};

type MindMapEditorOverlayState = {
  text: string;
  isSaved: boolean;
};

export class MindMapEditorOverlay extends StatefulWidget<
  MindMapEditorOverlayProps,
  MindMapEditorOverlayState
> {
  private textAreaRef: TextArea | null = null;
  private pendingFocus = false;

  constructor(data: MindMapEditorOverlayProps) {
    super(data);
    const active = !!data.targetKey && !!data.rect;
    this.state = { text: active ? data.value : '', isSaved: false };
    this.pendingFocus = active;
  }

  protected didUpdateWidget(oldProps: MindMapEditorOverlayProps) {
    const prevActive = !!oldProps.targetKey && !!oldProps.rect;
    const nextActive = !!this.props.targetKey && !!this.props.rect;
    const keyChanged = this.props.targetKey !== oldProps.targetKey;
    const valueChanged = this.props.value !== oldProps.value;

    if (
      (prevActive !== nextActive && !nextActive) ||
      (nextActive && (keyChanged || valueChanged))
    ) {
      this.setState({
        text: nextActive ? this.props.value : '',
        isSaved: false,
      });
    }

    if (!prevActive && nextActive) {
      this.setState({
        text: this.props.value,
        isSaved: false,
      });
      this.pendingFocus = true;
    }

    if (prevActive && !nextActive) {
      const domInput = (this.textAreaRef as unknown as { input?: HTMLTextAreaElement | null })
        .input;
      domInput?.blur?.();
    }
  }

  private commit = (): void => {
    if (this.state.isSaved) {
      return;
    }
    this.setState({ isSaved: true });
    this.props.onCommit(this.state.text);
  };

  private cancel = (): void => {
    if (this.state.isSaved) {
      return;
    }
    this.setState({ isSaved: true, text: '' });
    this.props.onCancel();
  };

  render() {
    const resolvedTheme = this.props.theme ?? Themes[getCurrentThemeMode()];
    const rect = this.props.rect;
    const active = !!this.props.targetKey && !!rect;

    const left = active ? rect!.left : 0;
    const top = active ? rect!.top : 0;
    const width = active ? rect!.width : 0;
    const height = active ? rect!.height : 0;

    const textColor = resolvedTheme.text.primary;
    const selectionColor = resolvedTheme.state.focus;
    const borderColor = resolvedTheme.primary;
    const borderWidth = 2;
    const fill = resolvedTheme.background.container;
    const padding: 0 | [number, number] = active ? [12, 8] : 0;
    const border = active
      ? ({ color: borderColor, width: borderWidth, style: 'solid' } as const)
      : undefined;
    const borderRadius = active ? 8 : 0;

    return (
      <Positioned key="mindmap-editor-pos" left={left} top={top} width={width} height={height}>
        <Container
          width={width}
          height={height}
          padding={padding}
          color={active ? fill : undefined}
          border={border}
          borderRadius={borderRadius}
          opacity={active ? 1 : 0}
          pointerEvent={active ? 'auto' : 'none'}
        >
          <TextArea
            key="mindmap-global-textarea"
            ref={(r) => {
              this.textAreaRef = r as TextArea;
              if (this.pendingFocus && this.textAreaRef) {
                this.pendingFocus = false;
                const domInput = (
                  this.textAreaRef as unknown as { input?: HTMLTextAreaElement | null }
                ).input;
                setTimeout(() => {
                  domInput?.focus?.();
                }, 0);
              }
            }}
            value={this.state.text}
            disabled={!active}
            fontSize={14}
            fontFamily="Arial, sans-serif"
            color={textColor}
            selectionColor={selectionColor}
            cursorColor={textColor}
            autoFocus={false}
            placeholder={'输入文本'}
            onChange={(val: string) => {
              if (!this.state.isSaved) {
                this.setState({ text: val });
              }
            }}
            onKeyDown={(e) => {
              const native = e.nativeEvent as KeyboardEvent;
              if (native.key === 'Escape') {
                this.cancel();
                e.stopPropagation();
                return false;
              }
              if (
                native.key === 'Enter' &&
                !native.shiftKey &&
                !native.altKey &&
                !native.ctrlKey &&
                !native.metaKey
              ) {
                this.commit();
                e.stopPropagation();
                return false;
              }
              return true;
            }}
            onBlur={() => {
              if (!this.state.isSaved) {
                this.commit();
              }
            }}
          />
        </Container>
      </Positioned>
    );
  }
}
