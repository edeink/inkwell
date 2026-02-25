/**
 * Devtools 树面板组件
 *
 * 渲染组件树、搜索与面包屑，并提供交互回调。
 * 注意事项：依赖 LayoutInfo 控制布局尺寸。
 * 潜在副作用：可能触发滚动与输入焦点管理。
 */
import cn from 'classnames';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useRef, type Key } from 'react';

import {
  DEVTOOLS_DEBUG_LEVEL,
  DEVTOOLS_DOCK,
  DEVTOOLS_DOM_EVENTS,
  DEVTOOLS_PLACEMENT,
  DEVTOOLS_TREE_PANE_TEXT,
  devtoolsLog,
} from '../../../constants';
import { type LayoutInfo } from '../../layout';
import SimpleTip from '../../simple-tip';

import styles from './index.module.less';

import { Button, Input, Tooltip, Tree, type DataNode } from '@/ui';
import { ConsoleOutlined, LeftOutlined, RightOutlined } from '@/ui/icons';

const treePaneUiIds = new WeakMap<object, number>();
let treePaneUiSeq = 0;

function getTreePaneUiId(target: object): number {
  const existing = treePaneUiIds.get(target);
  if (existing) {
    return existing;
  }
  const next = treePaneUiSeq + 1;
  treePaneUiSeq = next;
  treePaneUiIds.set(target, next);
  return next;
}

function getStack(label: string): string {
  return new Error(label).stack ?? '';
}

/**
 * 树面板属性
 *
 * 注意事项：回调需保持稳定引用以避免无效渲染。
 * 潜在副作用：无。
 */
export type DevtoolsTreePaneProps = {
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
};

/**
 * DevtoolsTreePane
 *
 * @param props 树面板属性
 * @returns React 元素
 * @remarks
 * 注意事项：树数据量较大时需关注性能。
 * 潜在副作用：可能触发滚动与输入状态变化。
 */
export const DevtoolsTreePane = observer(function DevtoolsTreePane({
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
}: DevtoolsTreePaneProps) {
  const ui = useLocalObservable(() => ({
    search: '',
    containerHeight: 0,
    scrollLeft: false,
    scrollRight: false,
    setSearch(value: string) {
      this.search = value;
    },
    setContainerHeight(value: number) {
      this.containerHeight = value;
    },
    setScrollState(left: boolean, right: boolean) {
      this.scrollLeft = left;
      this.scrollRight = right;
      devtoolsLog(DEVTOOLS_DEBUG_LEVEL.DEBUG, '树面包屑滚动状态更新', {
        标识: getTreePaneUiId(this),
        左: left,
        右: right,
        调用栈: getStack('setScrollState'),
      });
    },
    get searchLower() {
      return this.search.trim().toLowerCase();
    },
  }));

  const uiId = getTreePaneUiId(ui);
  const containerRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const breadcrumbsRef = useRef<HTMLDivElement>(null);

  const breadcrumbScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    devtoolsLog(DEVTOOLS_DEBUG_LEVEL.INFO, '树面板 UI 实例', {
      标识: uiId,
      构造函数: Object.getPrototypeOf(ui)?.constructor?.name ?? 'Object',
    });
  }, [ui, uiId]);

  const checkScroll = useCallback(() => {
    const el = breadcrumbScrollRef.current;
    if (!el) {
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    devtoolsLog(DEVTOOLS_DEBUG_LEVEL.DEBUG, '树面包屑滚动检查', {
      标识: uiId,
      scrollLeft,
      scrollWidth,
      clientWidth,
      调用栈: getStack('checkScroll'),
    });
    ui.setScrollState(scrollLeft > 1, Math.ceil(scrollLeft + clientWidth) < scrollWidth - 1);
  }, [ui, uiId]);

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
  }, [checkScroll]);

  useEffect(() => {
    requestAnimationFrame(() => {
      devtoolsLog(DEVTOOLS_DEBUG_LEVEL.DEBUG, '树面包屑更新触发', {
        标识: uiId,
        数量: breadcrumbs.length,
        调用栈: getStack('breadcrumbs'),
      });
      checkScroll();
      const el = breadcrumbScrollRef.current;
      if (el) {
        el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
      }
    });
  }, [breadcrumbs, checkScroll, uiId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const update = () => ui.setContainerHeight(el.clientHeight);
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener(DEVTOOLS_DOM_EVENTS.RESIZE, update);
      return () => window.removeEventListener(DEVTOOLS_DOM_EVENTS.RESIZE, update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ui]);

  const treeHeight = useMemo(() => {
    const containerH =
      ui.containerHeight ||
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
  }, [ui.containerHeight, info.dock, info.height, info.isNarrow, info.treeHeight]);

  const emitHoverKey = useCallback(
    (key: string | null, source: string) => {
      devtoolsLog(DEVTOOLS_DEBUG_LEVEL.DEBUG, '树面板 hover 触发', {
        标识: uiId,
        来源: source,
        key,
        调用栈: getStack('hover'),
      });
      onHoverKey(key);
    },
    [onHoverKey, uiId],
  );

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
            value={ui.search}
            onChange={(e) => ui.setSearch(e.target.value)}
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
            onMouseEnter={() => emitHoverKey(String(node.key), 'tree')}
            onMouseLeave={() => emitHoverKey(null, 'tree')}
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
          ui.searchLower
            ? (node) => String(node.title).toLowerCase().includes(ui.searchLower)
            : undefined
        }
      />

      <div className={styles.breadcrumbsContainer} ref={breadcrumbsRef}>
        <div
          className={cn(styles.navBtn, { [styles.disabled]: !ui.scrollLeft })}
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
                  onMouseEnter={() => emitHoverKey(w.key, 'breadcrumbs')}
                  onMouseLeave={() => emitHoverKey(null, 'breadcrumbs')}
                  onClick={() => onClickBreadcrumbKey(w.key)}
                >
                  {w.label}
                </span>
              </span>
            );
          })}
        </div>
        <div
          className={cn(styles.navBtn, { [styles.disabled]: !ui.scrollRight })}
          onClick={() => {
            breadcrumbScrollRef.current?.scrollBy({ left: 100, behavior: 'smooth' });
          }}
        >
          <RightOutlined style={{ fontSize: 10 }} />
        </div>
      </div>
    </div>
  );
});
