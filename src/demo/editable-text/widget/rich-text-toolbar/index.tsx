/** @jsxImportSource @/utils/compiler */

/**
 * RichTextToolbar：富文本工具栏（Widget）。
 *
 * - variant=typing：应用到光标后续输入（typing* 状态）
 * - variant=selection：应用到选区（直接改 styles 范围）
 */
import type { RichTextEditor } from '../rich-text-editor';
import type { WidgetProps } from '@/core/base';
import type { ThemePalette } from '@/styles/theme';

import {
  ClipRect,
  Column,
  Container,
  CrossAxisAlignment,
  Icon,
  MainAxisAlignment,
  Positioned,
  Row,
  ScrollView,
  Stack,
  StatefulWidget,
  Text,
  TextAlign,
  TextAlignVertical,
} from '@/core';

const colorButtonSvg = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">',
  '<path',
  ' d="M12 3.5c-4.694 0-8.5 3.806-8.5 8.5S7.306 20.5 12 20.5h1.8c1.27 0 2.3-1.03 2.3-2.3',
  ' 0-.69-.308-1.343-.84-1.78l-.16-.13a1.7 1.7 0 0 1-.62-1.31c0-.94.76-1.7 1.7-1.7H17',
  ' c2.485 0 4.5-2.015 4.5-4.5C21.5 6.53 17.47 3.5 12 3.5Z"',
  ' stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"',
  '/>',
  '<path',
  ' d="M7.6 12.2a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z',
  ' m3-3a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4',
  ' M14.4 9.4a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z',
  ' m2.2 3.2a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z"',
  ' fill="currentColor"',
  '/>',
  '</svg>',
].join('');

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
  openKey: 'fontSize' | 'fontFamily' | 'color' | null;
  savedSelectionStart: number | null;
  savedSelectionEnd: number | null;
  [key: string]: unknown;
}

export class RichTextToolbar extends StatefulWidget<RichTextToolbarProps, RichTextToolbarState> {
  state: RichTextToolbarState = {
    hoveredKey: null,
    openKey: null,
    savedSelectionStart: null,
    savedSelectionEnd: null,
  };

  private lastSelectionStart: number | null = null;
  private lastSelectionEnd: number | null = null;

  private focusAfterAction() {
    this.props.editor?.focusDomInput();
  }

  private restoreSavedSelectionIfNeeded() {
    const { editor, variant } = this.props;
    if (!editor || variant !== 'selection') {
      return;
    }
    const { savedSelectionStart, savedSelectionEnd } = this.state;
    const a =
      typeof savedSelectionStart === 'number'
        ? savedSelectionStart
        : typeof this.lastSelectionStart === 'number'
          ? this.lastSelectionStart
          : null;
    const b =
      typeof savedSelectionEnd === 'number'
        ? savedSelectionEnd
        : typeof this.lastSelectionEnd === 'number'
          ? this.lastSelectionEnd
          : null;

    if (typeof a !== 'number' || typeof b !== 'number') {
      return;
    }
    editor.restoreSelectionRange(a, b);
  }

  private toggleDropdown(key: NonNullable<RichTextToolbarState['openKey']>) {
    const nextOpenKey = this.state.openKey === key ? null : key;
    if (nextOpenKey === null) {
      this.setState({ openKey: null, savedSelectionStart: null, savedSelectionEnd: null });
      return;
    }
    const { editor } = this.props;
    const info = editor?.getRichSelectionInfo() ?? null;
    this.setState({
      openKey: nextOpenKey,
      savedSelectionStart: info ? info.selectionStart : null,
      savedSelectionEnd: info ? info.selectionEnd : null,
    });
  }

