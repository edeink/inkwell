import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type Key,
  type ReactNode,
} from 'react';

import { CaretDownOutlined, CaretRightOutlined } from '@/ui/icons';

export type DataNode = {
  key: Key;
  title?: ReactNode;
  children?: DataNode[];
  [k: string]: unknown;
};

export type TreeHandle = {
  scrollTo: (args: { key: Key; align?: 'auto' | 'top' | 'bottom' }) => void;
};

export type TreeProps = {
  className?: string;
  style?: CSSProperties;
  showLine?: boolean;
  height?: number;
  treeData: DataNode[];
  titleRender?: (node: DataNode) => ReactNode;
  expandedKeys?: Key[];
  onExpand?: (keys: Key[]) => void;
  selectedKeys?: Key[];
  onSelect?: (keys: Key[]) => void;
  filterTreeNode?: (node: DataNode) => boolean;
};

function flattenTree(
  nodes: DataNode[],
  expanded: Set<string>,
  filter: ((n: DataNode) => boolean) | undefined,
  depth = 0,
): Array<{ node: DataNode; depth: number; hasChildren: boolean }> {
  const out: Array<{ node: DataNode; depth: number; hasChildren: boolean }> = [];
  for (const n of nodes) {
    if (filter && !filter(n)) {
      continue;
    }
    const children = (n.children ?? []) as DataNode[];
    const hasChildren = children.length > 0;
    out.push({ node: n, depth, hasChildren });
    if (hasChildren && expanded.has(String(n.key))) {
      out.push(...flattenTree(children, expanded, filter, depth + 1));
    }
  }
  return out;
}

export const Tree = forwardRef<TreeHandle, TreeProps>(function Tree(
  {
    className,
    style,
    height,
    treeData,
    titleRender,
    expandedKeys,
    onExpand,
    selectedKeys,
    onSelect,
    filterTreeNode,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const expanded = useMemo(
    () => new Set((expandedKeys ?? []).map((k) => String(k))),
    [expandedKeys],
  );
  const selected = useMemo(
    () => new Set((selectedKeys ?? []).map((k) => String(k))),
    [selectedKeys],
  );
  const rows = useMemo(
    () => flattenTree(treeData ?? [], expanded, filterTreeNode),
    [treeData, expanded, filterTreeNode],
  );

  useEffect(() => {
    if (!ref) {
      return;
    }
    const api: TreeHandle = {
      scrollTo: ({ key }) => {
        const el = containerRef.current?.querySelector(
          `[data-key="${String(key)}"]`,
        ) as HTMLElement | null;
        el?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      },
    };
    if (typeof ref === 'function') {
      ref(api);
    } else {
      ref.current = api;
    }
  }, [ref]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        overflowY: 'auto',
        height,
        fontSize: 12,
        color: 'var(--ink-demo-text-primary)',
        ...style,
      }}
    >
      {rows.map(({ node, depth, hasChildren }) => {
        const keyStr = String(node.key);
        const isExpanded = expanded.has(keyStr);
        const isSelected = selected.has(keyStr);
        return (
          <div
            key={keyStr}
            data-key={keyStr}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '2px 8px',
              paddingLeft: 8 + depth * 14,
              borderRadius: 8,
              background: isSelected
                ? 'color-mix(in srgb, var(--ink-demo-primary), transparent 90%)'
                : 'transparent',
              cursor: 'default',
              userSelect: 'none',
            }}
            onClick={() => onSelect?.([node.key])}
          >
            {hasChildren ? (
              <button
                type="button"
                style={{
                  width: 16,
                  height: 16,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--ink-demo-text-secondary)',
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 0,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  const next = new Set(expanded);
                  if (isExpanded) {
                    next.delete(keyStr);
                  } else {
                    next.add(keyStr);
                  }
                  onExpand?.(Array.from(next));
                }}
              >
                {isExpanded ? (
                  <CaretDownOutlined style={{ fontSize: 12 }} />
                ) : (
                  <CaretRightOutlined style={{ fontSize: 12 }} />
                )}
              </button>
            ) : (
              <span
                style={{
                  width: 16,
                  height: 16,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              {titleRender ? titleRender(node) : (node.title as ReactNode)}
            </div>
          </div>
        );
      })}
    </div>
  );
});
