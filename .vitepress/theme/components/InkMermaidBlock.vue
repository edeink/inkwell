<template>
  <div v-if="isSSR" class="vp-code-group">
    <pre><code>{{ decodedCode }}</code></pre>
  </div>
  <div v-else class="ink-mermaid">
    <div ref="containerEl"></div>
  </div>
  <Teleport to="body">
    <div
      v-if="previewOpen"
      class="ink-mermaid-modal"
      role="dialog"
      aria-modal="true"
      data-ink-allow-pinch="true"
      @click="onOverlayClick"
    >
      <div class="ink-mermaid-modal__toolbar">
        <button
          class="ink-mermaid-modal__close-btn"
          type="button"
          aria-label="关闭预览"
          title="关闭预览"
          @click="closePreview"
        >
          <svg viewBox="0 0 1024 1024" aria-hidden="true">
            <path
              d="M563.797 512l226.133-226.133c14.336-14.336 14.336-37.632 0-51.968-14.336-14.336-37.632-14.336-51.968 0L512 460.032 285.867 233.899c-14.336-14.336-37.632-14.336-51.968 0-14.336 14.336-14.336 37.632 0 51.968L460.032 512 233.899 738.133c-14.336 14.336-14.336 37.632 0 51.968 14.336 14.336 37.632 14.336 51.968 0L512 563.968 738.133 790.101c14.336 14.336 37.632 14.336 51.968 0 14.336-14.336 14.336-37.632 0-51.968L563.968 512z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
      <div
        ref="viewportEl"
        class="ink-mermaid-modal__viewport"
        @dblclick="closePreview"
        @wheel="onWheel"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <div ref="contentEl" class="ink-mermaid-modal__content" v-html="previewSvg"></div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Mermaid 代码块：
 * - SSR：回退为纯文本，避免依赖 DOM/Canvas 能力
 * - CSR：渲染 Mermaid SVG，并提供全屏预览、拖拽与缩放（滚轮缩放、触屏双指捏合、触控板双指缩放）
 *
 * 交互约定：
 * - 预览层的缩放始终以“指针所在位置”为锚点（zoomAt），避免缩放时跳动
 * - 打开预览时自动适配 SVG：尽可能占满可视区域，并居中显示
 */
import mermaid from 'mermaid';
import { useData } from 'vitepress';
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';

type Props = {
  codeBase64: string;
};

const props = defineProps<Props>();
const { isDark } = useData();

const isSSR = import.meta.env.SSR;
const containerEl = ref<HTMLElement | null>(null);
const viewportEl = ref<HTMLElement | null>(null);
const contentEl = ref<HTMLElement | null>(null);

const previewOpen = ref(false);
const previewSvg = ref('');
const prevBodyOverflow = ref<string | null>(null);
const previewSvgEl = ref<SVGElement | null>(null);
const viewBoxState = reactive({ x: 0, y: 0, w: 1, h: 1 });
const fitViewBoxRef = ref<{ x: number; y: number; w: number; h: number } | null>(null);

const SCALE_MIN = 0.1;
const SCALE_MAX = 16;
const PINCH_SENSITIVITY = 1.9;
const WHEEL_ZOOM_SPEED = 0.0075;

type PointerPos = { x: number; y: number };
const pointerMap = new Map<number, PointerPos>();

