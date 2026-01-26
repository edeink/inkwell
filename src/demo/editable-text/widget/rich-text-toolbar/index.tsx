/** @jsxImportSource @/utils/compiler */
/**
 * 文件用途：富文本工具栏（Widget）。
 * 主要功能：
 * - variant=typing：应用到光标后续输入（typing* 状态）
 * - variant=selection：应用到选区（直接改 styles 范围）
 */
import { ColorPicker as ToolbarColorPicker } from './color-picker';
import { fontFamilyOptions, fontSizeOptions, toolbarConstants, toolbarDerived } from './constants';
import { ToolbarButton } from './toolbar-button';

import type { WidgetProps } from '@/core/base';
import type { RichTextEditor } from '@/demo/editable-text/widget/rich-text-editor';
import type { ThemePalette } from '@/styles/theme';

import { Select as CompSelect } from '@/comp';
import {
  Container,
  CrossAxisAlignment,
  MainAxisAlignment,
  Row,
  Stack,
  StatefulWidget,
  Text,
  TextAlign,
  TextAlignVertical,
} from '@/core';

export { ColorPicker } from './color-picker';
export { Select } from './select';
export { ToolbarButton } from './toolbar-button';
export { ToolbarColorPickerDropdown } from './toolbar-color-picker-dropdown';
export { ToolbarColorPickerTrigger } from './toolbar-color-picker-trigger';

export type RichTextToolbarVariant = 'typing' | 'selection';

export type RichTextColorPreset = {
  label: string;
  value: string;
};

export interface RichTextToolbarProps extends WidgetProps {
  theme: ThemePalette;
  editor: RichTextEditor | null;
  variant: RichTextToolbarVariant;
  colorPresets: ReadonlyArray<RichTextColorPreset>;
}

interface RichTextToolbarState {
  hoveredKey: string | null;
  [key: string]: unknown;
}

export class RichTextToolbar extends StatefulWidget<RichTextToolbarProps, RichTextToolbarState> {
  state: RichTextToolbarState = {
    hoveredKey: null,
  };

  private lastSelectionStart: number | null = null;
  private lastSelectionEnd: number | null = null;
  private savedSelectionStart: number | null = null;
  private savedSelectionEnd: number | null = null;

  private focusAfterAction() {
    this.props.editor?.focusDomInput();
  }

  private captureSelectionSnapshot() {
    const { editor, variant } = this.props;
    const info = editor?.getRichSelectionInfo() ?? null;
    if (!info) {
      this.savedSelectionStart = null;
      this.savedSelectionEnd = null;
      return;
    }

    if (variant === 'selection') {
      if (info.selectionStart !== info.selectionEnd) {
        this.savedSelectionStart = info.selectionStart;
        this.savedSelectionEnd = info.selectionEnd;
        return;
      }

      if (
        typeof this.lastSelectionStart === 'number' &&
        typeof this.lastSelectionEnd === 'number' &&
        this.lastSelectionStart !== this.lastSelectionEnd
      ) {
        this.savedSelectionStart = this.lastSelectionStart;
        this.savedSelectionEnd = this.lastSelectionEnd;
        return;
      }
    }

    this.savedSelectionStart = info.selectionStart;
    this.savedSelectionEnd = info.selectionEnd;
  }

  private clearSelectionSnapshot() {
    this.savedSelectionStart = null;
    this.savedSelectionEnd = null;
  }

  private restoreSavedSelectionIfNeeded() {
    const { editor, variant } = this.props;
    if (!editor || variant !== 'selection') {
      return;
    }

    let a =
      typeof this.savedSelectionStart === 'number'
        ? this.savedSelectionStart
        : typeof this.lastSelectionStart === 'number'
          ? this.lastSelectionStart
          : null;
    let b =
      typeof this.savedSelectionEnd === 'number'
        ? this.savedSelectionEnd
        : typeof this.lastSelectionEnd === 'number'
          ? this.lastSelectionEnd
          : null;

    if (
      typeof a === 'number' &&
      typeof b === 'number' &&
      a === b &&
      typeof this.lastSelectionStart === 'number' &&
      typeof this.lastSelectionEnd === 'number' &&
      this.lastSelectionStart !== this.lastSelectionEnd
    ) {
      a = this.lastSelectionStart;
      b = this.lastSelectionEnd;
    }

    if (typeof a !== 'number' || typeof b !== 'number') {
      return;
    }
    editor.restoreSelectionRange(a, b);
  }

