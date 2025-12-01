import Mermaid from '@theme/Mermaid';

import InkPlayground from '@/docusaurus/components/ink-playground';
import { stripJsxImportSource } from '@/docusaurus/utils/strip-jsx';

type Props = {
  children: string | { props?: { children?: string } };
  className?: string;
  metastring?: string;
};

function transformFlowToMermaid(src: string) {
  const lines = src
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const nodeDefs: string[] = [];
  const edgeDefs: string[] = [];
  for (const l of lines) {
    const m = l.match(/^(\w+)\s*=>\s*(\w+)\s*:\s*(.+)$/);
    if (m) {
      const id = m[1];
      const type = m[2].toLowerCase();
      const label = m[3];
      if (type === 'start' || type === 'end') {
        nodeDefs.push(`${id}([${label}])`);
      } else if (type === 'condition') {
        nodeDefs.push(`${id}{${label}}`);
      } else {
        nodeDefs.push(`${id}[${label}]`);
      }
      continue;
    }
    if (l.includes('->')) {
      const parts = l
        .split('->')
        .map((p) => p.trim())
        .filter(Boolean);
      const parse = (t: string) => {
        const mm = t.match(/^([A-Za-z0-9_]+)(?:\(([^)]+)\))?$/);
        return { id: mm ? mm[1] : t, label: mm && mm[2] ? mm[2] : null };
      };
      for (let i = 0; i < parts.length - 1; i++) {
        const a = parse(parts[i]);
        const b = parse(parts[i + 1]);
        const lbl = a.label ? `|${a.label}|` : '';
        edgeDefs.push(`${a.id} -->${lbl} ${b.id}`);
      }
    }
  }
  return `flowchart TD\n${nodeDefs.join('\n')}\n${edgeDefs.join('\n')}`;
}

function transformSeqToMermaid(src: string) {
  const body = src.trim();
  return `sequenceDiagram\n${body}`;
}

export default function CodeBlock(props: Props) {
  const { children, className, metastring } = props;
  const code = typeof children === 'string' ? children : String(children?.props?.children ?? '');
  const lang = (className || '').replace(/^language-/, '');
  const isMermaid = lang === 'mermaid';
  const isFlow = lang === 'flow';
  const isSeq = lang === 'seq';
  const modeMatch = typeof metastring === 'string' ? metastring.match(/mode:(\w+)/) : null;
  const mode = (modeMatch?.[1] as 'render' | 'edit' | 'code' | undefined) || undefined;
  // Mermaid 系列按原有规则渲染
  if (isMermaid) {
    return <Mermaid value={code} />;
  }
  if (isFlow) {
    return <Mermaid value={transformFlowToMermaid(code)} />;
  }
  if (isSeq) {
    return <Mermaid value={transformSeqToMermaid(code)} />;
  }
  // 未明确定义的语言类型（包括 tsx/jsx/其他）统一路由到 InkPlayground
  const cleaned = stripJsxImportSource(code);
  return <InkPlayground code={cleaned} mode={mode} />;
}
