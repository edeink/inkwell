/** @jsxImportSource @/utils/compiler */
/**
 * 块级渲染器共享工具。
 *
 * 主要包含：
 * - ensureKey：把可选 key 规整为字符串，避免 key 类型变化导致 diff 不稳定。
 * - plainText：把一组 Markdown 行内节点降级为纯文本（用于表格等需要稳定布局的场景）。
 * - CodeBlockHighlighter：代码块轻量高亮（Demo 级别），按行拆分并对 token 上色。
 * - InlineWrap：把行内 children 交给 InlineNodeRenderer 渲染，并用 Wrap 自动换行。
 *
 * 说明：
 * - 本文件的实现目标是“演示 + 可测 + 稳定”，不追求完整语法高亮与 Markdown 规范覆盖。
 */
import { InlineNodeRenderer } from '../inline-renderers';
import { NodeType, type MarkdownNode } from '../parser';

import type { PointerEvents } from '@/core/type';
import type { ThemePalette } from '@/styles/theme';

import { Column, Container, CrossAxisAlignment, Text, Wrap } from '@/core';

export function ensureKey(ctxKey?: string | number | null) {
  if (ctxKey === undefined || ctxKey === null) {
    return undefined;
  }
  return String(ctxKey);
}

export function plainText(nodes?: MarkdownNode[]): string {
  let out = '';
  for (const n of nodes || []) {
    if (n.type === NodeType.Text) {
      out += n.content || '';
      continue;
    }
    if (n.type === NodeType.Bold || n.type === NodeType.Italic) {
      out += n.content || '';
      continue;
    }
    if (n.type === NodeType.CodeBlock) {
      out += n.content || '';
      continue;
    }
    if (n.type === NodeType.Link) {
      const t = plainText(n.children);
      out += t || n.href || '';
      continue;
    }
    if (n.type === NodeType.Image) {
      out += n.alt || '';
      continue;
    }
    if (n.children) {
      out += plainText(n.children);
    }
  }
  return out;
}

export function CodeBlockHighlighter({
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

export function InlineWrap({
  children,
  theme,
  keyPrefix,
  pointerEvent = 'auto',
}: {
  children?: MarkdownNode[];
  theme: ThemePalette;
  keyPrefix?: string;
  pointerEvent?: PointerEvents;
}) {
  return (
    <Wrap spacing={0} runSpacing={4} pointerEvent={pointerEvent}>
      {children?.map((child, i) => (
        <InlineNodeRenderer key={`${keyPrefix ?? 'inline'}-${i}`} node={child} theme={theme} />
      ))}
    </Wrap>
  );
}