  private closeDropdown() {
    if (this.state.openKey !== null) {
      this.setState({ openKey: null, savedSelectionStart: null, savedSelectionEnd: null });
    }
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
    this.closeDropdown();
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
    this.closeDropdown();
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
    this.closeDropdown();
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

    const buttonSize = 28;
    const spacing = 8;
    const paddingX = 8;
    const paddingY = 8;
    const fontSizeW = 56;
    const fontFamilyW = 96;
    const itemCount = 2 + 2 + 1;
    const toolbarW =
      buttonSize * 2 +
      fontSizeW +
      fontFamilyW +
      buttonSize +
      Math.max(0, itemCount - 1) * spacing +
      paddingX * 2;
    const toolbarH = buttonSize + paddingY * 2;

    const buttonBase = {
      width: buttonSize,
      height: buttonSize,
      borderRadius: 6,
      border: { color: theme.border.base, width: 1 },
      color: theme.background.container,
      cursor: 'pointer' as const,
      alignment: 'center' as const,
      pointerEvent: 'auto' as const,
    };

    const fontSizeOptions = [12, 14, 16, 18, 20, 22, 24, 28, 32] as const;
    const fontFamilyOptions = [
      { label: 'Arial', value: 'Arial, sans-serif' },
      { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
      { label: 'Verdana', value: 'Verdana, Arial, sans-serif' },
      { label: 'Georgia', value: 'Georgia, "Times New Roman", Times, serif' },
      { label: 'Times', value: '"Times New Roman", Times, serif' },
      { label: 'Courier', value: '"Courier New", Courier, monospace' },
      { label: 'Menlo', value: 'Menlo, Monaco, Consolas, "Courier New", monospace' },
      { label: '苹方', value: '"PingFang SC", "Helvetica Neue", Arial, sans-serif' },
      {
        label: '思源黑体',
        value: '"Noto Sans SC", "Source Han Sans SC", "PingFang SC", sans-serif',
      },
      { label: '宋体', value: '"Songti SC", SimSun, serif' },
    ] as const;

    const fontSizeValue =
      variant === 'selection'
        ? (editor?.getFontSizeForSelection() ?? null)
        : (editor?.getTypingFontSize() ?? null);
    const fontFamilyValue =
      variant === 'selection'
        ? (editor?.getFontFamilyForSelection() ?? null)
        : (editor?.getTypingFontFamily() ?? null);

    const fontSizeLabel = typeof fontSizeValue === 'number' ? `${fontSizeValue}px` : '字号';
    const fontFamilyLabel =
      typeof fontFamilyValue === 'string' && fontFamilyValue.length > 0
        ? fontFamilyValue.split(',')[0].replaceAll('"', '').trim()
        : '字体';

    const fontSizeLeft = paddingX + (buttonSize + spacing) * 2;
    const fontFamilyLeft = fontSizeLeft + fontSizeW + spacing;
    const colorLeft = fontFamilyLeft + fontFamilyW + spacing;
    const dropdownTop = toolbarH + 6;

    const dropdownItemH = 24;
    const dropdownGap = 4;
    const dropdownVisibleCount = 6;
    const dropdownViewportH =
      dropdownItemH * dropdownVisibleCount + dropdownGap * (dropdownVisibleCount - 1);

    const colorPanelCols = 6;
    const colorSwatchSize = 22;
    const colorPanelGap = 6;
    const colorPanelPadding = 8;
    const colorPanelW =
      colorPanelPadding * 2 +
      colorPanelCols * colorSwatchSize +
      Math.max(0, colorPanelCols - 1) * colorPanelGap;

    return (
      <Container width={toolbarW} pointerEvent="none" cursor="default">
        <Stack allowOverflowPositioned={true}>
          <Container
            width={toolbarW}
            height={toolbarH}
            borderRadius={8}
            border={{ color: theme.border.base, width: 1 }}
            color={theme.background.container}
            padding={[paddingY, paddingX]}
            pointerEvent="auto"
          >
            <Row
              spacing={spacing}
              mainAxisAlignment={MainAxisAlignment.Start}
              crossAxisAlignment={CrossAxisAlignment.Center}
            >
              <Container
                {...buttonBase}
                color={
                  this.state.hoveredKey === 'bold' ? theme.state.hover : theme.background.container
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
                  color={theme.text.primary}
                  fontWeight="bold"
                  textAlign={TextAlign.Center}
                  textAlignVertical={TextAlignVertical.Center}
                  pointerEvent="none"
                />
              </Container>
              <Container
                {...buttonBase}
                color={
                  this.state.hoveredKey === 'italic'
                    ? theme.state.hover
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
                  color={theme.text.primary}
                  fontStyle="italic"
                  textAlign={TextAlign.Center}
                  textAlignVertical={TextAlignVertical.Center}
                  pointerEvent="none"
                />
              </Container>

              <Container
                width={fontSizeW}
                height={buttonSize}
                borderRadius={6}
                border={{ color: theme.border.base, width: 1 }}
                color={
                  this.state.openKey === 'fontSize'
                    ? theme.state.hover
                    : this.state.hoveredKey === 'fontSize'
                      ? theme.state.hover
                      : theme.background.container
                }
                cursor="pointer"
                alignment="center"
                pointerEvent="auto"
                onPointerEnter={() => this.setState({ hoveredKey: 'fontSize' })}
                onPointerLeave={() => this.setState({ hoveredKey: null })}
                onPointerDown={(e) => {
                  e.stopPropagation?.();
                  this.toggleDropdown('fontSize');
                }}
              >
                <Text
                  text={fontSizeLabel}
                  fontSize={12}
                  color={theme.text.primary}
                  textAlign={TextAlign.Center}
                  textAlignVertical={TextAlignVertical.Center}
                  pointerEvent="none"
                />
              </Container>

              <Container
                width={fontFamilyW}
                height={buttonSize}
                borderRadius={6}
                border={{ color: theme.border.base, width: 1 }}
                color={
                  this.state.openKey === 'fontFamily'
                    ? theme.state.hover
                    : this.state.hoveredKey === 'fontFamily'
                      ? theme.state.hover
                      : theme.background.container
                }
                cursor="pointer"
                alignment="center"
                pointerEvent="auto"
                onPointerEnter={() => this.setState({ hoveredKey: 'fontFamily' })}
                onPointerLeave={() => this.setState({ hoveredKey: null })}
                onPointerDown={(e) => {
                  e.stopPropagation?.();
                  this.toggleDropdown('fontFamily');
                }}
              >
                <Text
                  text={fontFamilyLabel}
                  fontSize={12}
                  color={theme.text.primary}
                  textAlign={TextAlign.Center}
                  textAlignVertical={TextAlignVertical.Center}
                  pointerEvent="none"
                />
              </Container>

              <Container
                {...buttonBase}
                color={
                  this.state.openKey === 'color'
                    ? theme.state.hover
                    : this.state.hoveredKey === 'color'
                      ? theme.state.hover
                      : theme.background.container
                }
                onPointerEnter={() => this.setState({ hoveredKey: 'color' })}
                onPointerLeave={() => this.setState({ hoveredKey: null })}
                onPointerDown={(e) => {
                  e.stopPropagation?.();
                  this.toggleDropdown('color');
                }}
              >
                <Icon svg={colorButtonSvg} size={16} color={theme.text.primary} />
              </Container>
            </Row>
          </Container>

          {this.state.openKey === 'fontSize' && (
            <Positioned left={fontSizeLeft} top={dropdownTop}>
              <ClipRect borderRadius={8}>
                <Container
                  width={fontSizeW}
                  borderRadius={8}
                  border={{ color: theme.border.base, width: 1 }}
                  color={theme.background.container}
                  padding={[6, 6]}
                  pointerEvent="auto"
                >
                  <Container width={fontSizeW - 12} height={dropdownViewportH}>
                    <ScrollView
                      enableBounceVertical={true}
                      enableBounceHorizontal={false}
                      alwaysShowScrollbarY={false}
                      scrollBarVisibilityMode="auto"
                    >
                      <Column spacing={dropdownGap} crossAxisAlignment={CrossAxisAlignment.Start}>
                        {fontSizeOptions.map((fs) => (
                          <Container
                            key={`rt-fs-${fs}`}
                            width={fontSizeW - 12}
                            height={dropdownItemH}
                            borderRadius={6}
                            color={
                              this.state.hoveredKey === `fs-${fs}`
                                ? theme.state.hover
                                : theme.background.container
                            }
                            cursor="pointer"
                            alignment="center"
                            pointerEvent="auto"
                            onPointerEnter={() => this.setState({ hoveredKey: `fs-${fs}` })}
                            onPointerLeave={() => this.setState({ hoveredKey: null })}
                            onPointerDown={(e) => {
                              e.stopPropagation?.();
                              this.applyFontSize(fs);
                            }}
                          >
                            <Text
                              text={`${fs}px`}
                              fontSize={12}
                              color={theme.text.primary}
                              textAlign={TextAlign.Center}
                              textAlignVertical={TextAlignVertical.Center}
                              pointerEvent="none"
                            />
                          </Container>
                        ))}
                      </Column>
                    </ScrollView>
                  </Container>
                </Container>
              </ClipRect>
            </Positioned>
          )}

          {this.state.openKey === 'fontFamily' && (
            <Positioned left={fontFamilyLeft} top={dropdownTop}>
              <ClipRect borderRadius={8}>
                <Container
                  width={fontFamilyW}
                  borderRadius={8}
                  border={{ color: theme.border.base, width: 1 }}
                  color={theme.background.container}
                  padding={[6, 6]}
                  pointerEvent="auto"
                >
                  <Container width={fontFamilyW - 12} height={dropdownViewportH}>
                    <ScrollView
                      enableBounceVertical={true}
                      enableBounceHorizontal={false}
                      alwaysShowScrollbarY={false}
                      scrollBarVisibilityMode="auto"
                    >
                      <Column spacing={dropdownGap} crossAxisAlignment={CrossAxisAlignment.Start}>
                        {fontFamilyOptions.map((ff) => (
                          <Container
                            key={`rt-ff-${ff.label}`}
                            width={fontFamilyW - 12}
                            height={dropdownItemH}
                            borderRadius={6}
                            color={
                              this.state.hoveredKey === `ff-${ff.label}`
                                ? theme.state.hover
                                : theme.background.container
                            }
                            cursor="pointer"
                            alignment="center"
                            pointerEvent="auto"
                            onPointerEnter={() => this.setState({ hoveredKey: `ff-${ff.label}` })}
                            onPointerLeave={() => this.setState({ hoveredKey: null })}
                            onPointerDown={(e) => {
                              e.stopPropagation?.();
                              this.applyFontFamily(ff.value);
                            }}
                          >
                            <Text
                              text={ff.label}
                              fontSize={12}
                              color={theme.text.primary}
                              textAlign={TextAlign.Center}
                              textAlignVertical={TextAlignVertical.Center}
                              pointerEvent="none"
                            />
                          </Container>
                        ))}
                      </Column>
                    </ScrollView>
                  </Container>
                </Container>
              </ClipRect>
            </Positioned>
          )}

          {this.state.openKey === 'color' && (
            <Positioned left={colorLeft + buttonSize - colorPanelW} top={dropdownTop}>
              <ClipRect borderRadius={10}>
                <Container
                  width={colorPanelW}
                  borderRadius={10}
                  border={{ color: theme.border.base, width: 1 }}
                  color={theme.background.container}
                  padding={[colorPanelPadding, colorPanelPadding]}
                  pointerEvent="auto"
                >
                  <Column spacing={colorPanelGap} crossAxisAlignment={CrossAxisAlignment.Start}>
                    {Array.from({
                      length: Math.ceil(colorPresets.length / colorPanelCols),
                    }).map((_, ri) => (
                      <Row key={`rt-color-row-${ri}`} spacing={colorPanelGap}>
                        {colorPresets
                          .slice(ri * colorPanelCols, ri * colorPanelCols + colorPanelCols)
                          .map((c) => (
                            <Container
                              key={`rt-color-${variant}-${c.value}`}
                              width={colorSwatchSize}
                              height={colorSwatchSize}
                              borderRadius={6}
                              border={{ color: 'rgba(0,0,0,0.15)', width: 1 }}
                              color={c.value}
                              cursor="pointer"
                              pointerEvent="auto"
                              onPointerEnter={() => this.setState({ hoveredKey: `c-${c.value}` })}
                              onPointerLeave={() => this.setState({ hoveredKey: null })}
                              onPointerDown={(e) => {
                                e.stopPropagation?.();
                                this.applyColor(c.value);
                              }}
                            >
                              {this.state.hoveredKey === `c-${c.value}` && (
                                <Container
                                  width={colorSwatchSize}
                                  height={colorSwatchSize}
                                  borderRadius={6}
                                  color="rgba(255,255,255,0.18)"
                                  pointerEvent="none"
                                />
                              )}
                            </Container>
                          ))}
                      </Row>
                    ))}
                  </Column>
                </Container>
              </ClipRect>
            </Positioned>
          )}
        </Stack>
      </Container>
    );
  }
}
