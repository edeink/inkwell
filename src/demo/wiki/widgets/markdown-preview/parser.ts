/**
 * Markdown 解析器（Demo 级别实现）。
 *
 * 该解析器的目标是为 Wiki Demo 提供“足够覆盖常用语法”的 AST，
 * 并保持实现轻量、易读、可测试。
 *
 * 支持范围（按节点类型）：
 * - 块级：Header/Paragraph/List/OrderedList/TaskList/Quote/CodeBlock/Table/HorizontalRule
 * - 行内：Text/Bold/Italic/Link/Image/CodeBlock(行内)
 *
 * 重要实现说明：
 * - parse：按行扫描，识别块级结构。
 * - parseInline：在一行内按最先出现的语法片段切分为多个行内节点。
 *
 * 注意：这是简化解析器，不追求完整 Markdown 规范覆盖。
 */
export enum NodeType {
  Root = 'root',
  Header = 'header',
  Paragraph = 'paragraph',
  List = 'list',
  OrderedList = 'orderedList',
  TaskList = 'taskList',
  ListItem = 'listItem',
  TaskListItem = 'taskListItem',
  CodeBlock = 'codeBlock',
  Quote = 'quote',
  Text = 'text',
  Bold = 'bold',
  Italic = 'italic',
  Link = 'link',
  Image = 'image',
  Table = 'table',
  TableRow = 'tableRow',
  TableCell = 'tableCell',
  HorizontalRule = 'horizontalRule',
}

export interface MarkdownNode {
  type: NodeType;
  content?: string;
  children?: MarkdownNode[];
  level?: number;
  language?: string;
  href?: string;
  alt?: string;
  checked?: boolean;
  align?: 'left' | 'center' | 'right';
  isHeader?: boolean;
}

export class MarkdownParser {
  private getIndent(line: string) {
    const m = line.match(/^(\s*)/);
    return m ? m[1].length : 0;
  }

  private matchTaskListLine(line: string) {
    const m = line.match(/^(\s*)-\s+\[([ x])\]\s+(.+)$/);
    if (!m) {
      return null;
    }
    return { indent: m[1].length, checked: m[2] === 'x', text: m[3] };
  }

  private matchUnorderedListLine(line: string) {
    const m = line.match(/^(\s*)(\*|-)\s+(.+)$/);
    if (!m) {
      return null;
    }
    return { indent: m[1].length, text: m[3] };
  }

  private matchOrderedListLine(line: string) {
    const m = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
    if (!m) {
      return null;
    }
    return { indent: m[1].length, text: m[3] };
  }

  private parseListBlock(
    lines: string[],
    startIndex: number,
  ): { node: MarkdownNode; nextIndex: number } {
    const firstLine = lines[startIndex] ?? '';
    const task = this.matchTaskListLine(firstLine);
    const ordered = task ? null : this.matchOrderedListLine(firstLine);
    const unordered = task || ordered ? null : this.matchUnorderedListLine(firstLine);

    if (!task && !ordered && !unordered) {
      return {
        node: { type: NodeType.Paragraph, children: this.parseInline(firstLine) },
        nextIndex: startIndex + 1,
      };
    }

    const baseIndent = (task || ordered || unordered)!.indent;
    const listType = task ? NodeType.TaskList : ordered ? NodeType.OrderedList : NodeType.List;
    const listNode: MarkdownNode = { type: listType, children: [] };

    let i = startIndex;
    while (i < lines.length) {
      const line = lines[i];
      if (!line || line.trim() === '') {
        break;
      }

      let itemText: string | undefined;
      let itemChecked: boolean | undefined;

      if (task) {
        const m = this.matchTaskListLine(line);
        if (!m || m.indent !== baseIndent) {
          break;
        }
        itemText = m.text;
        itemChecked = m.checked;
      } else if (ordered) {
        const m = this.matchOrderedListLine(line);
        if (!m || m.indent !== baseIndent) {
          break;
        }
        itemText = m.text;
      } else {
        const m = this.matchUnorderedListLine(line);
        if (!m || m.indent !== baseIndent) {
          break;
        }
        itemText = m.text;
      }

      const itemNode: MarkdownNode = task
        ? {
            type: NodeType.TaskListItem,
            checked: itemChecked,
            children: this.parseInline(itemText || ''),
          }
        : {
            type: NodeType.ListItem,
            children: this.parseInline(itemText || ''),
          };

      i++;

      while (i < lines.length) {
        const nextLine = lines[i];
        if (!nextLine || nextLine.trim() === '') {
          break;
        }
        const nextIndent = this.getIndent(nextLine);
        if (nextIndent <= baseIndent) {
          break;
        }

        const isNestedList =
          this.matchTaskListLine(nextLine) ||
          this.matchOrderedListLine(nextLine) ||
          this.matchUnorderedListLine(nextLine);
        if (!isNestedList) {
          break;
        }

        const nested = this.parseListBlock(lines, i);
        itemNode.children = [...(itemNode.children ?? []), nested.node];
        i = nested.nextIndex;
      }

      listNode.children!.push(itemNode);
    }

    return { node: listNode, nextIndex: i };
  }

