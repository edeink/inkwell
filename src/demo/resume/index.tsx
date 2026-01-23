import { useCallback, useEffect, useRef, useState } from 'react';

import { getCurrentThemeMode, useTheme } from '../../styles/theme';
import { InkwellCanvas } from '../common/inkwell-canvas';
import { DemoKey } from '../type';

import { RESUME_PAGE_WIDTH, runApp, runExportApp } from './app';
import avatarUrl from './assets/avator.jpeg?url';
import resumeMarkdown from './raw/resume.markdown?raw';

import type { Widget } from '@/core/base';

import Runtime from '@/runtime';

export const meta = {
  key: DemoKey.Resume,
  label: 'Resume',
  description: '基于 Markdown 的简历预览与导出示例。',
};

function decodeBase64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function buildPdfWithJpeg(opts: {
  jpeg: Uint8Array;
  imageWidth: number;
  imageHeight: number;
  pageWidthPt: number;
  pageHeightPt: number;
}): Uint8Array {
  const { jpeg, imageWidth, imageHeight, pageWidthPt, pageHeightPt } = opts;
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let size = 0;

  const pushBytes = (b: Uint8Array) => {
    chunks.push(b);
    size += b.length;
  };
  const pushStr = (s: string) => pushBytes(enc.encode(s));
  const startObj = () => offsets.push(size);

  const header = new Uint8Array([
    0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a,
  ]);
  pushBytes(header);

  startObj();
  pushStr(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

  startObj();
  pushStr(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`);

  const pageWidthStr = pageWidthPt.toFixed(2);
  const pageHeightStr = pageHeightPt.toFixed(2);

  startObj();
  pushStr(
    [
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /XObject << /Im0 4 0 R >> `,
      `/ProcSet [/PDF /ImageC] >> /MediaBox [0 0 ${pageWidthStr} ${pageHeightStr}] `,
      `/Contents 5 0 R >>\nendobj\n`,
    ].join(''),
  );

  startObj();
  const imageObj =
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Name /Im0 /Filter /DCTDecode ` +
    `/Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 ` +
    `/Length ${jpeg.length} >>\nstream\n`;
  pushStr(imageObj);
  pushBytes(jpeg);
  pushStr(`\nendstream\nendobj\n`);

  const content = enc.encode(`q\n${pageWidthStr} 0 0 ${pageHeightStr} 0 0 cm\n/Im0 Do\nQ\n`);

  startObj();
  pushStr(`5 0 obj\n<< /Length ${content.length} >>\nstream\n`);
  pushBytes(content);
  pushStr(`endstream\nendobj\n`);

  const xrefOffset = size;
  const objCount = 5;
  pushStr(`xref\n0 ${objCount + 1}\n0000000000 65535 f \n`);

  for (let i = 1; i <= objCount; i++) {
    const off = offsets[i];
    pushStr(`${String(off).padStart(10, '0')} 00000 n \n`);
  }

  pushStr(`trailer\n<< /Size ${objCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const out = new Uint8Array(size);
  let p = 0;
  for (const c of chunks) {
    out.set(c, p);
    p += c.length;
  }
  return out;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function waitNextFrame(): Promise<void> {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: number | undefined;
  return new Promise<T>((resolve, reject) => {
    timer = window.setTimeout(() => reject(new Error('等待超时')), ms);
    p.then(resolve, reject).finally(() => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    });
  });
}

async function waitFontsReady(): Promise<void> {
  const fonts = document.fonts;
  if (!fonts) {
    return;
  }
  try {
    await withTimeout(
      (async () => {
        await Promise.all([
          fonts.load('12px "Noto Sans SC"'),
          fonts.load('14px "Noto Sans SC"'),
          fonts.load('16px "Noto Sans SC"'),
          fonts.load('22px "Noto Sans SC"'),
        ]);
        await fonts.ready;
      })(),
      2_000,
    );
  } catch {
    void 0;
  }
}

async function preloadImages(srcList: string[]): Promise<void> {
  const uniq = Array.from(new Set(srcList.filter(Boolean)));
  if (uniq.length === 0) {
    return;
  }
  await Promise.allSettled(
    uniq.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new window.Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = src;
        }),
    ),
  );
}

function collectDescendants(root: Widget): Widget[] {
  const out: Widget[] = [];
  const queue: Widget[] = [root];
  while (queue.length) {
    const cur = queue.shift()!;
    out.push(cur);
    for (const c of cur.children as Widget[]) {
      queue.push(c);
    }
  }
  return out;
}

async function waitRuntimeImagesLoaded(runtime: Runtime, timeoutMs: number): Promise<void> {
  type ImageWidgetLike = Widget & { src?: string; imageLoaded?: boolean };
  const start = performance.now();
  while (true) {
    const root = runtime.getRootWidget() as Widget | null;
    if (!root) {
      await waitNextFrame();
      if (performance.now() - start > timeoutMs) {
        return;
      }
      continue;
    }

    const widgets = collectDescendants(root);
    const pending = widgets.some((w) => {
      if (w.type !== 'Image') {
        return false;
      }
      const rec = w as unknown as ImageWidgetLike;
      if (!rec.src) {
        return false;
      }
      return rec.imageLoaded !== true;
    });
    if (!pending) {
      return;
    }
    if (performance.now() - start > timeoutMs) {
      return;
    }
    await waitNextFrame();
  }
}

