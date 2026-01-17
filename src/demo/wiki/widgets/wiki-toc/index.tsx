/** @jsxImportSource @/utils/compiler */
import { FStateWidget } from '../fstate-widget';

import type { WidgetProps } from '@/core';
import type { ThemePalette } from '@/styles/theme';

import { Column, Container, Expanded, Padding, Row, ScrollView, Text } from '@/core';
import { CrossAxisAlignment, MainAxisSize } from '@/core/flex/type';

export type MarkdownTocItem = {
  key: string;
  text: string;
  level: number;
};

export type WikiTocProps = {
  width: number;
  height: number;
  theme: ThemePalette;
  toc: MarkdownTocItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  onRef: (r: unknown) => void;
} & WidgetProps;

export class WikiToc extends FStateWidget<WikiTocProps, {}> {
  protected getInitialState(): {} {
    return {};
  }

  render() {
    const { width, height, theme, toc, activeKey, onSelect, onRef } = this.props;
    const panelWidth = Math.max(0, width);
    const dividerW = 1;
    const innerW = Math.max(0, panelWidth - dividerW);

    return (
      <Container width={panelWidth} height={height} color={theme.background.surface}>
        <Row width={panelWidth} height={height} crossAxisAlignment={CrossAxisAlignment.Stretch}>
          <Container
            width={dividerW}
            height={height}
            color={theme.border.base}
            pointerEvent="none"
          />
          <Container width={innerW} height={height} color={theme.background.surface}>
            <Padding padding={12}>
              <Column
                mainAxisSize={MainAxisSize.Max}
                spacing={10}
                crossAxisAlignment={CrossAxisAlignment.Stretch}
              >
                <Text text="目录" fontSize={14} fontWeight="bold" color={theme.text.primary} />
                <Expanded flex={{ flex: 1 }}>
                  <ScrollView ref={onRef} scrollBarWidth={4} scrollBarColor={theme.text.secondary}>
                    <Column mainAxisSize={MainAxisSize.Min} spacing={6}>
                      {toc.map((item) => (
                        <Padding
                          key={item.key}
                          padding={{ left: Math.max(0, (item.level - 1) * 12) }}
                        >
                          <Container
                            height={28}
                            padding={{ left: 10, right: 10 }}
                            borderRadius={6}
                            color={item.key === activeKey ? theme.state.selected : 'transparent'}
                            cursor="pointer"
                            onClick={() => onSelect(item.key)}
                            alignment="center"
                          >
                            <Text
                              text={item.text}
                              fontSize={14}
                              color={
                                item.key === activeKey ? theme.text.primary : theme.text.secondary
                              }
                            />
                          </Container>
                        </Padding>
                      ))}
                    </Column>
                  </ScrollView>
                </Expanded>
              </Column>
            </Padding>
          </Container>
        </Row>
      </Container>
    );
  }
}
