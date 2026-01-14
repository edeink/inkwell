/** @jsxImportSource @/utils/compiler */
import { Input } from './widget/input';
import { TextArea } from './widget/textarea';

import {
  Column,
  Container,
  CrossAxisAlignment,
  Padding,
  Row,
  StatefulWidget,
  Text,
  type WidgetProps,
} from '@/core';
import Runtime from '@/runtime';
import { Themes, type ThemePalette } from '@/styles/theme';

interface EditableTextDemoProps extends WidgetProps {
  theme?: ThemePalette;
}

interface EditableTextDemoState {
  singleLineValue: string;
  multiLineValue: string;
  [key: string]: unknown;
}

export class EditableTextDemo extends StatefulWidget<EditableTextDemoProps, EditableTextDemoState> {
  state: EditableTextDemoState = {
    singleLineValue: '这是一个单行编辑器',
    multiLineValue: '这是一个多行编辑器\n支持回车换行\n支持光标移动',
  };

  render() {
    const theme = this.props.theme || Themes.light;
    const borderColor = theme.border.base;

    return (
      <Padding padding={40}>
        <Column spacing={40} crossAxisAlignment={CrossAxisAlignment.Start}>
          <Text
            text="EditableText 示例"
            fontSize={24}
            fontWeight="bold"
            color={theme.text.primary}
          />

          <Row spacing={40} crossAxisAlignment={CrossAxisAlignment.Start}>
            {/* 单行编辑器 */}
            <Column spacing={10}>
              <Text text="单行编辑器 (Input)" fontSize={16} color={theme.text.secondary} />
              <Container
                width={300}
                height={42}
                border={{ color: borderColor, width: 1 }}
                borderRadius={4}
                color={theme.background.container}
              >
                <Padding padding={{ left: 12, top: 10, right: 12, bottom: 10 }}>
                  <Input
                    value={this.state.singleLineValue}
                    onChange={(val) => this.setState({ singleLineValue: val })}
                    color={theme.text.primary}
                    fontSize={14}
                    selectionColor={theme.state.focus}
                    cursorColor={theme.text.primary}
                  />
                </Padding>
              </Container>
              <Text
                text={`当前值: ${this.state.singleLineValue}`}
                fontSize={12}
                color={theme.text.placeholder}
              />
            </Column>

            {/* 多行编辑器 */}
            <Column spacing={10}>
              <Text text="多行编辑器 (TextArea)" fontSize={16} color={theme.text.secondary} />
              <Container
                width={300}
                height={150}
                border={{ color: borderColor, width: 1 }}
                borderRadius={4}
                color={theme.background.container}
              >
                <Padding padding={12}>
                  <TextArea
                    value={this.state.multiLineValue}
                    onChange={(val) => this.setState({ multiLineValue: val })}
                    color={theme.text.primary}
                    fontSize={14}
                    selectionColor={theme.state.focus}
                    cursorColor={theme.text.primary}
                  />
                </Padding>
              </Container>
              <Text
                text={`字符数: ${this.state.multiLineValue.length}`}
                fontSize={12}
                color={theme.text.placeholder}
              />
            </Column>
          </Row>
        </Column>
      </Padding>
    );
  }
}

export function runApp(runtime: Runtime, theme: ThemePalette) {
  runtime.render(<EditableTextDemo theme={theme} />);
}
