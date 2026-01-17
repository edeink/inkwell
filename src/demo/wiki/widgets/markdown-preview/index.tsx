/** @jsxImportSource @/utils/compiler */
/**
 * Markdown 预览组件（Widget 版）。
 *
 * 主要职责：
 * - 解析 front matter（title/date/categories/link）。
 * - 解析 Markdown 正文为 AST（支持外部直接传入 ast 以避免重复解析）。
 * - 逐个把块级节点交给 BlockNodeRenderer 渲染。
 *
 * 关键参数说明：
 * - content：原始 Markdown 字符串（可包含 front matter）。
 * - theme：主题色板，负责统一文字/背景/边框等颜色。
 * - ast：可选的已解析 AST；传入后会跳过解析步骤（用于缓存或测试）。
 * - headerKeyPrefix：可选的标题 key 前缀，用于目录跳转锚点；不传时会基于当前组件 key 自动生成。
 *
 * @example
 * ```ts
 * <MarkdownPreview content={rawMarkdown} theme={theme} />
 * ```
 */
import { parseMarkdownFrontMatter } from '../../helpers/wiki-doc';

import { BlockNodeRenderer } from './block-renderers';
import { MarkdownParser, NodeType, type MarkdownNode } from './parser';

import type { ThemePalette } from '@/styles/theme';

import { Column, Container, Padding, Row, StatelessWidget, Text, type WidgetProps } from '@/core';
import { CrossAxisAlignment, MainAxisAlignment, MainAxisSize } from '@/core/flex/type';

export type MarkdownPreviewProps = {
  content: string;
  theme: ThemePalette;
  ast?: MarkdownNode;
  headerKeyPrefix?: string;
} & WidgetProps;

const parser = new MarkdownParser();

export { BlockNodeRenderer, MarkdownParser, NodeType, type MarkdownNode };

export class MarkdownPreview extends StatelessWidget<MarkdownPreviewProps> {
  protected render() {
    const { content, theme, ast: astProp, headerKeyPrefix } = this.props;
    const parsed = parseMarkdownFrontMatter(content);
    const ast = astProp ?? parser.parse(parsed.body);

    const effectiveHeaderKeyPrefix = headerKeyPrefix ?? `${this.key || 'md'}-h`;
    let headerIdx = 0;

    const hasFrontMatter =
      !!parsed.frontMatter.title ||
      !!parsed.frontMatter.link ||
      !!parsed.frontMatter.date ||
      (parsed.frontMatter.categories?.length ?? 0) > 0;

    return (
      <Column
        crossAxisAlignment={CrossAxisAlignment.Start}
        mainAxisAlignment={MainAxisAlignment.Start}
        mainAxisSize={MainAxisSize.Min}
      >
        {hasFrontMatter ? (
          <Container alignment="topLeft">
            <Padding padding={{ bottom: 16 }}>
              <Column crossAxisAlignment={CrossAxisAlignment.Start} spacing={10}>
                {parsed.frontMatter.title ? (
                  <Text
                    text={parsed.frontMatter.title}
                    fontSize={28}
                    lineHeight={36}
                    fontWeight="bold"
                    color={theme.text.primary}
                  />
                ) : null}
                {parsed.frontMatter.date || (parsed.frontMatter.categories?.length ?? 0) > 0 ? (
                  <Row spacing={10}>
                    {parsed.frontMatter.date ? (
                      <Text
                        text={parsed.frontMatter.date}
                        fontSize={12}
                        lineHeight={16}
                        color={theme.text.secondary}
                      />
                    ) : null}
                    {(parsed.frontMatter.categories?.length ?? 0) > 0 ? (
                      <Row spacing={6}>
                        {parsed.frontMatter.categories!.map((c) => (
                          <Container
                            key={c}
                            color={theme.state.hover}
                            borderRadius={999}
                            padding={{ left: 8, right: 8, top: 2, bottom: 2 }}
                          >
                            <Text
                              text={c}
                              fontSize={12}
                              lineHeight={16}
                              color={theme.text.secondary}
                            />
                          </Container>
                        ))}
                      </Row>
                    ) : null}
                  </Row>
                ) : null}
                {parsed.frontMatter.link ? (
                  <Text
                    text={`link: ${parsed.frontMatter.link}`}
                    fontSize={12}
                    lineHeight={16}
                    color={theme.text.placeholder}
                  />
                ) : null}
              </Column>
            </Padding>
          </Container>
        ) : null}
        {ast.children?.map((node, index) => (
          <BlockNodeRenderer
            key={String(index)}
            node={node}
            theme={theme}
            anchorKey={
              node.type === NodeType.Header
                ? `${effectiveHeaderKeyPrefix}-${headerIdx++}`
                : undefined
            }
          />
        ))}
      </Column>
    );
  }
}