let panStart: { x: number; y: number; px: number; py: number } | null = null;
let pinchStart:
  | { dist: number; midX: number; midY: number; scale: number; x: number; y: number; w: number; h: number }
  | null = null;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toLocalPoint(e: PointerEvent | WheelEvent) {
  const rect = viewportEl.value?.getBoundingClientRect();
  if (!rect) {
    return { x: 0, y: 0 };
  }
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

async function resolvePreviewSvgEl() {
  await nextTick();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const svg = contentEl.value?.querySelector('svg') ?? null;
  previewSvgEl.value = svg instanceof SVGElement ? svg : null;
  return previewSvgEl.value;
}

function applyViewBoxToSvg() {
  const svg = previewSvgEl.value;
  if (!svg) {
    return;
  }
  svg.setAttribute('viewBox', `${viewBoxState.x} ${viewBoxState.y} ${viewBoxState.w} ${viewBoxState.h}`);
}

function getViewportSize() {
  const viewport = viewportEl.value;
  const vw = viewport?.clientWidth ?? 0;
  const vh = viewport?.clientHeight ?? 0;
  return { vw, vh };
}

function getCurrentScale() {
  const fit = fitViewBoxRef.value;
  if (!fit) {
    return 1;
  }
  return fit.w / Math.max(1e-6, viewBoxState.w);
}

function zoomAt(point: { x: number; y: number }, nextScale: number) {
  const fit = fitViewBoxRef.value;
  if (!fit) {
    return;
  }
  const { vw, vh } = getViewportSize();
  if (vw <= 0 || vh <= 0) {
    return;
  }
  const s0 = getCurrentScale();
  const s1 = clamp(nextScale, SCALE_MIN, SCALE_MAX);
  if (s1 === s0) {
    return;
  }
  const anchorX = viewBoxState.x + (point.x / vw) * viewBoxState.w;
  const anchorY = viewBoxState.y + (point.y / vh) * viewBoxState.h;
  const nextW = fit.w / s1;
  const nextH = fit.h / s1;
  viewBoxState.w = nextW;
  viewBoxState.h = nextH;
  viewBoxState.x = anchorX - (point.x / vw) * nextW;
  viewBoxState.y = anchorY - (point.y / vh) * nextH;
  applyViewBoxToSvg();
}

async function fitToViewport() {
  const svg = await resolvePreviewSvgEl();
  const viewport = viewportEl.value;
  if (!viewport || !svg) {
    return;
  }
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  if (vw <= 0 || vh <= 0) {
    return;
  }
  let base: { x: number; y: number; w: number; h: number } | null = null;
  const vb = (svg as unknown as SVGSVGElement).viewBox?.baseVal;
  if (vb && vb.width > 0 && vb.height > 0) {
    base = { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
  } else {
    try {
      const bbox = (svg as unknown as SVGGraphicsElement).getBBox();
      if (bbox.width > 0 && bbox.height > 0) {
        base = { x: bbox.x, y: bbox.y, w: bbox.width, h: bbox.height };
      }
    } catch {
      base = null;
    }
  }
  if (!base) {
    viewBoxState.x = 0;
    viewBoxState.y = 0;
    viewBoxState.w = 1;
    viewBoxState.h = 1;
    fitViewBoxRef.value = { x: viewBoxState.x, y: viewBoxState.y, w: viewBoxState.w, h: viewBoxState.h };
    applyViewBoxToSvg();
    return;
  }
  const pad = Math.max(base.w, base.h) * 0.02;
  const cx = base.x + base.w / 2;
  const cy = base.y + base.h / 2;
  let w = base.w + pad * 2;
  let h = base.h + pad * 2;
  const ar = vw / vh;
  if (w / h > ar) {
    h = w / ar;
  } else {
    w = h * ar;
  }
  const x = cx - w / 2;
  const y = cy - h / 2;
  fitViewBoxRef.value = { x, y, w, h };
  viewBoxState.x = x;
  viewBoxState.y = y;
  viewBoxState.w = w;
  viewBoxState.h = h;
  applyViewBoxToSvg();
  if (!w || !h) {
    return;
  }
}

async function openPreview(svgEl: SVGElement) {
  previewSvg.value = svgEl.outerHTML;
  previewOpen.value = true;
  await resolvePreviewSvgEl();
  await fitToViewport();
}

function closePreview() {
  previewOpen.value = false;
  previewSvg.value = '';
  previewSvgEl.value = null;
  fitViewBoxRef.value = null;
  pointerMap.clear();
  panStart = null;
  pinchStart = null;
}

function onOverlayClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    closePreview();
  }
}

