import { BulbFilled, BulbOutlined } from '@ant-design/icons';
import { theme as antTheme, Button, ConfigProvider, Tabs } from 'antd';
import cn from 'classnames';
import { useCallback, useMemo, useState } from 'react';

import { InkwellCanvas } from './common/inkwell-canvas';
import styles from './index.module.less';
import { setupInteractiveCounter } from './interactive-counter';
import { setupMindmap } from './mindmap';
import ErrorBoundary from './mindmap/components/error-boundary';
import Minimap from './mindmap/components/minimap';
import Toolbar from './mindmap/components/toolbar';
import ZoomBar from './mindmap/components/zoom-bar';
import { MindmapContext } from './mindmap/hooks/context';
import { setupWidgetGallery } from './widget-gallery';

import { DevTools } from '@/devtools';
import Runtime from '@/runtime';

type ThemeType = 'light' | 'dark';

interface DemoConfig {
  key: string;
  label: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setup: (runtime: Runtime, width: number, height: number) => void | any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  OverlayUI?: React.FC<{ runtime: Runtime; context: any }>;
}

export default function UnifiedDemo() {
  const [activeKey, setActiveKey] = useState('widget-gallery');
  const [theme, setTheme] = useState<ThemeType>('light');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [demoContext, setDemoContext] = useState<any>(null);
  const [activeRuntime, setActiveRuntime] = useState<Runtime | null>(null);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const demos: DemoConfig[] = useMemo(
    () => [
      {
        key: 'interactive-counter',
        label: '交互计数器',
        description: '基础计数器功能演示。展示了状态管理、事件响应和基本的文本/按钮渲染能力。',
        setup: setupInteractiveCounter,
      },
      {
        key: 'widget-gallery',
        label: '组件画廊',
        description: '核心组件功能展示。包含布局组件(Row, Column, Stack)和基础组件的综合运用效果。',
        setup: setupWidgetGallery,
      },
      {
        key: 'mindmap',
        label: '思维导图',
        description: '高性能思维导图应用演示。支持节点拖拽、缩放、编辑和无限画布功能。',
        setup: setupMindmap,
        OverlayUI: ({ runtime, context }) => (
          <MindmapContext.Provider value={context}>
            <Minimap />
            <ZoomBar />
            <Toolbar runtime={runtime} />
          </MindmapContext.Provider>
        ),
      },
    ],
    [],
  );

  const handleRuntimeReady = useCallback(
    async (runtime: Runtime, key: string) => {
      setActiveRuntime(runtime);
      // 清理之前的上下文
      setDemoContext(null);

      const demo = demos.find((d) => d.key === key);
      if (demo) {
        const result = demo.setup(runtime, 0, 0);
        if (result) {
          setDemoContext(result);
        }
      }
    },
    [demos],
  );

  const handleResize = useCallback(
    (width: number, height: number, runtime: Runtime, key: string) => {
      const demo = demos.find((d) => d.key === key);
      if (demo) {
        const result = demo.setup(runtime, width, height);
        if (result) {
          setDemoContext(result);
        }
      }
    },
    [demos],
  );

  const items = demos.map((demo) => {
    const OverlayUI = demo.OverlayUI;
    return {
      key: demo.key,
      label: demo.label,
      children: (
        <div className={styles.content}>
          <div className={styles.description}>
            <h3>{demo.label}</h3>
            <p>{demo.description}</p>
          </div>
          <div className={styles.canvasContainer}>
            <ErrorBoundary>
              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                <InkwellCanvas
                  background={theme === 'dark' ? '#141414' : '#ffffff'}
                  onRuntimeReady={(rt) => handleRuntimeReady(rt, demo.key)}
                  onResize={(w, h, rt) => handleResize(w, h, rt, demo.key)}
                  // 卸载时的强制销毁由 InkwellCanvas 处理
                />
                {OverlayUI && activeRuntime && demoContext && (
                  <OverlayUI runtime={activeRuntime} context={demoContext} />
                )}
                <DevTools />
              </div>
            </ErrorBoundary>
          </div>
        </div>
      ),
      forceRender: false, // 重要：设置为 false 以确保切换标签页时销毁！
    };
  });

  const { defaultAlgorithm, darkAlgorithm } = antTheme;

  return (
    <ConfigProvider
      theme={{
        algorithm: theme === 'dark' ? darkAlgorithm : defaultAlgorithm,
        token: {
          borderRadius: 4,
        },
      }}
    >
      <div className={cn(styles.container, styles[theme])}>
        <div className={styles.header}>
          <div style={{ fontWeight: 'bold', fontSize: 18 }}>Inkwell Demo</div>
          <Button
            type="text"
            icon={theme === 'light' ? <BulbOutlined /> : <BulbFilled />}
            onClick={toggleTheme}
          >
            {theme === 'light' ? 'Day' : 'Night'}
          </Button>
        </div>
        <Tabs
          activeKey={activeKey}
          onChange={(key) => {
            setActiveKey(key);
            // 切换标签页时，旧的标签页内容会卸载 (forceRender=false)
            // InkwellCanvas 清理会触发 runtime.destroy()
            // 新标签页挂载，创建新的运行时。
          }}
          items={items}
          className={styles.tabs}
          style={{ height: '100%' }}
          destroyInactiveTabPane={true} // 确保严格隔离
        />
      </div>
    </ConfigProvider>
  );
}