function resolveProfileAvatarSrc(raw: string): string | undefined {
  const m = raw.match(/^\s*avatar\s*:\s*(.+?)\s*$/m);
  const v = (m?.[1] ?? '').trim();
  if (!v) {
    return undefined;
  }
  if (v === 'src/demo/resume/assets/avator.jpeg' || v === '/src/demo/resume/assets/avator.jpeg') {
    return avatarUrl;
  }
  if (v.startsWith('src/')) {
    return `/${v}`;
  }
  return v;
}

function collectMarkdownImageSrcs(raw: string): string[] {
  const out: string[] = [];
  const avatar = resolveProfileAvatarSrc(raw);
  if (avatar) {
    out.push(avatar);
  }
  const re = /!\[[^\]]*?\]\((.*?)\)/g;
  while (true) {
    const m = re.exec(raw);
    if (!m) {
      break;
    }
    const src = String(m[1] ?? '').trim();
    if (src) {
      out.push(src.startsWith('src/') ? `/${src}` : src);
    }
  }
  return out;
}

export default function ResumeDemo() {
  const theme = useTheme();
  const runtimeRef = useRef<Runtime | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const [exporting, setExporting] = useState(false);

  const handleRuntimeReady = (runtime: Runtime) => {
    runtimeRef.current = runtime;
    const container = runtime.container;
    if (container) {
      const rect = container.getBoundingClientRect();
      sizeRef.current = { width: rect.width, height: rect.height };
    }
    runApp(runtime, sizeRef.current.width, sizeRef.current.height, theme);
  };

  const handleResize = (width: number, height: number, runtime: Runtime) => {
    sizeRef.current = { width, height };
    runtimeRef.current = runtime;
    runApp(runtime, width, height, theme);
  };

  useEffect(() => {
    if (runtimeRef.current) {
      runApp(runtimeRef.current, sizeRef.current.width, sizeRef.current.height, theme);
    }
  }, [theme]);

  const handleExport = useCallback(
    async (format: 'png' | 'pdf') => {
      if (exporting) {
        return;
      }
      setExporting(true);

      const container = document.createElement('div');
      const containerId = `resume-export-${Math.random().toString(36).slice(2)}`;
      container.id = containerId;
      container.style.position = 'fixed';
      container.style.left = '-100000px';
      container.style.top = '0';
      container.style.width = '1px';
      container.style.height = '1px';
      container.style.overflow = 'hidden';
      document.body.appendChild(container);

      const cleanup = (rt: Runtime | null) => {
        try {
          rt?.destroy();
        } catch {
          void 0;
        }
        try {
          document.body.removeChild(container);
        } catch {
          void 0;
        }
      };

      try {
        await waitFontsReady();
        await preloadImages(collectMarkdownImageSrcs(String(resumeMarkdown)));

        const exportRuntime = await Runtime.create(containerId, {
          renderer: 'canvas2d',
          background: theme.background.base,
          backgroundAlpha: 1,
          resolution: 2,
        });

        await runExportApp(exportRuntime, RESUME_PAGE_WIDTH, 1, theme);
        await waitNextFrame();
        await waitRuntimeImagesLoaded(exportRuntime, 3_000);
        await waitNextFrame();

        const renderer = exportRuntime.getRenderer();
        const resolution = renderer?.getResolution?.() ?? 1;
        const canvas =
          (exportRuntime.canvas as HTMLCanvasElement | null) ??
          (renderer?.getCanvas?.() as HTMLCanvasElement | null) ??
          null;
        if (!canvas) {
          cleanup(exportRuntime);
          return;
        }

        if (format === 'png') {
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob 失败'))),
              'image/png',
            );
          });
          downloadBlob(blob, 'resume.png');
          cleanup(exportRuntime);
          return;
        }

        const cssWidth = canvas.width / resolution;
        const cssHeight = canvas.height / resolution;
        const pageWidthPt = (cssWidth * 72) / 96;
        const pageHeightPt = (cssHeight * 72) / 96;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const base64 = dataUrl.split(',')[1] ?? '';
        const jpeg = decodeBase64ToBytes(base64);
        const pdf = buildPdfWithJpeg({
          jpeg,
          imageWidth: canvas.width,
          imageHeight: canvas.height,
          pageWidthPt,
          pageHeightPt,
        });

        downloadBlob(new Blob([pdf], { type: 'application/pdf' }), 'resume.pdf');
        cleanup(exportRuntime);
      } catch {
        cleanup(null);
      } finally {
        setExporting(false);
      }
    },
    [exporting, theme],
  );

  const buttonStyle = (disabled: boolean) => {
    const mode = getCurrentThemeMode();
    const background = theme.background.container;
    const shadow =
      mode === 'dark' ? '0 12px 28px rgba(0,0,0,0.55)' : '0 12px 28px rgba(0,0,0,0.18)';
    return {
      padding: '10px 12px',
      borderRadius: 10,
      border: `1px solid ${theme.border.base}`,
      background,
      color: theme.text.primary,
      boxShadow: shadow,
      opacity: disabled ? 0.6 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
    } as const;
  };

  return (
    <>
      <InkwellCanvas
        style={{ width: '100%', height: '100%', overflow: 'hidden' }}
        onRuntimeReady={handleRuntimeReady}
        onResize={handleResize}
      />
      <div
        style={{ position: 'fixed', right: 24, bottom: 24, display: 'flex', gap: 10, zIndex: 1000 }}
      >
        <button
          type="button"
          disabled={exporting}
          onClick={() => handleExport('png')}
          style={buttonStyle(exporting)}
        >
          导出 PNG
        </button>
        <button
          type="button"
          disabled={exporting}
          onClick={() => handleExport('pdf')}
          style={buttonStyle(exporting)}
        >
          导出 PDF
        </button>
      </div>
    </>
  );
}