function updatePointer(e: PointerEvent) {
  const p = toLocalPoint(e);
  pointerMap.set(e.pointerId, p);
}

function getPinchInfo() {
  if (pointerMap.size !== 2) {
    return null;
  }
  const pts = Array.from(pointerMap.values());
  const a = pts[0];
  const b = pts[1];
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dist = Math.hypot(dx, dy);
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  return { dist, midX, midY };
}

function onPointerDown(e: PointerEvent) {
  if (!previewOpen.value) {
    return;
  }
  e.preventDefault();
  (e.currentTarget as HTMLElement | null)?.setPointerCapture?.(e.pointerId);
  updatePointer(e);
  const info = getPinchInfo();
  if (info) {
    const s = getCurrentScale();
    pinchStart = {
      dist: info.dist,
      midX: info.midX,
      midY: info.midY,
      scale: s,
      x: viewBoxState.x,
      y: viewBoxState.y,
      w: viewBoxState.w,
      h: viewBoxState.h,
    };
    panStart = null;
    return;
  }
  if (pointerMap.size === 1) {
    const p = toLocalPoint(e);
    panStart = { x: viewBoxState.x, y: viewBoxState.y, px: p.x, py: p.y };
    pinchStart = null;
  }
}

function onPointerMove(e: PointerEvent) {
  if (!previewOpen.value) {
    return;
  }
  e.preventDefault();
  if (!pointerMap.has(e.pointerId)) {
    return;
  }
  updatePointer(e);
  const info = getPinchInfo();
  if (info && pinchStart) {
    const fit = fitViewBoxRef.value;
    if (!fit) {
      return;
    }
    const { vw, vh } = getViewportSize();
    if (vw <= 0 || vh <= 0) {
      return;
    }
    const ratio = info.dist / Math.max(1, pinchStart.dist);
    const nextScale = clamp(pinchStart.scale * Math.pow(ratio, PINCH_SENSITIVITY), SCALE_MIN, SCALE_MAX);
    const anchorX = pinchStart.x + (pinchStart.midX / vw) * pinchStart.w;
    const anchorY = pinchStart.y + (pinchStart.midY / vh) * pinchStart.h;
    const nextW = fit.w / nextScale;
    const nextH = fit.h / nextScale;
    const shiftX = info.midX - pinchStart.midX;
    const shiftY = info.midY - pinchStart.midY;
    viewBoxState.w = nextW;
    viewBoxState.h = nextH;
    viewBoxState.x = anchorX - (pinchStart.midX / vw) * nextW - (shiftX / vw) * nextW;
    viewBoxState.y = anchorY - (pinchStart.midY / vh) * nextH - (shiftY / vh) * nextH;
    applyViewBoxToSvg();
    return;
  }
  if (pointerMap.size === 1 && panStart) {
    const p = toLocalPoint(e);
    const { vw, vh } = getViewportSize();
    if (vw <= 0 || vh <= 0) {
      return;
    }
    const dx = p.x - panStart.px;
    const dy = p.y - panStart.py;
    viewBoxState.x = panStart.x - (dx / vw) * viewBoxState.w;
    viewBoxState.y = panStart.y - (dy / vh) * viewBoxState.h;
    applyViewBoxToSvg();
  }
}

function onPointerUp(e: PointerEvent) {
  if (!previewOpen.value) {
    return;
  }
  e.preventDefault();
  pointerMap.delete(e.pointerId);
  if (pointerMap.size === 1) {
    const p = Array.from(pointerMap.values())[0];
    panStart = { x: viewBoxState.x, y: viewBoxState.y, px: p.x, py: p.y };
    pinchStart = null;
    return;
  }
  if (pointerMap.size === 0) {
    panStart = null;
    pinchStart = null;
  }
}

