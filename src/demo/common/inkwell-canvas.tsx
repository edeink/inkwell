import React, { useEffect, useRef, useState } from 'react';

import Runtime from '@/runtime';
import { getCurrentThemeMode, Themes } from '@/styles/theme';

export interface InkwellCanvasProps {
  className?: string;
  style?: React.CSSProperties;
  background?: string;
  backgroundAlpha?: number;
  /**
   * Runtime 初始化完成并准备就绪时的回调。
   * 在此处调用 runApp() 或 renderTemplate()。
   */
  onRuntimeReady?: (runtime: Runtime) => void | Promise<void>;
  /**
   * 容器尺寸变化时的回调。
   * 如果需要手动触发布局更新或重新渲染时很有用，
   * 尽管如果设置正确，Runtime 通常会通过其自身机制处理此问题。
   */
  onResize?: (width: number, height: number, runtime: Runtime) => void;
  /**
   * Canvas 容器的可选 ID。如果未提供，将生成一个随机 ID。
   */
  id?: string;
  padding?: number;
}

export const InkwellCanvas: React.FC<InkwellCanvasProps> = ({
  className,
  style,
  background,
  backgroundAlpha = 1,
  onRuntimeReady,
  onResize,
  id,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const lastSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const resizeRafRef = useRef<number | null>(null);
  const [canvasVisible, setCanvasVisible] = useState(false);
  const canvasVisibleRef = useRef(false);
  canvasVisibleRef.current = canvasVisible;
  const onRuntimeReadyRef = useRef(onRuntimeReady);
  onRuntimeReadyRef.current = onRuntimeReady;
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  const themeBg = Themes[getCurrentThemeMode()].background.base;
  const finalBackground = background || themeBg;
  const wrapperBackground = backgroundAlpha === 1 ? finalBackground : 'transparent';

  const [containerId] = useState(
    () => id || `inkwell-canvas-${Math.random().toString(36).slice(2)}`,
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    // 确保容器具有正确的 ID
    el.id = containerId;
    el.innerHTML = ''; // 清除任何先前的内容

    let isActive = true;
    setCanvasVisible(false);

    const notifyResize = (width: number, height: number) => {
      if (!isActive) {
        return;
      }
      const runtime = runtimeRef.current;
      if (!runtime || !onResizeRef.current) {
        return;
      }
      onResizeRef.current(width, height, runtime);
    };

    const initRuntime = async () => {
      while (isActive) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          break;
        }
        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => resolve());
        });
      }

      if (!isActive) {
        return;
      }

      const runtime = await Runtime.create(containerId, {
        renderer: 'canvas2d',
        background: finalBackground,
        backgroundAlpha,
      });

      if (!isActive) {
        runtime.destroy();
        return;
      }

      runtimeRef.current = runtime;

      if (onRuntimeReadyRef.current) {
        await onRuntimeReadyRef.current(runtime);
      }

      const rect = el.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (width > 0 && height > 0) {
        lastSizeRef.current = { width, height };
        notifyResize(width, height);
      } else if (lastSizeRef.current.width > 0 && lastSizeRef.current.height > 0) {
        notifyResize(lastSizeRef.current.width, lastSizeRef.current.height);
      }

      let rafId = 0;
      let shown = false;
      let dispose: (() => void) | null = null;

      const show = () => {
        if (shown || !isActive) {
          return;
        }
        shown = true;
        setCanvasVisible(true);
        if (dispose) {
          dispose();
          dispose = null;
        }
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
      };

      const tryShow = () => {
        if (!isActive || shown) {
          return;
        }
        const isSizeLike = (v: unknown): v is { width: number; height: number } => {
          if (!v || typeof v !== 'object') {
            return false;
          }
          const o = v as Record<string, unknown>;
          return typeof o.width === 'number' && typeof o.height === 'number';
        };

        const root = runtime.getRootWidget?.() as unknown;
        const size = (root as { renderObject?: { size?: unknown } } | null)?.renderObject?.size;
        if (isSizeLike(size) && size.width > 0 && size.height > 0) {
          show();
          return;
        }
        rafId = window.requestAnimationFrame(tryShow);
      };

      dispose = runtime.addTickListener(() => {
        tryShow();
      });

      tryShow();
    };

    initRuntime();

    return () => {
      isActive = false;
      if (resizeRafRef.current != null) {
        window.cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
      if (runtimeRef.current) {
        runtimeRef.current.destroy();
        runtimeRef.current = null;
      }
      if (el) {
        el.innerHTML = '';
      }
    };
  }, [containerId, finalBackground, backgroundAlpha]); // 如果这些发生变化则重新创建

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const ro = new ResizeObserver((entries) => {
      window.requestAnimationFrame(() => {
        if (!Array.isArray(entries) || !entries.length) {
          return;
        }

        const entry = entries[0];
        const width = Math.round(entry.contentRect.width);
        const height = Math.round(entry.contentRect.height);

        // 确保尺寸有效
        if (width === 0 || height === 0) {
          return;
        }

        const prev = lastSizeRef.current;
        if (prev.width === width && prev.height === height) {
          return;
        }
        lastSizeRef.current = { width, height };

        if (!runtimeRef.current || !onResizeRef.current) {
          return;
        }

        if (resizeRafRef.current != null) {
          window.cancelAnimationFrame(resizeRafRef.current);
        }
        resizeRafRef.current = window.requestAnimationFrame(() => {
          resizeRafRef.current = null;
          if (runtimeRef.current && onResizeRef.current) {
            onResizeRef.current(width, height, runtimeRef.current);
          }
        });
      });
    });

    ro.observe(el);

    return () => {
      ro.disconnect();
    };
  }, []);

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        boxSizing: 'border-box',
        background: wrapperBackground,
        ...style,
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
          visibility: canvasVisible ? 'visible' : 'hidden',
        }}
      />
    </div>
  );
};
