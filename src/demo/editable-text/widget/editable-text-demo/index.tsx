/** @jsxImportSource @/utils/compiler */

/**
 * EditableTextDemoWidget：editable-text 示例的 Widget 入口。
 *
 * 目标：
 * - 页面只负责组合与排版（1 行 3 列等分）
 * - 各列内部的业务组件拆分到 widget 子目录，降低 app.tsx 复杂度
 */
import { InputPanel } from '../input-panel';
import { RichTextPanel } from '../rich-text-panel';
import { TextAreaPanel } from '../textarea-panel';

import type { RichSelectionInfo, RichTextDoc, RichTextSpan } from '../rich-text-editor';

import {
  Column,
  CrossAxisAlignment,
  MainAxisAlignment,
  MainAxisSize,
  Padding,
  Row,
  StatefulWidget,
  Text,
  TextAlign,
  type WidgetProps,
} from '@/core';
import { Themes, type ThemePalette } from '@/styles/theme';

const initialRichText: RichTextDoc = (() => {
  const text = '这是一个富文本编辑器\n一眼可见：加粗、斜体、颜色、字号、字体\n支持选区工具栏';

  const spans: RichTextSpan[] = [];

  const addSpan = (substr: string, style: RichTextSpan['style']) => {
    const start = text.indexOf(substr);
    if (start < 0) {
      return;
    }
    spans.push({ start, end: start + substr.length, style });
  };

  addSpan('加粗', { bold: true, fontSize: 16 });
  addSpan('斜体', { italic: true, fontSize: 16 });
  addSpan('颜色', { color: '#B23A48', fontSize: 16 });
  addSpan('字号', { fontSize: 22, color: '#2F54EB' });
  addSpan('字体', { fontFamily: '"Songti SC", SimSun, serif', fontSize: 16 });

  return { text, spans };
})();

export interface EditableTextDemoWidgetProps extends WidgetProps {
  theme?: ThemePalette;
  onRichSelectionInfo?: (info: RichSelectionInfo) => void;
}

interface EditableTextDemoWidgetState {
  singleLineValue: string;
  multiLineValue: string;
  richValue: string | RichTextDoc;
  [key: string]: unknown;
}

export class EditableTextDemoWidget extends StatefulWidget<
  EditableTextDemoWidgetProps,
  EditableTextDemoWidgetState
> {
  state: EditableTextDemoWidgetState = {
    singleLineValue: '这是一个单行编辑器',
    multiLineValue: '这是一个多行编辑器\n支持回车换行\n支持光标移动',
    richValue: initialRichText,
  };

  render() {
    const theme = this.props.theme || Themes.light;

    return (
      <Padding padding={32}>
        <Column spacing={32} crossAxisAlignment={CrossAxisAlignment.Start}>
          <Row
            key="header-row"
            mainAxisAlignment={MainAxisAlignment.Center}
            mainAxisSize={MainAxisSize.Max}
          >
            <Column key="header" spacing={8} crossAxisAlignment={CrossAxisAlignment.Center}>
              <Text
                key="title"
                text="文本编辑"
                fontSize={32}
                fontWeight="bold"
                color={theme.text.primary}
                textAlign={TextAlign.Center}
              />
              <Text
                key="subtitle"
                text="展示 Input、TextArea、RichTextEditor 的输入、选区与快捷键能力"
                fontSize={16}
                color={theme.text.secondary}
                textAlign={TextAlign.Center}
              />
            </Column>
          </Row>

          <Column spacing={24} crossAxisAlignment={CrossAxisAlignment.Center}>
            <Row mainAxisAlignment={MainAxisAlignment.Center}>
              <Column crossAxisAlignment={CrossAxisAlignment.Start}>
                <InputPanel
                  theme={theme}
                  value={this.state.singleLineValue}
                  onChange={(val) => this.setState({ singleLineValue: val })}
                />
              </Column>
            </Row>

            <Row mainAxisAlignment={MainAxisAlignment.Center}>
              <Column crossAxisAlignment={CrossAxisAlignment.Start}>
                <TextAreaPanel
                  theme={theme}
                  value={this.state.multiLineValue}
                  onChange={(val) => this.setState({ multiLineValue: val })}
                />
              </Column>
            </Row>

            <Row mainAxisAlignment={MainAxisAlignment.Center}>
              <Column crossAxisAlignment={CrossAxisAlignment.Start}>
                <RichTextPanel
                  theme={theme}
                  value={this.state.richValue}
                  onChange={(val) => this.setState({ richValue: val })}
                  onSelectionInfo={(info) => this.props.onRichSelectionInfo?.(info)}
                />
              </Column>
            </Row>
          </Column>
        </Column>
      </Padding>
    );
  }
}
