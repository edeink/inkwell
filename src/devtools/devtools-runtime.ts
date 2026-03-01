import { DEVTOOLS_EVENTS, DEVTOOLS_GLOBAL, DEVTOOLS_IDS } from './constants';

let portalContainer: HTMLDivElement | null = null;
let created = false;
let instance: Devtools | null = null;

type DevtoolsGlobalState = {
  container: HTMLDivElement | null;
  created: boolean;
};

function getGlobalState(): DevtoolsGlobalState | null {
  if (typeof globalThis === 'undefined') {
    return null;
  }
  const key = DEVTOOLS_GLOBAL.RUNTIME_STATE_KEY;
  const g = globalThis as typeof globalThis & { [key: string]: DevtoolsGlobalState | undefined };
  const existing = g[key];
  if (existing) {
    return existing;
  }
  const next = { container: null, created: false };
  g[key] = next;
  return next;
}

export function ensureDevtoolsContainer(): HTMLDivElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const globalState = getGlobalState();
  const globalContainer = globalState?.container ?? null;
  if (globalContainer) {
    portalContainer = globalContainer;
    if (!document.body.contains(globalContainer)) {
      document.body.appendChild(globalContainer);
    }
    return globalContainer;
  }
  if (portalContainer) {
    if (!document.body.contains(portalContainer)) {
      document.body.appendChild(portalContainer);
    }
    if (globalState) {
      globalState.container = portalContainer;
    }
    return portalContainer;
  }
  const existing = document.getElementById(DEVTOOLS_IDS.ROOT) as HTMLDivElement | null;
  portalContainer = existing ?? document.createElement('div');
  if (!existing) {
    portalContainer.id = DEVTOOLS_IDS.ROOT;
    document.body.appendChild(portalContainer);
  }
  if (globalState) {
    globalState.container = portalContainer;
  }
  return portalContainer;
}

export function emitDevtoolsEvent(type: string) {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(type));
}

export function isDevtoolsCreated() {
  const globalState = getGlobalState();
  if (globalState) {
    return globalState.created;
  }
  return created;
}

export function markDevtoolsCreated() {
  created = true;
  const globalState = getGlobalState();
  if (globalState) {
    globalState.created = true;
  }
}

export class Devtools {
  private constructor() {
    void 0;
  }

  static getInstance() {
    return instance ?? (instance = new Devtools());
  }

  static async getInstanceAsync() {
    return Devtools.getInstance();
  }

  static reset() {
    instance?.dispose();
    instance = null;
  }

  isMounted() {
    return created;
  }

  show() {
    if (!ensureDevtoolsContainer()) {
      return;
    }
    created = true;
    emitDevtoolsEvent(DEVTOOLS_EVENTS.OPEN);
  }

  hide() {
    emitDevtoolsEvent(DEVTOOLS_EVENTS.CLOSE);
  }

  dispose() {
    if (portalContainer) {
      try {
        portalContainer.remove();
      } catch {
        void 0;
      }
    }
    portalContainer = null;
    created = false;
    if (instance === this) {
      instance = null;
    }
    const globalState = getGlobalState();
    if (globalState) {
      globalState.container = null;
      globalState.created = false;
    }
  }
}
