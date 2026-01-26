/** @jsxImportSource @/utils/compiler */
import { getDefaultTheme, getDefaultTokens } from './theme';

import type { ThemePalette } from '@/styles/theme';

import {
  Column,
  Container,
  CrossAxisAlignment,
  Positioned,
  SizedBox,
  Stack,
  Text,
  TextAlignVertical,
} from '@/core';
import Runtime from '@/runtime';

export type MessageType = 'info' | 'success' | 'warning' | 'error';

export type MessagePlacement = 'topRight' | 'center';

export interface MessageOptions {
  duration?: number;
  placement?: MessagePlacement;
}

export interface MessagePayload {
  type: MessageType;
  content: string;
  duration: number;
  placement?: MessagePlacement;
}

const MESSAGE_OVERLAY_KEY = '__inkwell_message_overlay__';
const DEFAULT_MAX_COUNT = 5;

type RuntimeStore = {
  items: MessageItem[];
  timeouts: Map<string, number>;
  placement: MessagePlacement;
};

const STORE = new WeakMap<Runtime, RuntimeStore>();

export const message = {
  info(content: string, options: MessageOptions = {}) {
    emitMessage({
      type: 'info',
      content,
      duration: options.duration ?? 2000,
      placement: options.placement,
    });
  },
  success(content: string, options: MessageOptions = {}) {
    emitMessage({
      type: 'success',
      content,
      duration: options.duration ?? 2000,
      placement: options.placement,
    });
  },
  warning(content: string, options: MessageOptions = {}) {
    emitMessage({
      type: 'warning',
      content,
      duration: options.duration ?? 2500,
      placement: options.placement,
    });
  },
  error(content: string, options: MessageOptions = {}) {
    emitMessage({
      type: 'error',
      content,
      duration: options.duration ?? 3000,
      placement: options.placement,
    });
  },
};

function emitMessage(payload: MessagePayload): void {
  if (typeof window === 'undefined') {
    return;
  }
  const rt = pickRuntimeForMessage();
  if (!rt) {
    return;
  }
  enqueueToRuntime(rt, payload);
}

interface MessageItem extends MessagePayload {
  id: string;
  [key: string]: unknown;
}

function resolveMessageColor(theme: ThemePalette, type: MessageType): string {
  if (type === 'success') {
    return theme.success;
  }
  if (type === 'warning') {
    return theme.warning;
  }
  if (type === 'error') {
    return theme.danger;
  }
  return theme.text.primary;
}

function pickRuntimeForMessage(): Runtime | null {
  const list = Runtime.listCanvas();
  if (list.length === 0) {
    return null;
  }
  if (list.length === 1) {
    return list[0].runtime;
  }
  const active = document.activeElement;
  for (const it of list) {
    const raw = it.runtime.getRenderer()?.getRawInstance?.() as CanvasRenderingContext2D | null;
    const canvas = raw?.canvas ?? null;
    if (canvas && active === canvas) {
      return it.runtime;
    }
  }
  return list[0].runtime;
}

function ensureRuntimeStore(rt: Runtime): RuntimeStore {
  const prev = STORE.get(rt);
  if (prev) {
    return prev;
  }
  const next: RuntimeStore = {
    items: [],
    timeouts: new Map(),
    placement: 'center',
  };
  STORE.set(rt, next);
  return next;
}

function enqueueToRuntime(rt: Runtime, payload: MessagePayload): void {
  const root = rt.getRootWidget();
  const viewportW = root?.renderObject.size.width ?? 0;
  const viewportH = root?.renderObject.size.height ?? 0;
  if (viewportW <= 0 || viewportH <= 0) {
    return;
  }

  const store = ensureRuntimeStore(rt);
  if (payload.placement) {
    store.placement = payload.placement;
  }
  const id = `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const maxCount = DEFAULT_MAX_COUNT;
  const next = [...store.items, { ...payload, id }];
  store.items = next.length > maxCount ? next.slice(next.length - maxCount) : next;

  const t = window.setTimeout(() => removeFromRuntime(rt, id), payload.duration);
  store.timeouts.set(id, t);

  const theme = getDefaultTheme();
  renderOverlay(rt, store, viewportW, viewportH, theme);
}

function removeFromRuntime(rt: Runtime, id: string): void {
  const store = STORE.get(rt);
  if (!store) {
    return;
  }
  const t = store.timeouts.get(id);
  if (t) {
    clearTimeout(t);
    store.timeouts.delete(id);
  }
  store.items = store.items.filter((it) => it.id !== id);

  if (store.items.length === 0) {
    rt.removeOverlayEntry(MESSAGE_OVERLAY_KEY);
    return;
  }

  const root = rt.getRootWidget();
  const viewportW = root?.renderObject.size.width ?? 0;
  const viewportH = root?.renderObject.size.height ?? 0;
  if (viewportW <= 0 || viewportH <= 0) {
    rt.removeOverlayEntry(MESSAGE_OVERLAY_KEY);
    return;
  }
  const theme = getDefaultTheme();
  renderOverlay(rt, store, viewportW, viewportH, theme);
}

function renderOverlay(
  rt: Runtime,
  store: RuntimeStore,
  viewportW: number,
  viewportH: number,
  theme: ThemePalette,
): void {
  const tokens = getDefaultTokens();
  const top = 8;
  const right = 8;

  const stackAlignment = store.placement === 'center' ? 'topCenter' : 'topLeft';

  const stackContent =
    store.placement === 'center' ? (
      <Container padding={{ top }} pointerEvent="none">
        <Column spacing={8} crossAxisAlignment={CrossAxisAlignment.Center}>
          {store.items.map((it) => (
            <Container
              key={it.id}
              padding={{ left: 12, right: 12, top: 8, bottom: 8 }}
              borderRadius={tokens.borderRadius}
              border={{ width: tokens.borderWidth, color: theme.border.base }}
              color={theme.background.container}
              pointerEvent="auto"
            >
              <Text
                text={it.content}
                fontSize={14}
                color={resolveMessageColor(theme, it.type)}
                lineHeight={18}
                textAlignVertical={TextAlignVertical.Center}
                pointerEvent="none"
              />
            </Container>
          ))}
        </Column>
      </Container>
    ) : (
      <Positioned key="message-pos" right={right} top={top} pointerEvent="none">
        <Column spacing={8} crossAxisAlignment={CrossAxisAlignment.End}>
          {store.items.map((it) => (
            <Container
              key={it.id}
              padding={{ left: 12, right: 12, top: 8, bottom: 8 }}
              borderRadius={tokens.borderRadius}
              border={{ width: tokens.borderWidth, color: theme.border.base }}
              color={theme.background.container}
              pointerEvent="auto"
            >
              <Text
                text={it.content}
                fontSize={14}
                color={resolveMessageColor(theme, it.type)}
                lineHeight={18}
                textAlignVertical={TextAlignVertical.Center}
                pointerEvent="none"
              />
            </Container>
          ))}
        </Column>
      </Positioned>
    );

  rt.setOverlayEntry(
    MESSAGE_OVERLAY_KEY,
    <SizedBox
      key={MESSAGE_OVERLAY_KEY}
      width={viewportW}
      height={viewportH}
      pointerEvent="none"
      zIndex={2000}
    >
      <Stack allowOverflowPositioned={true} pointerEvent="none" alignment={stackAlignment}>
        {stackContent}
      </Stack>
    </SizedBox>,
  );
}