function onWheel(e: WheelEvent) {
  if (!previewOpen.value) {
    return;
  }
  e.preventDefault();
  const p = toLocalPoint(e);
  const deltaY =
    e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * (viewportEl.value?.clientHeight ?? 1) : e.deltaY;
  const factor = Math.exp(-deltaY * WHEEL_ZOOM_SPEED);
  zoomAt(p, getCurrentScale() * factor);
}

function onResize() {
  if (!previewOpen.value) {
    return;
  }
  void fitToViewport();
}

function onKeydown(e: KeyboardEvent) {
  if (!previewOpen.value) {
    return;
  }
  if (e.key === 'Escape') {
    closePreview();
  }
}

function decodeBase64Utf8(base64: string) {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(base64, 'base64').toString('utf8');
    }
  } catch {}
  try {
    const bin = atob(base64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return '';
  }
}

const decodedCode = computed(() => {
  return decodeBase64Utf8(props.codeBase64);
});

async function renderMermaid() {
  if (isSSR) {
    return;
  }
  const el = containerEl.value;
  if (!el) {
    return;
  }
  const code = decodedCode.value.trim();
  if (!code) {
    el.innerHTML = '';
    return;
  }
  const id = `ink-mermaid-${Math.random().toString(36).slice(2)}`;
  mermaid.initialize({ startOnLoad: false, theme: isDark.value ? 'dark' : 'default' });
  const out = await mermaid.render(id, code);
  el.innerHTML = out.svg;
  const svg = el.querySelector('svg');
  if (svg) {
    svg.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPreview(svg);
    });
  }
}

onMounted(() => {
  void renderMermaid();
});

watch([decodedCode, isDark], () => {
  void renderMermaid();
});

watch(previewOpen, (open) => {
  if (isSSR) {
    return;
  }
  if (open) {
    window.addEventListener('keydown', onKeydown, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    prevBodyOverflow.value = document.body.style.overflow ?? '';
    document.body.style.overflow = 'hidden';
  } else {
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('resize', onResize);
    document.body.style.overflow = prevBodyOverflow.value ?? '';
    prevBodyOverflow.value = null;
    previewSvgEl.value = null;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('resize', onResize);
  if (!isSSR) {
    document.body.style.overflow = prevBodyOverflow.value ?? '';
    prevBodyOverflow.value = null;
  }
});

</script>

<style scoped>
.ink-mermaid {
  width: 100%;
  overflow-x: auto;
}

.ink-mermaid :deep(svg) {
  cursor: zoom-in;
}

.ink-mermaid-modal {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(14px);
  display: flex;
  flex-direction: column;
}

.ink-mermaid-modal__toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 12px 12px 0;
  pointer-events: none;
}

.ink-mermaid-modal__close-btn {
  pointer-events: auto;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(0, 0, 0, 0.35);
  color: rgba(255, 255, 255, 0.92);
  cursor: pointer;
  padding: 0;
  line-height: 1;
  appearance: none;
  outline: none;
  user-select: none;
  transition:
    background 120ms ease,
    border-color 120ms ease,
    color 120ms ease,
    transform 120ms ease;
}

.ink-mermaid-modal__close-btn:hover {
  border-color: rgba(255, 255, 255, 0.35);
  background: rgba(0, 0, 0, 0.5);
  color: rgba(255, 255, 255, 0.96);
}

.ink-mermaid-modal__close-btn:active {
  transform: scale(0.98);
}

.ink-mermaid-modal__close-btn > svg {
  width: 18px;
  height: 18px;
}

.ink-mermaid-modal__viewport {
  position: relative;
  flex: 1;
  margin: 12px;
  border-radius: 14px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.22);
  touch-action: none;
  user-select: none;
}

.ink-mermaid-modal__content {
  position: absolute;
  inset: 0;
}

.ink-mermaid-modal__content :deep(svg) {
  display: block;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
