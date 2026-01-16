import {
  AimOutlined,
  CloseOutlined,
  LeftOutlined,
  QuestionCircleOutlined,
  RightOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, ConfigProvider, Input, Popover, Tooltip, Tree } from 'antd';
import cn from 'classnames';
import { throttle } from 'lodash-es';
import { useEffect, useMemo, useRef, useState, type Key } from 'react';

import Runtime from '../../../runtime';
import { getPathKeys, toAntTreeData, toTree } from '../../helper/tree';
import { useDevtoolsHotkeys } from '../../hooks/useDevtoolsHotkeys';
import { useMouseInteraction } from '../../hooks/useMouseInteraction';
import LayoutPanel, { type LayoutInfo } from '../layout';
import Overlay from '../overlay';
import { PropsEditor } from '../props-editor';
import SimpleTip from '../simple-tip';

import styles from './index.module.less';

import type { Widget } from '@/core/base';
import type { DataNode } from 'antd/es/tree';

import { findWidget } from '@/core/helper/widget-selector';

export interface DevToolsProps {
  onClose?: () => void;
  /** 快捷键配置：字符串或对象（默认 Ctrl/Cmd+Shift+D 切换面板显示） */
  shortcut?: string | { combo: string; action?: 'toggle' | 'inspect' };
}

/**
 * DevToolsPanel
 * 说明：原 DevTools 组件重命名为面板组件，由单例管理类统一挂载至全局。
 */
