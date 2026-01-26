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
  StatefulWidget,
  Text,
  TextAlignVertical,
  type WidgetProps,
} from '@/core';
import Runtime from '@/runtime';

export type MessageType = 'info' | 'success' | 'warning' | 'error';

export interface MessageOptions {
  duration?: number;
}

export interface MessagePayload {
  type: MessageType;
  content: string;
  duration: number;
}

const MESSAGE_EVENT = 'inkwell:comp-message';
const MESSAGE_OVERLAY_KEY = '__inkwell_message_overlay__';
const DEFAULT_MAX_COUNT = 5;

type RuntimeStore = {
  items: MessageItem[];
  timeouts: Map<string, number>;
  lastViewportW: number;
  lastViewportH: number;
  lastTheme: ThemePalette | null;
};

const STORE = new WeakMap<Runtime, RuntimeStore>();
let mountedExternalHostCount = 0;

export const message = {
  info(content: string, options: MessageOptions = {}) {
    emitMessage({ type: 'info', content, duration: options.duration ?? 2000 });
  },
  success(content: string, options: MessageOptions = {}) {
    emitMessage({ type: 'success', content, duration: options.duration ?? 2000 });
  },
  warning(content: string, options: MessageOptions = {}) {
    emitMessage({ type: 'warning', content, duration: options.duration ?? 2500 });
  },
  error(content: string, options: MessageOptions = {}) {
    emitMessage({ type: 'error', content, duration: options.duration ?? 3000 });
  },
};

function emitMessage(payload: MessagePayload): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (mountedExternalHostCount === 0) {
    const rt = pickRuntimeForMessage();
    if (rt) {
      enqueueToRuntime(rt, payload);
    }
  }
  try {
    window.dispatchEvent(new CustomEvent(MESSAGE_EVENT, { detail: payload }));
  } catch (e) {
    void e;
  }
}

interface MessageItem extends MessagePayload {
  id: string;
  [key: string]: unknown;
}

export interface MessageHostProps extends WidgetProps {
  theme?: ThemePalette;
  viewportWidth: number;
  viewportHeight: number;
  top?: number;
  right?: number;
  maxCount?: number;
}

interface MessageHostState {
  items: MessageItem[];
  [key: string]: unknown;
}

export class MessageHost extends StatefulWidget<MessageHostProps, MessageHostState> {
  protected state: MessageHostState = { items: [] };
  private timeouts = new Map<string, number>();
  private boundListener: ((e: Event) => void) | null = null;

  protected override initWidget(data: MessageHostProps) {
    super.initWidget(data);
    mountedExternalHostCount++;
    this.state.items = [];
    for (const t of this.timeouts.values()) {
      clearTimeout(t);
    }
    this.timeouts.clear();
    if (typeof window === 'undefined') {
      return;
    }
    if (this.boundListener) {
      return;
    }
    this.boundListener = (e: Event) => {
      const detail = (e as CustomEvent<MessagePayload>).detail;
      if (!detail || typeof detail.content !== 'string') {
        return;
      }
      this.enqueue(detail);
    };
    window.addEventListener(MESSAGE_EVENT, this.boundListener as EventListener);
  }

  public override dispose(): void {
    mountedExternalHostCount = Math.max(0, mountedExternalHostCount - 1);
    if (typeof window !== 'undefined' && this.boundListener) {
      window.removeEventListener(MESSAGE_EVENT, this.boundListener as EventListener);
    }
    this.boundListener = null;
    for (const t of this.timeouts.values()) {
      clearTimeout(t);
    }
    this.timeouts.clear();
    super.dispose();
  }

  private enqueue(payload: MessagePayload): void {
    const id = `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const maxCount = this.props.maxCount ?? 5;
    const next = [...this.state.items, { ...payload, id }];
    const trimmed = next.length > maxCount ? next.slice(next.length - maxCount) : next;
    this.setState({ items: trimmed });
    const t = window.setTimeout(() => this.remove(id), payload.duration);
    this.timeouts.set(id, t);
  }

  private remove(id: string): void {
    const t = this.timeouts.get(id);
    if (t) {
      clearTimeout(t);
      this.timeouts.delete(id);
    }
    this.setState({ items: this.state.items.filter((it) => it.id !== id) });
  }

  render() {
    const theme = getDefaultTheme(this.props.theme);
    const tokens = getDefaultTokens();
    const top = this.props.top ?? 16;
    const right = this.props.right ?? 16;

    return (
      <SizedBox
        key={this.key}
        width={this.props.viewportWidth}
        height={this.props.viewportHeight}
        pointerEvent="none"
      >
        <Stack allowOverflowPositioned={true} pointerEvent="none">
          <Positioned key="message-pos" right={right} top={top} pointerEvent="none">
            <Column spacing={8} crossAxisAlignment={CrossAxisAlignment.End}>
              {this.state.items.map((it) => (
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
        </Stack>
      </SizedBox>
    );
  }
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
    lastViewportW: 0,
    lastViewportH: 0,
    lastTheme: null,
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
  store.lastViewportW = viewportW;
  store.lastViewportH = viewportH;
  store.lastTheme = theme;
  const tokens = getDefaultTokens();
  const top = 16;
  const left = 0;
  const right = 0;

  rt.setOverlayEntry(
    MESSAGE_OVERLAY_KEY,
    <SizedBox
      key={MESSAGE_OVERLAY_KEY}
      width={viewportW}
      height={viewportH}
      pointerEvent="none"
      zIndex={2000}
    >
      <Stack allowOverflowPositioned={true} pointerEvent="none">
        <Positioned key="message-pos" left={left} right={right} top={top} pointerEvent="none">
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
        </Positioned>
      </Stack>
    </SizedBox>,
  );
}