  private applyBold = () => {
    const { editor, variant } = this.props;
    if (!editor) {
      return;
    }
    this.restoreSavedSelectionIfNeeded();
    if (variant === 'selection') {
      editor.toggleBoldForSelection();
    } else {
      editor.toggleBoldForTyping();
    }
    this.focusAfterAction();
  };

  private applyItalic = () => {
    const { editor, variant } = this.props;
    if (!editor) {
      return;
    }
    this.restoreSavedSelectionIfNeeded();
    if (variant === 'selection') {
      editor.toggleItalicForSelection();
    } else {
      editor.toggleItalicForTyping();
    }
    this.focusAfterAction();
  };

  private applyFontSize = (fontSize: number) => {
    const { editor, variant } = this.props;
    if (!editor) {
      return;
    }
    this.restoreSavedSelectionIfNeeded();
    if (variant === 'selection') {
      editor.setFontSizeForSelection(fontSize);
    } else {
      editor.setFontSizeForTyping(fontSize);
    }
    this.clearSelectionSnapshot();
    this.focusAfterAction();
  };

  private applyFontFamily = (fontFamily: string) => {
    const { editor, variant } = this.props;
    if (!editor) {
      return;
    }
    this.restoreSavedSelectionIfNeeded();
    if (variant === 'selection') {
      editor.setFontFamilyForSelection(fontFamily);
    } else {
      editor.setFontFamilyForTyping(fontFamily);
    }
    this.clearSelectionSnapshot();
    this.focusAfterAction();
  };

  private applyColor = (color: string) => {
    const { editor, variant } = this.props;
    if (!editor) {
      return;
    }
    this.restoreSavedSelectionIfNeeded();
    if (variant === 'selection') {
      editor.setColorForSelection(color);
    } else {
      editor.setColorForTyping(color);
    }
    this.clearSelectionSnapshot();
    this.focusAfterAction();
  };

