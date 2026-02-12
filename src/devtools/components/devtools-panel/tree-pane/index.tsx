import cn from 'classnames';
import { useEffect, useMemo, useRef, useState, type Key } from 'react';

import {
  DEVTOOLS_DOCK,
  DEVTOOLS_DOM_EVENTS,
  DEVTOOLS_PLACEMENT,
  DEVTOOLS_TREE_PANE_TEXT,
} from '../../../constants';
import { type LayoutInfo } from '../../layout';
import SimpleTip from '../../simple-tip';

import styles from './index.module.less';

import { Button, Input, Tooltip, Tree, type DataNode } from '@/ui';
import { ConsoleOutlined, LeftOutlined, RightOutlined } from '@/ui/icons';

export function DevtoolsTreePane({
  info,
  isMultiRuntime,
  treeData,
  expandedKeys,
  selectedKey,
  breadcrumbs = [],
  onExpandKeysChange,
  onSelectKey,
  onHoverKey,
  onClickBreadcrumbKey,
  onPrintSelected,
}: {
  info: LayoutInfo;
  isMultiRuntime: boolean;
  treeData: DataNode[];
  expandedKeys: string[];
  selectedKey: string | null;
  breadcrumbs?: Array<{ key: string; label: string }>;
  onExpandKeysChange: (keys: string[]) => void;
  onSelectKey: (key: string) => void;
  onHoverKey: (key: string | null) => void;
  onClickBreadcrumbKey: (key: string) => void;
  onPrintSelected: () => void;
}) {
  const [search, setSearch] = useState<string>('');
  const searchLower = useMemo(() => search.trim().toLowerCase(), [search]);

  const containerRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const breadcrumbsRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState<number>(0);

  const breadcrumbScrollRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ left: false, right: false });

  const checkScroll = () => {
    const el = breadcrumbScrollRef.current;
    if (!el) {
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setScrollState({
      left: scrollLeft > 1,
      right: Math.ceil(scrollLeft + clientWidth) < scrollWidth - 1,
    });
  };

  useEffect(() => {
    const el = breadcrumbScrollRef.current;
    if (!el) {
      return;
    }
    const onScroll = () => checkScroll();
    el.addEventListener(DEVTOOLS_DOM_EVENTS.SCROLL, onScroll);
    window.addEventListener(DEVTOOLS_DOM_EVENTS.RESIZE, checkScroll);
    return () => {
      el.removeEventListener(DEVTOOLS_DOM_EVENTS.SCROLL, onScroll);
      window.removeEventListener(DEVTOOLS_DOM_EVENTS.RESIZE, checkScroll);
    };
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      checkScroll();
      const el = breadcrumbScrollRef.current;
      if (el) {
        el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
      }
    });
  }, [breadcrumbs]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const update = () => setContainerHeight(el.clientHeight);
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener(DEVTOOLS_DOM_EVENTS.RESIZE, update);
      return () => window.removeEventListener(DEVTOOLS_DOM_EVENTS.RESIZE, update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const treeHeight = useMemo(() => {
    const containerH =
      containerHeight ||
      (info.isNarrow
        ? info.treeHeight
        : info.dock === DEVTOOLS_DOCK.TOP || info.dock === DEVTOOLS_DOCK.BOTTOM
          ? info.height
          : window.innerHeight);
    const tipH = tipRef.current?.getBoundingClientRect().height ?? 0;
    const toolbarH = toolbarRef.current?.getBoundingClientRect().height ?? 0;
    const breadcrumbsH = breadcrumbsRef.current?.getBoundingClientRect().height ?? 0;
    const gap = 8;
    return Math.max(120, Math.floor(containerH - tipH - toolbarH - breadcrumbsH - gap));
  }, [containerHeight, info.dock, info.height, info.isNarrow, info.treeHeight]);

  return (
    <div ref={containerRef} className={styles.treePaneRoot}>
      {isMultiRuntime && (
        <div ref={tipRef}>
          <SimpleTip message={DEVTOOLS_TREE_PANE_TEXT.MULTI_RUNTIME_TIP} />
        </div>
      )}

      <div className={styles.treeToolbar} ref={toolbarRef}>
        <div className={styles.treeToolbarSearch}>
          <Input.Search
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={DEVTOOLS_TREE_PANE_TEXT.SEARCH_PLACEHOLDER}
            allowClear
          />
        </div>
        <div className={styles.treeToolbarActions}>
          <Tooltip
            title={DEVTOOLS_TREE_PANE_TEXT.PRINT_SELECTED}
            placement={DEVTOOLS_PLACEMENT.BOTTOM}
          >
            <Button
              type="text"
              icon={<ConsoleOutlined width={24} height={24} />}
              onClick={onPrintSelected}
            />
          </Tooltip>
        </div>
      </div>

      <Tree
        className={styles.compactTree}
        showLine
        height={treeHeight}
        treeData={treeData}
        titleRender={(node) => (
          <span
            data-key={String(node.key)}
            onMouseEnter={() => onHoverKey(String(node.key))}
            onMouseLeave={() => onHoverKey(null)}
          >
            {node.title as unknown as string}
          </span>
        )}
        expandedKeys={expandedKeys}
        onExpand={(keys: Key[]) => onExpandKeysChange(keys as string[])}
        selectedKeys={selectedKey ? [selectedKey] : []}
        onSelect={(keys: Key[]) => {
          if (keys.length === 0) {
            return;
          }
          onSelectKey(String(keys[0]));
        }}
        filterTreeNode={
          searchLower ? (node) => String(node.title).toLowerCase().includes(searchLower) : undefined
        }
      />

      <div className={styles.breadcrumbsContainer} ref={breadcrumbsRef}>
        <div
          className={cn(styles.navBtn, { [styles.disabled]: !scrollState.left })}
          onClick={() => {
            breadcrumbScrollRef.current?.scrollBy({ left: -100, behavior: 'smooth' });
          }}
        >
          <LeftOutlined style={{ fontSize: 10 }} />
        </div>
        <div className={styles.scrollArea} ref={breadcrumbScrollRef}>
          {breadcrumbs.map((w, index) => {
            const isActive = index === breadcrumbs.length - 1;
            return (
              <span key={w.key} style={{ display: 'flex', alignItems: 'center' }}>
                {index > 0 && (
                  <span className={styles.separator}>
                    <RightOutlined style={{ fontSize: 10 }} />
                  </span>
                )}
                <span
                  className={cn(styles.crumbItem, { [styles.crumbItemActive]: isActive })}
                  onMouseEnter={() => onHoverKey(w.key)}
                  onMouseLeave={() => onHoverKey(null)}
                  onClick={() => onClickBreadcrumbKey(w.key)}
                >
                  {w.label}
                </span>
              </span>
            );
          })}
        </div>
        <div
          className={cn(styles.navBtn, { [styles.disabled]: !scrollState.right })}
          onClick={() => {
            breadcrumbScrollRef.current?.scrollBy({ left: 100, behavior: 'smooth' });
          }}
        >
          <RightOutlined style={{ fontSize: 10 }} />
        </div>
      </div>
    </div>
  );
}
