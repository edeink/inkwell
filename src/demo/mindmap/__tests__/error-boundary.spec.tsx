import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ErrorBoundary from '../components/error-boundary';

// Mock CSS modules
vi.mock('../components/error-boundary/index.module.less', () => ({
  default: {
    errorBoundary: 'errorBoundary',
    title: 'title',
    message: 'message',
    actions: 'actions',
    button: 'button',
  },
}));

// 模拟一个会抛出错误的组件
const ProblematicComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test Error');
  }
  return <div>Safe Component</div>;
};

describe('Mindmap ErrorBoundary', () => {
  let container: HTMLDivElement;
  let root: any;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container) {
      container.remove();
    }
    vi.restoreAllMocks();
  });

  it('当子组件正常渲染时，显示子组件内容', async () => {
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <ProblematicComponent shouldThrow={false} />
        </ErrorBoundary>,
      );
    });

    expect(container.textContent).toContain('Safe Component');
  });

  it('当子组件抛出错误时，显示错误边界 UI', async () => {
    // 抑制 console.error，避免测试输出被污染
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      root.render(
        <ErrorBoundary>
          <ProblematicComponent shouldThrow={true} />
        </ErrorBoundary>,
      );
    });

    expect(container.textContent).toContain('渲染错误');
    expect(container.textContent).toContain('Test Error');
    expect(container.textContent).toContain('重试');

    consoleSpy.mockRestore();
  });

  it('点击重试按钮应尝试重新渲染', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onRetry = vi.fn();

    // 包装组件以控制 throw 状态
    const Wrapper = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);

      const handleRetry = () => {
        onRetry();
        setShouldThrow(false);
      };

      return (
        <ErrorBoundary onRetry={handleRetry}>
          <ProblematicComponent shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    };

    await act(async () => {
      root.render(<Wrapper />);
    });

    // 确认显示错误
    expect(container.textContent).toContain('渲染错误');

    // 点击重试按钮
    const retryButton = container.querySelector('.button');
    expect(retryButton).not.toBeNull();

    await act(async () => {
      retryButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // 验证 onRetry 被调用
    expect(onRetry).toHaveBeenCalled();

    // 验证恢复正常 (shouldThrow 变为 false)
    expect(container.textContent).toContain('Safe Component');

    consoleSpy.mockRestore();
  });
});
