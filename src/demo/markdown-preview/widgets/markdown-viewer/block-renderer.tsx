/** @jsxImportSource @/utils/compiler */
import { NodeType } from '../../utils/parser';

import { InlineNodeRenderer } from './inline-renderer';

import type { MarkdownNode } from '../../utils/parser';
import type { ThemePalette } from '@/styles/theme';

import { Column, Container, CrossAxisAlignment, Padding, Row, Text, Wrap } from '@/core';

export function BlockNodeRenderer({
  node,
  theme,
}: {
  node: MarkdownNode;
  theme: ThemePalette;
  key?: string;
}) {
  switch (node.type) {
    case NodeType.Header:
      return (
        <Padding padding={{ top: 10, bottom: 10 }}>
          <Text
            text={node.children?.map((c) => c.content || '').join('') || ''}
            fontSize={32 - (node.level || 1) * 4}
            fontWeight="bold"
            color={theme.text.primary}
          />
        </Padding>
      );

    case NodeType.Paragraph:
      return (
        <Padding padding={{ bottom: 10 }}>
          <Wrap spacing={0} runSpacing={4}>
            {node.children?.map((child, i) => (
              <InlineNodeRenderer key={String(i)} node={child} theme={theme} />
            ))}
          </Wrap>
        </Padding>
      );

    case NodeType.CodeBlock:
      return (
        <Container color={theme.component.headerBg}>
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
        <Container
          decoration={{
            border: { left: { width: 4, color: theme.border.base } },
          }}
        >
          <Padding padding={{ left: 16, top: 0, bottom: 0, right: 0 }}>
            <Wrap>
              {node.children?.map((child, i) => (
                <InlineNodeRenderer key={String(i)} node={child} theme={theme} />
              ))}
            </Wrap>
          </Padding>
        </Container>
      );

    case NodeType.List:
      return (
        <Column crossAxisAlignment={CrossAxisAlignment.Start}>
          {node.children?.map((child, i) => (
            <Row key={String(i)} crossAxisAlignment={CrossAxisAlignment.Start}>
              <Padding padding={{ right: 8, top: 8 }}>
                <Container
                  width={6}
                  height={6}
                  color={theme.text.primary}
                  decoration={{ borderRadius: 3 }}
                />
              </Padding>
              <Wrap>
                {child.children?.map((c, j) => (
                  <InlineNodeRenderer key={String(j)} node={c} theme={theme} />
                ))}
              </Wrap>
            </Row>
          ))}
        </Column>
      );

    case NodeType.OrderedList:
      return (
        <Column crossAxisAlignment={CrossAxisAlignment.Start}>
          {node.children?.map((child, i) => (
            <Row key={String(i)} crossAxisAlignment={CrossAxisAlignment.Start}>
              <Padding padding={{ right: 8, top: 2 }}>
                <Text text={`${i + 1}.`} fontSize={16} color={theme.text.primary} />
              </Padding>
              <Wrap>
                {child.children?.map((c, j) => (
                  <InlineNodeRenderer key={String(j)} node={c} theme={theme} />
                ))}
              </Wrap>
            </Row>
          ))}
        </Column>
      );

    case NodeType.TaskList:
      return (
        <Column crossAxisAlignment={CrossAxisAlignment.Start}>
          {node.children?.map((child, i) => (
            <Row key={String(i)} crossAxisAlignment={CrossAxisAlignment.Start}>
              <Padding padding={{ right: 8, top: 6 }}>
                {/* Custom Checkbox */}
                <Container
                  width={14}
                  height={14}
                  decoration={{
                    border: {
                      top: { width: 1, color: theme.border.base },
                      bottom: { width: 1, color: theme.border.base },
                      left: { width: 1, color: theme.border.base },
                      right: { width: 1, color: theme.border.base },
                    },
                    borderRadius: 2,
                  }}
                  color={child.checked ? theme.primary : theme.background.base}
                />
              </Padding>
              <Wrap>
                {child.children?.map((c, j) => (
                  <InlineNodeRenderer key={String(j)} node={c} theme={theme} />
                ))}
              </Wrap>
            </Row>
          ))}
        </Column>
      );

    case NodeType.Table:
      return (
        <Container
          decoration={{
            border: {
              top: { width: 1, color: theme.component.gridLine },
              bottom: { width: 1, color: theme.component.gridLine },
              left: { width: 1, color: theme.component.gridLine },
              right: { width: 1, color: theme.component.gridLine },
            },
          }}
        >
          <Column>
            {node.children?.map((row, i) => (
              <Container
                key={String(i)}
                color={i % 2 === 0 ? theme.background.base : theme.background.surface}
                decoration={{ border: { bottom: { width: 1, color: theme.component.gridLine } } }}
              >
                <Row>
                  {row.children?.map((cell, j) => (
                    <Container
                      key={String(j)}
                      width={150} // Fixed width for simplicity
                      decoration={{
                        border: { right: { width: 1, color: theme.component.gridLine } },
                      }}
                    >
                      <Padding padding={8}>
                        <Wrap>
                          {cell.children?.map((c, k) => (
                            <InlineNodeRenderer key={String(k)} node={c} theme={theme} />
                          ))}
                        </Wrap>
                      </Padding>
                    </Container>
                  ))}
                </Row>
              </Container>
            ))}
          </Column>
        </Container>
      );

    case NodeType.HorizontalRule:
      return (
        <Padding padding={{ top: 10, bottom: 10 }}>
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
  // Remove last empty line if it exists (often from splitting trailing newline)
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
  // Preserve height for empty lines
  if (!line) {
    return <Container height={20} />;
  }

  const tokens = tokenize(line, language, theme);

  return (
    <Row crossAxisAlignment={CrossAxisAlignment.Start}>
      {tokens.map((token, i) => (
        <Text
          key={String(i)}
          text={token.text}
          color={token.color}
          fontFamily="Monaco, Consolas, monospace"
          fontSize={14}
          lineHeight={20}
        />
      ))}
    </Row>
  );
}

function tokenize(
  line: string,
  language: string,
  theme: ThemePalette,
): { text: string; color: string }[] {
  const tokens: { text: string; color: string }[] = [];

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
    'import',
    'export',
    'from',
    'class',
    'interface',
    'extends',
    'implements',
    'type',
    'def',
    'print',
  ];
  if (language === 'python' || language === 'py') {
    keywords.push('def', 'print', 'if', 'else', 'elif', 'for', 'in', 'return');
  }

  // Split by delimiters but keep delimiters
  // Delimiters: space, punctuation
  const parts = line.split(/(\s+|[(){}[\].,;:"'])/g);

  let inString = false;
  let stringChar = '';

  const isDark = theme.background.base === '#1b1b1d'; // Simple check for dark mode

  // Colors for light/dark mode
  const colors = isDark
    ? {
        default: '#e6edf3',
        string: '#a5d6ff',
        keyword: '#ff7b72',
        number: '#79c0ff',
        type: '#d2a8ff',
        comment: '#8b949e',
      }
    : {
        default: '#24292e',
        string: '#032f62',
        keyword: '#d73a49',
        number: '#005cc5',
        type: '#6f42c1',
        comment: '#6a737d',
      };

  for (const part of parts) {
    if (!part) {
      continue;
    }

    let color = colors.default;

    // Simple string handling (buggy for mixed quotes but ok for simple demo)
    if (inString) {
      color = colors.string;
      if (part === stringChar) {
        inString = false;
      }
    } else {
      if (part === '"' || part === "'") {
        inString = true;
        stringChar = part;
        color = colors.string;
      } else if (keywords.includes(part)) {
        color = colors.keyword;
      } else if (part.match(/^\d+$/)) {
        color = colors.number;
      } else if (part.match(/^[A-Z][a-zA-Z0-9]*$/)) {
        color = colors.type;
      } else if (part.trim().startsWith('//')) {
        color = colors.comment;
      }
    }

    tokens.push({ text: part, color });
  }

  return tokens;
}
