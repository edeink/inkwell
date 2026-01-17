/** @jsxImportSource @/utils/compiler */
import { InlineNodeRenderer } from './inline-renderer';
import { NodeType, type MarkdownNode } from './parser';

import type { ThemePalette } from '@/styles/theme';

import {
  Column,
  Container,
  CrossAxisAlignment,
  Padding,
  Row,
  Text,
  Wrap,
  type WidgetProps,
} from '@/core';

export function BlockNodeRenderer({
  node,
  theme,
  anchorKey,
}: {
  node: MarkdownNode;
  theme: ThemePalette;
  anchorKey?: string;
  key?: string;
}) {
  const textFontSize = 14;
  const textLineHeight = 24;
  switch (node.type) {
    case NodeType.Header:
      if (anchorKey) {
        return (
          <Container key={anchorKey} pointerEvent="none">
            <Padding padding={{ top: 10, bottom: 10 }}>
              <Text
                text={node.children?.map((c) => c.content || '').join('') || ''}
                fontSize={32 - (node.level || 1) * 4}
                lineHeight={40 - (node.level || 1) * 4}
                fontWeight="bold"
                color={theme.text.primary}
              />
            </Padding>
          </Container>
        );
      }
      return (
        <Padding padding={{ top: 10, bottom: 10 }}>
          <Text
            text={node.children?.map((c) => c.content || '').join('') || ''}
            fontSize={32 - (node.level || 1) * 4}
            lineHeight={40 - (node.level || 1) * 4}
            fontWeight="bold"
            color={theme.text.primary}
          />
        </Padding>
      );

    case NodeType.Paragraph:
      return (
        <Padding padding={{ bottom: 12 }}>
          <Wrap spacing={0} runSpacing={4}>
            {node.children?.map((child, i) => (
              <InlineNodeRenderer key={String(i)} node={child} theme={theme} />
            ))}
          </Wrap>
        </Padding>
      );

    case NodeType.CodeBlock:
      return (
        <Container
          color={theme.component.headerBg}
          borderRadius={8}
          border={{ width: 1, color: theme.border.secondary }}
          margin={{ bottom: 14 }}
        >
          <Padding padding={12}>
            <CodeBlockHighlighter
              code={node.content || ''}
              language={node.language || ''}
              theme={theme}
            />
          </Padding>
        </Container>
      );

    case NodeType.Quote:
      return (
        <Padding padding={{ bottom: 14 }}>
          <Container
            color={theme.background.base}
            borderRadius={6}
            border={{ width: 1, color: theme.border.secondary }}
          >
            <Row crossAxisAlignment={CrossAxisAlignment.Stretch}>
              <Container width={4} color={theme.border.base} />
              <Padding padding={{ left: 12, top: 10, bottom: 10, right: 12 }}>
                <Wrap spacing={0} runSpacing={4}>
                  {node.children?.map((child, i) => (
                    <InlineNodeRenderer key={String(i)} node={child} theme={theme} />
                  ))}
                </Wrap>
              </Padding>
            </Row>
          </Container>
        </Padding>
      );

    case NodeType.List:
      return (
        <Padding padding={{ bottom: 12 }}>
          <Column crossAxisAlignment={CrossAxisAlignment.Start} spacing={6}>
            {node.children?.map((child, i) => (
              <Row key={String(i)} crossAxisAlignment={CrossAxisAlignment.Start} spacing={10}>
                <Padding padding={{ top: 10 }}>
                  <Container width={6} height={6} color={theme.text.primary} borderRadius={3} />
                </Padding>
                <ExpandedTextWrap>
                  {child.children?.map((c, j) => (
                    <InlineNodeRenderer key={String(j)} node={c} theme={theme} />
                  ))}
                </ExpandedTextWrap>
              </Row>
            ))}
          </Column>
        </Padding>
      );

    case NodeType.OrderedList:
      return (
        <Padding padding={{ bottom: 12 }}>
          <Column crossAxisAlignment={CrossAxisAlignment.Start} spacing={6}>
            {node.children?.map((child, i) => (
              <Row key={String(i)} crossAxisAlignment={CrossAxisAlignment.Start} spacing={10}>
                <Container width={22} padding={{ top: 2 }}>
                  <Text
                    text={`${i + 1}.`}
                    fontSize={textFontSize}
                    lineHeight={textLineHeight}
                    color={theme.text.primary}
                  />
                </Container>
                <ExpandedTextWrap>
                  {child.children?.map((c, j) => (
                    <InlineNodeRenderer key={String(j)} node={c} theme={theme} />
                  ))}
                </ExpandedTextWrap>
              </Row>
            ))}
          </Column>
        </Padding>
      );

    case NodeType.TaskList:
      return (
        <Padding padding={{ bottom: 12 }}>
          <Column crossAxisAlignment={CrossAxisAlignment.Start} spacing={6}>
            {node.children?.map((child, i) => (
              <Row key={String(i)} crossAxisAlignment={CrossAxisAlignment.Start} spacing={10}>
                <Padding padding={{ top: 6 }}>
                  <Container
                    width={14}
                    height={14}
                    border={{ width: 1, color: theme.border.base }}
                    borderRadius={2}
                    color={child.checked ? theme.primary : theme.background.base}
                  />
                </Padding>
                <ExpandedTextWrap>
                  {child.children?.map((c, j) => (
                    <InlineNodeRenderer key={String(j)} node={c} theme={theme} />
                  ))}
                </ExpandedTextWrap>
              </Row>
            ))}
          </Column>
        </Padding>
      );

    case NodeType.Table:
      return (
        <Padding padding={{ bottom: 14 }}>
          <Container borderRadius={8} border={{ width: 1, color: theme.component.gridLine }}>
            <Column>
              {node.children?.map((row, i) => {
                const cells = row.children ?? [];
                const isLastRow = i === (node.children?.length ?? 0) - 1;
                return (
                  <Container
                    key={String(i)}
                    color={i % 2 === 0 ? theme.background.base : theme.background.surface}
                  >
                    <Column>
                      <Row>
                        {cells.map((cell, j) => {
                          const isLastCell = j === cells.length - 1;
                          return (
                            <Row key={String(j)}>
                              <Container width={150}>
                                <Padding padding={{ left: 8, right: 8, top: 6, bottom: 6 }}>
                                  <Wrap spacing={0} runSpacing={4}>
                                    {cell.children?.map((c, k) => (
                                      <InlineNodeRenderer key={String(k)} node={c} theme={theme} />
                                    ))}
                                  </Wrap>
                                </Padding>
                              </Container>
                              {!isLastCell ? (
                                <Container width={1} color={theme.component.gridLine} />
                              ) : (
                                <Container />
                              )}
                            </Row>
                          );
                        })}
                      </Row>
                      {!isLastRow ? (
                        <Container height={1} color={theme.component.gridLine} />
                      ) : (
                        <Container />
                      )}
                    </Column>
                  </Container>
                );
              })}
            </Column>
          </Container>
        </Padding>
      );

    case NodeType.HorizontalRule:
      return (
        <Padding padding={{ top: 12, bottom: 12 }}>
          <Container height={1} color={theme.border.base} />
        </Padding>
      );

    default:
      return <Container />;
  }
}

