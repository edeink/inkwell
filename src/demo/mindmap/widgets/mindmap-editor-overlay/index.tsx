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
  /** 是否抑制由程序触发 blur 导致的提交 */
  private suppressNextBlurCommit = false;

  /**
   * 创建编辑器覆盖层。
   *
   * @param data 组件属性
   */
  constructor(data: MindMapEditorOverlayProps) {
    super(data);
    const active = !!data.targetKey && !!data.rect;
    this.state = { text: active ? data.value : '', isSaved: false };
    this.pendingFocus = active;
  }

  /**
   * props 更新后同步内部受控文本与焦点行为。
   *
   * @param oldProps 旧属性
   * @returns void
   */
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
      this.suppressNextBlurCommit = true;
      domInput?.blur?.();
    }
  }

  /**
   * 提交编辑内容：确保只提交一次，并回调 onCommit。
   *
   * @returns void
   */
  private commit = (): void => {
    if (this.state.isSaved) {
      return;
    }
    const domInput = (this.textAreaRef as unknown as { input?: HTMLTextAreaElement | null }).input;
    const nextText = typeof domInput?.value === 'string' ? domInput.value : this.state.text;
    this.setState({ isSaved: true });
    this.props.onCommit(nextText);
  };

  /**
   * 取消编辑：确保只触发一次，并回调 onCancel。
   *
   * @returns void
   */
  private cancel = (): void => {
    if (this.state.isSaved) {
      return;
    }
    this.setState({ isSaved: true, text: '' });
    this.props.onCancel();
  };

  /**
   * 渲染覆盖层：当 active=false 时保持不可见，避免影响事件派发。
   *
   * @returns JSX 元素
   */
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
              if (this.suppressNextBlurCommit) {
                this.suppressNextBlurCommit = false;
                return;
              }
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
