/**
 * Devtools 树面板组件
 *
 * 渲染组件树、搜索与面包屑，并提供交互回调。
 * 注意事项：内部直接连接 Store 获取数据与回调。
 * 潜在副作用：可能触发滚动与输入焦点管理。
 */
import cn from 'classnames';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { DEVTOOLS_DOM_EVENTS, DEVTOOLS_PLACEMENT } from '../../../constants';
import { getPathNodeKeys } from '../../../helper/tree';
import { useLayoutStore, usePanelStore } from '../../../store';
import SimpleTip from '../../simple-tip';

import styles from './index.module.less';

import { Button, Input, Tooltip, Tree } from '@/ui';
import { ConsoleOutlined, LeftOutlined, RightOutlined } from '@/ui/icons';

/**
 * DevtoolsTreePane
 *
 * @returns React 元素
 * @remarks
 * 注意事项：树数据量较大时需关注性能。
 * 潜在副作用：可能触发滚动与输入状态变化。
 */
export const DevtoolsTreePane = function DevtoolsTreePane() {
  const {
    isMultiRuntime,
    treeBuild,
    expandedKeys,
    selectedNodeKey,
    setExpandedKeys,
    handleSelectKey,
    handleHoverKey,
    handleClickBreadcrumbKey,
    handlePrintSelected,
  } = usePanelStore(
    useShallow((state) => ({
      isMultiRuntime: state.isMultiRuntime,
      treeBuild: state.treeBuild,
      expandedKeys: state.expandedKeys,
      selectedNodeKey: state.selectedNodeKey,
      setExpandedKeys: state.setExpandedKeys,
      handleSelectKey: state.handleSelectKey,
      handleHoverKey: state.handleHoverKey,
      handleClickBreadcrumbKey: state.handleClickBreadcrumbKey,
      handlePrintSelected: state.handlePrintSelected,
    })),
  );

  const {
    dock,
    // treeWidth,
    // treeHeight: currentTreeHeight,
    isNarrow,
  } = useLayoutStore(
    useShallow((state) => ({
      dock: state.dock,
      // treeWidth: state.treeWidth,
      // treeHeight: state.treeHeight,
      isNarrow: state.isNarrow,
    })),
  );

  const treeData = treeBuild.treeData;
  const breadcrumbs = useMemo(() => {
    if (!selectedNodeKey) {
      return [];
    }
    return getPathNodeKeys(treeBuild.parentByNodeKey, selectedNodeKey).map((key) => {
      const widget = treeBuild.widgetByNodeKey.get(key);
      const label = widget ? widget.constructor.name : 'Unknown';
      return { key, label };
    });
  }, [selectedNodeKey, treeBuild]);

  const expandedKeysArray = useMemo(() => Array.from(expandedKeys), [expandedKeys]);

  const showBreadcrumbs = !isNarrow && breadcrumbs.length > 0;

  const [search, setSearch] = useState('');
  const [treeWrapperHeight, setTreeWrapperHeight] = useState(0);
  const [scrollState, setScrollState] = useState({ left: false, right: false });

  const searchLower = useMemo(() => search.trim().toLowerCase(), [search]);

  const containerRef = useRef<HTMLDivElement>(null);
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const breadcrumbsRef = useRef<HTMLDivElement>(null);

  const breadcrumbScrollRef = useRef<HTMLDivElement>(null);

  // 计算面包屑滚动边界，用于显示左右滚动按钮
  const checkScroll = useCallback(() => {
    const el = breadcrumbScrollRef.current;
    if (!el) {
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setScrollState({
      left: scrollLeft > 1,
      right: Math.ceil(scrollLeft + clientWidth) < scrollWidth - 1,
    });
  }, []);

  // 监听滚动与窗口尺寸变化，同步滚动边界状态
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

  // 面包屑更新后在下一帧对齐末尾，避免读取到旧的布局尺寸
  useEffect(() => {
    requestAnimationFrame(() => {
      checkScroll();
      const el = breadcrumbScrollRef.current;
      if (el) {
        el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
      }
    });
  }, [breadcrumbs, checkScroll]);

  // 容器高度变化影响树可用高度，优先使用 ResizeObserver
  useEffect(() => {
    const el = treeContainerRef.current;
    if (!el) {
      return;
    }
    const update = () => {
      setTreeWrapperHeight((prev) => {
        if (Math.abs(el.clientHeight - prev) <= 1) {
          return prev;
        }
        return el.clientHeight;
      });
    };
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener(DEVTOOLS_DOM_EVENTS.RESIZE, update);
      return () => window.removeEventListener(DEVTOOLS_DOM_EVENTS.RESIZE, update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const calculatedTreeHeight = useMemo(() => {
    // 优先使用 ResizeObserver 测量的 treeWrapperHeight
    // 如果没有，则提供一个默认值
    return treeWrapperHeight > 0 ? treeWrapperHeight : 300;
  }, [treeWrapperHeight]);

  const emitHoverKey = useCallback(
    (key: string | null, source: string) => {
      handleHoverKey(key);
    },
    [handleHoverKey],
  );

  return (
    <div ref={containerRef} className={styles.treePaneRoot}>
      {isMultiRuntime && (
        <div ref={tipRef}>
          <SimpleTip message="检测到当前页面存在多个 runtime。激活 inspect 模式后，将鼠标移动到目标 canvas 上可切换对应的 runtime。" />
        </div>
      )}

      <div className={styles.treeToolbar} ref={toolbarRef}>
        <div className={styles.treeToolbarSearch}>
          <Input.Search
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索组件"
            allowClear
          />
        </div>
        <Tooltip title="打印选中组件到控制台" placement={DEVTOOLS_PLACEMENT.BOTTOM}>
          <Button
            type="text"
            icon={<ConsoleOutlined />}
            disabled={!selectedNodeKey}
            onClick={handlePrintSelected}
          />
        </Tooltip>
      </div>

      <div className={styles.compactTree} ref={treeContainerRef}>
        <Tree
          treeData={treeData}
          height={calculatedTreeHeight}
          expandedKeys={expandedKeysArray}
          selectedKeys={selectedNodeKey ? [selectedNodeKey] : []}
          onExpand={(keys) => setExpandedKeys(new Set(keys as string[]))}
          onSelect={(keys) => {
            const key = keys[0];
            if (key) {
              handleSelectKey(key as string);
            }
          }}
          titleRender={(node) => {
            const isHover = false;
            const match = searchLower && (node.title as string).toLowerCase().includes(searchLower);
            return (
              <div
                className={cn(styles.treeNodeTitle, {
                  [styles.treeNodeTitleHover]: isHover,
                  [styles.treeNodeTitleMatch]: match,
                })}
                onMouseEnter={() => emitHoverKey(node.key as string, 'enter')}
                onMouseLeave={() => emitHoverKey(null, 'leave')}
                style={{ whiteSpace: 'nowrap' }}
              >
                {node.title as React.ReactNode}
              </div>
            );
          }}
        />
      </div>

      {showBreadcrumbs && (
        <div className={styles.breadcrumbsContainer} ref={breadcrumbsRef}>
          <div
            className={cn(styles.navBtn, {
              [styles.disabled]: !scrollState.left,
            })}
            onClick={() => {
              if (breadcrumbScrollRef.current) {
                breadcrumbScrollRef.current.scrollBy({ left: -100, behavior: 'smooth' });
              }
            }}
          >
            <LeftOutlined />
          </div>
          <div className={styles.scrollArea} ref={breadcrumbScrollRef}>
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center' }}>
                  <div
                    className={cn(styles.crumbItem, {
                      [styles.crumbItemActive]: isLast,
                    })}
                    onClick={() => handleClickBreadcrumbKey(item.key)}
                    onMouseEnter={() => emitHoverKey(item.key, 'enter')}
                    onMouseLeave={() => emitHoverKey(null, 'leave')}
                  >
                    {item.label}
                  </div>
                  {!isLast && <div className={styles.separator}>/</div>}
                </div>
              );
            })}
          </div>
          <div
            className={cn(styles.navBtn, {
              [styles.disabled]: !scrollState.right,
            })}
            onClick={() => {
              if (breadcrumbScrollRef.current) {
                breadcrumbScrollRef.current.scrollBy({ left: 100, behavior: 'smooth' });
              }
            }}
          >
            <RightOutlined />
          </div>
        </div>
      )}
    </div>
  );
};
