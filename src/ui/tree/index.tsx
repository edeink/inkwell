import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
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
  const [scrollTop, setScrollTop] = useState(0);
  const rowHeight = 24;
  const overscan = 6;
  const viewHeight = typeof height === 'number' ? height : 0;
  const shouldVirtualize = viewHeight > 0;
  const indexByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < rows.length; i++) {
      map.set(String(rows[i].node.key), i);
    }
    return map;
  }, [rows]);
  const totalHeight = rows.length * rowHeight;
  const startIndex = shouldVirtualize
    ? Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
    : 0;
  const endIndex = shouldVirtualize
    ? Math.min(rows.length, Math.ceil((scrollTop + viewHeight) / rowHeight) + overscan)
    : rows.length;
  const visibleRows = shouldVirtualize ? rows.slice(startIndex, endIndex) : rows;

  useEffect(() => {
    if (!ref) {
      return;
    }
    const api: TreeHandle = {
      scrollTo: ({ key }) => {
        const idx = indexByKey.get(String(key));
        const container = containerRef.current;
        if (container && typeof idx === 'number') {
          const top = idx * rowHeight;
          container.scrollTop = top;
          setScrollTop(top);
          return;
        }
        const el = container?.querySelector(`[data-key="${String(key)}"]`) as HTMLElement | null;
        el?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      },
    };
    if (typeof ref === 'function') {
      ref(api);
    } else {
      ref.current = api;
    }
  }, [ref, indexByKey]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        overflow: 'auto',
        height,
        fontSize: 12,
        color: 'var(--ink-demo-text-primary)',
        ...style,
      }}
      onScroll={(e) => {
        if (!shouldVirtualize) {
          return;
        }
        const nextTop = e.currentTarget.scrollTop;
        if (nextTop !== scrollTop) {
          setScrollTop(nextTop);
        }
      }}
    >
      <div
        style={{
          height: shouldVirtualize ? totalHeight : undefined,
          boxSizing: 'border-box',
          paddingTop: shouldVirtualize ? startIndex * rowHeight : 0,
          minWidth: '100%',
          width: 'max-content',
        }}
      >
        {visibleRows.map(({ node, depth, hasChildren }, index) => {
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
                minWidth: '100%',
                width: 'max-content',
                boxSizing: 'border-box',
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
    </div>
  );
});