  protected render() {
    const { theme, variant, colorPresets, editor } = this.props;

    if (variant === 'selection' && editor) {
      const info = editor.getRichSelectionInfo();
      if (info.selectionStart !== info.selectionEnd) {
        this.lastSelectionStart = info.selectionStart;
        this.lastSelectionEnd = info.selectionEnd;
      }
    }

    const boldActive =
      variant === 'selection'
        ? (editor?.getBoldForSelection() ?? null) === true
        : (editor?.getTypingBold() ?? false);
    const italicActive =
      variant === 'selection'
        ? (editor?.getItalicForSelection() ?? null) === true
        : (editor?.getTypingItalic() ?? false);
    const currentColor =
      variant === 'selection'
        ? (editor?.getColorForSelection() ?? null)
        : (editor?.getTypingColor() ?? null);
    const colorActive = typeof currentColor === 'string' && currentColor !== '#000000';

    const fontSizeValue =
      variant === 'selection'
        ? (editor?.getFontSizeForSelection() ?? null)
        : (editor?.getTypingFontSize() ?? null);
    const fontFamilyValue =
      variant === 'selection'
        ? (editor?.getFontFamilyForSelection() ?? null)
        : (editor?.getTypingFontFamily() ?? null);

    return (
      <Container width={toolbarDerived.toolbarW} pointerEvent="none" cursor="default">
        <Stack allowOverflowPositioned={true}>
          <Container
            width={toolbarDerived.toolbarW}
            height={toolbarDerived.toolbarH}
            borderRadius={toolbarConstants.toolbarRadius}
            border={{ color: theme.border.base, width: 1 }}
            color={theme.background.container}
            padding={[toolbarConstants.paddingY, toolbarConstants.paddingX]}
            pointerEvent="auto"
          >
            <Row
              spacing={toolbarConstants.spacing}
              mainAxisAlignment={MainAxisAlignment.Start}
              crossAxisAlignment={CrossAxisAlignment.Center}
            >
              <ToolbarButton
                widgetKey="rt-btn-bold"
                theme={theme}
                width={toolbarConstants.buttonSize}
                height={toolbarConstants.buttonSize}
                backgroundColor={
                  this.state.hoveredKey === 'bold'
                    ? theme.state.hover
                    : boldActive
                      ? theme.state.selected
                      : theme.background.container
                }
                onPointerEnter={() => this.setState({ hoveredKey: 'bold' })}
                onPointerLeave={() => this.setState({ hoveredKey: null })}
                onPointerDown={(e) => {
                  e.stopPropagation?.();
                  this.applyBold();
                }}
              >
                <Text
                  text="B"
                  fontSize={14}
                  color={boldActive ? theme.primary : theme.text.primary}
                  fontWeight="bold"
                  textAlign={TextAlign.Center}
                  textAlignVertical={TextAlignVertical.Center}
                  pointerEvent="none"
                />
              </ToolbarButton>
              <ToolbarButton
                widgetKey="rt-btn-italic"
                theme={theme}
                width={toolbarConstants.buttonSize}
                height={toolbarConstants.buttonSize}
                backgroundColor={
                  this.state.hoveredKey === 'italic'
                    ? theme.state.hover
                    : italicActive
                      ? theme.state.selected
                      : theme.background.container
                }
                onPointerEnter={() => this.setState({ hoveredKey: 'italic' })}
                onPointerLeave={() => this.setState({ hoveredKey: null })}
                onPointerDown={(e) => {
                  e.stopPropagation?.();
                  this.applyItalic();
                }}
              >
                <Text
                  text="I"
                  fontSize={14}
                  color={italicActive ? theme.primary : theme.text.primary}
                  fontStyle="italic"
                  textAlign={TextAlign.Center}
                  textAlignVertical={TextAlignVertical.Center}
                  pointerEvent="none"
                />
              </ToolbarButton>

              <CompSelect<number>
                key="rt-select-fontSize"
                theme={theme}
                width={toolbarConstants.fontSizeW}
                size="small"
                value={typeof fontSizeValue === 'number' ? fontSizeValue : null}
                placeholder="字号"
                options={fontSizeOptions.map((fs) => ({ label: `${fs}px`, value: fs }))}
                onOpen={() => this.captureSelectionSnapshot()}
                onClose={() => this.clearSelectionSnapshot()}
                onChange={(fs) => this.applyFontSize(fs)}
              />

              <CompSelect<string>
                key="rt-select-fontFamily"
                theme={theme}
                width={toolbarConstants.fontFamilyW}
                size="small"
                value={typeof fontFamilyValue === 'string' ? fontFamilyValue : null}
                placeholder="字体"
                options={fontFamilyOptions.map((ff) => ({ label: ff.label, value: ff.value }))}
                onOpen={() => this.captureSelectionSnapshot()}
                onClose={() => this.clearSelectionSnapshot()}
                onChange={(ff) => this.applyFontFamily(ff)}
              />

              <ToolbarColorPicker
                key="rt-btn-color"
                widgetKey="rt-btn-color"
                theme={theme}
                width={toolbarConstants.buttonSize}
                height={toolbarConstants.buttonSize}
                active={colorActive}
                triggerHoverKey="color"
                dropdownTop={toolbarDerived.dropdownTopFromTrigger}
                dropdownLeft={toolbarDerived.colorDropdownLeftFromTrigger}
                cols={toolbarConstants.colorPanelCols}
                swatchSize={toolbarConstants.colorSwatchSize}
                gap={toolbarConstants.colorPanelGap}
                padding={toolbarConstants.colorPanelPadding}
                presets={colorPresets}
                hoveredKey={this.state.hoveredKey}
                onHoverKey={(key) => this.setState({ hoveredKey: key })}
                swatchWidgetKey={(color) => `rt-color-${variant}-${color}`}
                onOpen={() => this.captureSelectionSnapshot()}
                onClose={() => this.clearSelectionSnapshot()}
                onPick={(color) => this.applyColor(color)}
              />
            </Row>
          </Container>
        </Stack>
      </Container>
    );
  }
}