export function DevToolsPanel(props: DevToolsProps) {
  const [selected, setSelected] = useState<Widget | null>(null);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const hoverRef = useRef<Widget | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const treeRef = useRef<any>(null);

  // 监听 runtime 更新版本，强制刷新树
  const [version, setVersion] = useState(0);

  // 页面可见性检测
  const [isPageVisible, setIsPageVisible] = useState(true);
  useEffect(() => {
    // 初始化状态
    setIsPageVisible(!document.hidden);
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const breadcrumbScrollRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ left: false, right: false });

  const checkScroll = () => {
    const el = breadcrumbScrollRef.current;
    if (!el) {
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setScrollState({
      left: scrollLeft > 1, // tolerance
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

  // 监听 Runtime 的树更新
  // (Moved to after visible definition)

  const tree = useMemo(() => {
    void version;
    return toTree(runtime?.getRootWidget?.() ?? null);
  }, [runtime, version]);
  const overlay = useMemo(() => (runtime ? new Overlay(runtime) : null), [runtime]);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState<string>('');
  // 是否开启 Inspect
  const [activeInspect, setActiveInspect] = useState<boolean>(false);
  // 面板显隐状态：默认隐藏，热键/按钮控制
  const [visible, setVisible] = useState<boolean>(false);
  const { combo } = useDevtoolsHotkeys({
    combo:
      typeof props.shortcut === 'string'
        ? props.shortcut
        : props.shortcut?.combo || 'CmdOrCtrl+Shift+D',
    action:
      typeof props.shortcut === 'object' && props.shortcut?.action
        ? props.shortcut.action
        : 'toggle',
    onToggle: () => setVisible((v) => !v),
    onInspectToggle: () => setActiveInspect((v) => !v),
  });

  const helpContent = (
    <div className={styles.helpPanel}>
      <div className={styles.helpTitle}>DevTools</div>

      <div className={styles.helpGroup}>
        <div className={styles.helpGroupTitle}>顶部图标</div>
        <div className={styles.helpItem}>
          <div className={styles.helpIcon}>
            <AimOutlined />
          </div>
          <div className={styles.helpText}>
            <div className={styles.helpItemTitle}>拾取</div>
            <div className={styles.helpItemDesc}>悬浮高亮，点击选中</div>
          </div>
        </div>
        <div className={styles.helpItem}>
          <div className={styles.helpIcon}>
            <QuestionCircleOutlined />
          </div>
          <div className={styles.helpText}>
            <div className={styles.helpItemTitle}>说明</div>
            <div className={styles.helpItemDesc}>打开这份速览</div>
          </div>
        </div>
        <div className={styles.helpItem}>
          <div className={styles.helpIcon}>
            <CloseOutlined />
          </div>
          <div className={styles.helpText}>
            <div className={styles.helpItemTitle}>关闭</div>
            <div className={styles.helpItemDesc}>隐藏面板</div>
          </div>
        </div>
      </div>

      <div className={styles.helpDivider} />

      <div className={styles.helpGroup}>
        <div className={styles.helpGroupTitle}>面板操作</div>
        <div className={styles.helpItem}>
          <div className={styles.helpIcon}>
            <SearchOutlined />
          </div>
          <div className={styles.helpText}>
            <div className={styles.helpItemTitle}>搜索</div>
            <div className={styles.helpItemDesc}>过滤组件树</div>
          </div>
        </div>
        <div className={styles.helpItem}>
          <div className={styles.helpIconGroup}>
            <LeftOutlined />
            <RightOutlined />
          </div>
          <div className={styles.helpText}>
            <div className={styles.helpItemTitle}>面包屑</div>
            <div className={styles.helpItemDesc}>快速跳转到路径节点</div>
          </div>
        </div>
      </div>

      <div className={styles.helpDivider} />

      <div className={styles.helpGroup}>
        <div className={styles.helpGroupTitle}>快捷键</div>
        <div className={styles.helpShortcut}>
          <span className={styles.helpKbd}>{combo}</span>
          <span className={styles.helpShortcutDesc}>显示/隐藏面板</span>
        </div>
      </div>
    </div>
  );

  // 监听 Runtime 的树更新
  useEffect(() => {
    if (!runtime) {
      return;
    }

    // 性能优化：当面板隐藏或页面不可见时，停止更新
    // 面板可见性由 visible 状态控制（热键/按钮切换）
    // 页面可见性由 document.hidden 控制
    const shouldUpdate = visible && isPageVisible;

    if (!shouldUpdate) {
      return;
    }

    // 从隐藏切换为可见时，立即执行一次更新确保数据最新
    setVersion((v) => v + 1);

    // 使用 lodash throttle 进行节流，300ms 间隔，保留 trailing 确保最后一次更新生效
    const update = throttle(
      () => {
        setVersion((v) => v + 1);
      },
      300,
      { trailing: true },
    );

    const dispose = runtime.addTickListener(update);
    return () => {
      dispose();
      update.cancel();
    };
  }, [runtime, visible, isPageVisible]);

  const breadcrumbs = useMemo(() => {
    if (!selected) {
      return [];
    }
    const list: Widget[] = [];
    let current: Widget | null = selected;
    while (current) {
      list.unshift(current);
      current = current.parent;
    }
    return list;
  }, [selected]);

  useEffect(() => {
    // 面包屑变化时，自动滚动到末尾（确保可见）
    requestAnimationFrame(() => {
      checkScroll();
      const el = breadcrumbScrollRef.current;
      if (el) {
        el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
      }
    });
  }, [breadcrumbs]);

  const { isMultiRuntime } = useMouseInteraction({
    runtime,
    overlay,
    active: activeInspect,
    getHoverRef: () => hoverRef.current,
    setHoverRef: (w) => {
      hoverRef.current = w;
    },
    setRuntime: (rt) => setRuntime(rt),
    onPick: (current) => {
      setSelected(current);
      // 选中时，尝试刷新一次树结构，确保能找到最新节点
      setVersion((v) => v + 1);

      const path = getPathKeys(runtime?.getRootWidget?.() ?? null, current.key);
      setExpandedKeys(new Set(path));
      setActiveInspect(false);
      requestAnimationFrame(() => {
        // 自动滚动逻辑：
        // 1. 尝试查找 DOM 节点，如果存在则使用平滑滚动
        // 2. 如果是虚拟列表未渲染的节点，使用 scrollTo 强制跳转（可能无动画）
        const el = document.querySelector(`[data-key="${current.key}"]`);
        if (el) {
          el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        } else if (treeRef.current?.scrollTo) {
          treeRef.current.scrollTo({ key: current.key, align: 'auto' });
        }
      });
    },
  });

  // 监听 runtime 的 build/paint 周期 (如果有相关 API)
  useEffect(() => {
    if (!runtime) {
      return;
    }
    // 简单的轮询检查根节点 key 变化或子节点数量变化可能不够
    // 理想情况是 runtime 提供 addListener('frame', ...)
    // 这里暂时不做，留给优化步骤
  }, [runtime]);

  return (
    <ConfigProvider
      getPopupContainer={(triggerNode) => {
        const container =
          (triggerNode?.closest?.('#inkwell-devtools-root') as HTMLElement | null) ?? null;
        return container ?? document.body;
      }}
    >
      <LayoutPanel
        visible={visible}
        headerLeft={
          <Button
            type="text"
            aria-pressed={activeInspect}
            style={{ color: activeInspect ? 'var(--ink-demo-primary)' : undefined }}
            icon={<AimOutlined />}
            onClick={() => setActiveInspect((v) => !v)}
          />
        }
        headerRightExtra={(requestClose) => (
          <>
            <Popover
              trigger="click"
              placement="bottomRight"
              overlayClassName={styles.helpOverlay}
              content={helpContent}
            >
              <Tooltip title="说明" placement="bottom">
                <Button type="text" icon={<QuestionCircleOutlined />} />
              </Tooltip>
            </Popover>
            <Tooltip title="关闭" placement="bottom">
              <Button type="text" icon={<CloseOutlined />} onClick={() => requestClose()} />
            </Tooltip>
          </>
        )}
        onVisibleChange={setVisible}
        renderTree={(info: LayoutInfo) => (
          <>
            {isMultiRuntime && (
              <SimpleTip
                message={
                  '检测到当前页面存在多个 runtime。激活 inspect 模式后，' +
                  '将鼠标移动到目标 canvas 上可切换对应的 runtime。'
                }
              />
            )}
            {/* 初始化逻辑会自动选择第一个 runtime，此处无需额外警告 */}
            <div style={{ marginBottom: 8 }}>
              <Input.Search
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索节点..."
                allowClear
              />
            </div>
            <Tree
              ref={treeRef}
              className={styles.compactTree}
              showLine
              height={
                info.isNarrow
                  ? Math.max(120, info.treeHeight - 92)
                  : info.dock === 'top' || info.dock === 'bottom'
                    ? Math.max(120, info.height - 160)
                    : info.height + 160
              }
              treeData={toAntTreeData(tree) as DataNode[]}
              titleRender={(node) => (
                <span
                  data-key={String(node.key)}
                  onMouseEnter={() => {
                    const w = findWidget(
                      runtime?.getRootWidget?.() ?? null,
                      `#${String(node.key)}`,
                    ) as Widget | null;
                    hoverRef.current = w;
                    overlay?.setActive(true);
                    overlay?.highlight(w);
                  }}
                  onMouseLeave={() => {
                    overlay?.setActive(false);
                    overlay?.highlight(null);
                  }}
                >
                  {String(node.title)}
                </span>
              )}
              expandedKeys={Array.from(expandedKeys)}
              onExpand={(keys: Key[]) => setExpandedKeys(new Set(keys as string[]))}
              selectedKeys={selected ? [selected.key] : []}
              onSelect={(keys: Key[]) => {
                if (keys.length === 0) {
                  return;
                }
                const k = String(keys[0]);
                const w = findWidget(runtime?.getRootWidget?.() ?? null, `#${k}`) as Widget | null;
                setSelected(w);
                if (w) {
                  const path = getPathKeys(runtime?.getRootWidget?.() ?? null, k);
                  setExpandedKeys(new Set(path));
                }
              }}
              filterTreeNode={(node) =>
                !!search && String(node.title).toLowerCase().includes(search.toLowerCase())
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
                        className={cn(styles.crumbItem, { [styles.active]: isActive })}
                        onMouseEnter={() => {
                          hoverRef.current = w;
                          overlay?.setActive(true);
                          overlay?.highlight(w);
                        }}
                        onMouseLeave={() => {
                          overlay?.setActive(false);
                          overlay?.highlight(null);
                        }}
                        onClick={() => {
                          setSelected(w);
                          const path = getPathKeys(runtime?.getRootWidget?.() ?? null, w.key);
                          setExpandedKeys(new Set(path));
                          requestAnimationFrame(() => {
                            const el = document.querySelector(`[data-key="${w.key}"]`);
                            if (el) {
                              el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
                            } else if (treeRef.current?.scrollTo) {
                              treeRef.current.scrollTo({ key: w.key, align: 'auto' });
                            }
                          });
                        }}
                      >
                        {w.type}
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
        )}
        renderProps={() => <PropsEditor widget={selected} onChange={() => runtime?.rebuild()} />}
      />
    </ConfigProvider>
  );
}