  parse(text: string): MarkdownNode {
    const lines = text.split(/\r?\n/);
    const root: MarkdownNode = { type: NodeType.Root, children: [] };

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (trimmedLine === '') {
        i++;
        continue;
      }

      if (trimmedLine.match(/^(\*{3,}|-{3,}|_{3,})$/)) {
        root.children!.push({ type: NodeType.HorizontalRule });
        i++;
        continue;
      }

      if (trimmedLine.startsWith('```')) {
        const language = trimmedLine.slice(3).trim();
        let codeContent = '';
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeContent += lines[i] + '\n';
          i++;
        }
        root.children!.push({
          type: NodeType.CodeBlock,
          content: codeContent,
          language,
        });
        i++;
        continue;
      }

      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        root.children!.push({
          type: NodeType.Header,
          level: headerMatch[1].length,
          children: [{ type: NodeType.Text, content: headerMatch[2] }],
        });
        i++;
        continue;
      }

      if (trimmedLine.startsWith('|')) {
        const tableNode: MarkdownNode = { type: NodeType.Table, children: [] };

        const headerCells = trimmedLine
          .split('|')
          .filter((c) => c.trim() !== '')
          .map((c) => c.trim());
        const headerRow: MarkdownNode = {
          type: NodeType.TableRow,
          children: headerCells.map((c) => ({
            type: NodeType.TableCell,
            children: this.parseInline(c),
            isHeader: true,
          })),
        };
        tableNode.children!.push(headerRow);
        i++;

        if (i < lines.length && lines[i].trim().startsWith('|') && lines[i].includes('-')) {
          i++;
        }

        while (i < lines.length && lines[i].trim().startsWith('|')) {
          const rowCells = lines[i]
            .trim()
            .split('|')
            .filter((c, idx, arr) => {
              if (idx === 0 && c === '') {
                return false;
              }
              if (idx === arr.length - 1 && c === '') {
                return false;
              }
              return true;
            })
            .map((c) => c.trim());

          const row: MarkdownNode = {
            type: NodeType.TableRow,
            children: rowCells.map((c) => ({
              type: NodeType.TableCell,
              children: this.parseInline(c),
              isHeader: false,
            })),
          };
          tableNode.children!.push(row);
          i++;
        }
        root.children!.push(tableNode);
        continue;
      }

      const isListLine =
        this.matchTaskListLine(line) ||
        this.matchOrderedListLine(line) ||
        this.matchUnorderedListLine(line);
      if (isListLine) {
        const parsed = this.parseListBlock(lines, i);
        root.children!.push(parsed.node);
        i = parsed.nextIndex;
        continue;
      }

      if (trimmedLine.startsWith('>')) {
        const quoteNode: MarkdownNode = { type: NodeType.Quote, children: [] };

        while (i < lines.length && lines[i].trim().startsWith('>')) {
          const content = lines[i].trim().replace(/^>\s?/, '');
          quoteNode.children!.push(...this.parseInline(content));
          i++;
        }
        root.children!.push(quoteNode);
        continue;
      }

      root.children!.push({
        type: NodeType.Paragraph,
        children: this.parseInline(line),
      });
      i++;
    }

    return root;
  }

  parseInline(text: string): MarkdownNode[] {
    const splitPlainText = (content: string): MarkdownNode[] => {
      if (!content) {
        return [];
      }

      const out: MarkdownNode[] = [];
      const cjkChunkSize = 6;

      let buf = '';
      let bufType: 'space' | 'ascii' | 'cjk' | null = null;
      let cjkCount = 0;

      const flush = () => {
        if (!buf) {
          return;
        }
        out.push({ type: NodeType.Text, content: buf });
        buf = '';
        bufType = null;
        cjkCount = 0;
      };

      for (let i = 0; i < content.length; i++) {
        const codePoint = content.codePointAt(i);
        if (codePoint === undefined) {
          break;
        }
        const ch = String.fromCodePoint(codePoint);
        if (ch.length === 2) {
          i += 1;
        }

        if (ch === '\n') {
          flush();
          out.push({ type: NodeType.Text, content: ch });
          continue;
        }

        if (/\s/.test(ch)) {
          if (bufType !== 'space') {
            flush();
            bufType = 'space';
          }
          buf += ch;
          continue;
        }

        if (/[A-Za-z0-9_]/.test(ch)) {
          if (bufType !== 'ascii') {
            flush();
            bufType = 'ascii';
          }
          buf += ch;
          continue;
        }

        if (/[\u3400-\u9FFF]/.test(ch)) {
          if (bufType !== 'cjk') {
            flush();
            bufType = 'cjk';
          }
          buf += ch;
          cjkCount += 1;
          if (cjkCount >= cjkChunkSize) {
            flush();
          }
          continue;
        }

        flush();
        out.push({ type: NodeType.Text, content: ch });
      }

      flush();
      return out;
    };

    const nodes: MarkdownNode[] = [];
    let currentText = text;

    while (currentText.length > 0) {
      const imageMatch = currentText.match(/!\[(.*?)\]\((.*?)\)/);
      const linkMatch = currentText.match(/\[(.*?)\]\((.*?)\)/);
      const boldMatch = currentText.match(/\*\*(.*?)\*\*/);
      const italicMatch = currentText.match(/\*(.*?)\*/);
      const codeMatch = currentText.match(/`(.*?)`/);

      const matches = [
        { type: NodeType.Image, match: imageMatch, index: imageMatch?.index },
        { type: NodeType.Link, match: linkMatch, index: linkMatch?.index },
        { type: NodeType.Bold, match: boldMatch, index: boldMatch?.index },
        { type: NodeType.Italic, match: italicMatch, index: italicMatch?.index },
        { type: NodeType.CodeBlock, match: codeMatch, index: codeMatch?.index, isInline: true },
      ]
        .filter((m) => m.match !== null && m.index !== undefined)
        .sort((a, b) => a.index! - b.index!);

      if (matches.length === 0) {
        nodes.push(...splitPlainText(currentText));
        break;
      }

      const firstMatch = matches[0];
      const matchIndex = firstMatch.index!;
      const matchLength = firstMatch.match![0].length;

      if (matchIndex > 0) {
        nodes.push(...splitPlainText(currentText.slice(0, matchIndex)));
      }

      if (firstMatch.type === NodeType.Image) {
        nodes.push({
          type: NodeType.Image,
          alt: firstMatch.match![1],
          href: firstMatch.match![2],
        });
      } else if (firstMatch.type === NodeType.Link) {
        nodes.push({
          type: NodeType.Link,
          href: firstMatch.match![2],
          children: [{ type: NodeType.Text, content: firstMatch.match![1] }],
        });
      } else if (firstMatch.type === NodeType.Bold) {
        nodes.push({
          type: NodeType.Bold,
          content: firstMatch.match![1],
        });
      } else if (firstMatch.type === NodeType.Italic) {
        nodes.push({
          type: NodeType.Italic,
          content: firstMatch.match![1],
        });
      } else if (firstMatch.type === NodeType.CodeBlock) {
        nodes.push({
          type: NodeType.CodeBlock,
          content: firstMatch.match![1],
        });
      }

      currentText = currentText.slice(matchIndex + matchLength);
    }

    return nodes;
  }
}