function CodeBlockHighlighter({
  code,
  language,
  theme,
}: {
  code: string;
  language: string;
  theme: ThemePalette;
}) {
  const lines = code.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return (
    <Column crossAxisAlignment={CrossAxisAlignment.Start}>
      {lines.map((line, i) => (
        <CodeLineRenderer key={String(i)} line={line} language={language} theme={theme} />
      ))}
    </Column>
  );
}

function CodeLineRenderer({
  line,
  language,
  theme,
  key,
}: {
  line: string;
  language: string;
  theme: ThemePalette;
  key?: string;
}) {
  if (!line) {
    return <Container height={20} />;
  }

  const tokens = tokenize(line, language, theme);

  return (
    <Wrap spacing={0}>
      {tokens.map((token, idx) => (
        <Text
          key={`${key || 't'}-${idx}`}
          text={token.content}
          fontSize={14}
          lineHeight={20}
          fontFamily="Monaco, Consolas, monospace"
          color={token.color}
        />
      ))}
    </Wrap>
  );
}

function ExpandedTextWrap({ children }: { children?: WidgetProps[] }) {
  return (
    <Container>
      <Wrap spacing={0} runSpacing={4}>
        {children}
      </Wrap>
    </Container>
  );
}

function tokenize(line: string, _language: string, theme: ThemePalette) {
  const keywords = [
    'const',
    'let',
    'var',
    'function',
    'return',
    'if',
    'else',
    'for',
    'while',
    'class',
    'new',
    'import',
    'from',
    'export',
  ];
  const parts = line.split(/(\s+|[(){}[\];,.])/);
  return parts
    .filter((p) => p.length > 0)
    .map((p) => {
      if (keywords.includes(p)) {
        return { content: p, color: theme.primary };
      }
      if (p.match(/^["'`].*["'`]$/)) {
        return { content: p, color: theme.success };
      }
      if (p.match(/^\d+$/)) {
        return { content: p, color: theme.warning };
      }
      return { content: p, color: theme.text.primary };
    });
}
