import { CodeOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Input, Tooltip, Tree } from 'antd';
import cn from 'classnames';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementRef,
  type Key,
  type MutableRefObject,
} from 'react';

import { type LayoutInfo } from '../../layout';
import SimpleTip from '../../simple-tip';

import styles from './index.module.less';

import type { DataNode } from 'antd/es/tree';

export type AntTreeHandle = ElementRef<typeof Tree>;

export function DevtoolsTreePane({
  info,
  treeRef,
  isMultiRuntime,
  treeData,
  expandedKeys,
  selectedKey,
  breadcrumbs,
  onExpandKeysChange,
  onSelectKey,
  onHoverKey,
  onClickBreadcrumbKey,
  onPrintSelected,
}: {
  info: LayoutInfo;
  treeRef: MutableRefObject<AntTreeHandle | null>;
  isMultiRuntime: boolean;
  treeData: DataNode[];
  expandedKeys: string[];
  selectedKey: string | null;
  breadcrumbs: Array<{ key: string; label: string }>;
  onExpandKeysChange: (keys: string[]) => void;
  onSelectKey: (key: string) => void;
  onHoverKey: (key: string | null) => void;
  onClickBreadcrumbKey: (key: string) => void;
  onPrintSelected: () => void;
}) {
  const [search, setSearch] = useState<string>('');
  const searchLower = useMemo(() => search.trim().toLowerCase(), [search]);

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
    el.addEventListener('scroll', onScroll);
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', checkScroll);
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

  const treeHeight = (() => {
    if (info.isNarrow) {
      return Math.max(120, info.treeHeight - 92);
    }
    if (info.dock === 'top' || info.dock === 'bottom') {
      return Math.max(120, info.height - 160);
    }
    return info.height + 160;
  })();

  return (
    <>
      {isMultiRuntime && (
        <SimpleTip
          message={
            '检测到当前页面存在多个 runtime。激活 inspect 模式后，' +
            '将鼠标移动到目标 canvas 上可切换对应的 runtime。'
          }
        />
      )}

      <div className={styles.treeToolbar}>
        <div className={styles.treeToolbarSearch}>
          <Input.Search
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索节点..."
            allowClear
          />
        </div>
        <div className={styles.treeToolbarActions}>
          <Tooltip title="打印当前节点" placement="bottom">
            <Button type="text" icon={<CodeOutlined />} onClick={onPrintSelected} />
          </Tooltip>
        </div>
      </div>

      <Tree
        ref={treeRef}
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
            {String(node.title)}
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
        filterTreeNode={(node) =>
          !!searchLower && String(node.title).toLowerCase().includes(searchLower)
        }
      />

      <div className={styles.breadcrumbsContainer}>
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
    </>
  );
}
