import { DEVTOOLS_DOM, DEVTOOLS_EVENTS } from './constants';

let portalContainer: HTMLDivElement | null = null;
let created = false;
let instance: Devtools | null = null;

export function ensureDevtoolsContainer(): HTMLDivElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  if (portalContainer) {
    return portalContainer;
  }
  const existing = document.getElementById(DEVTOOLS_DOM.ROOT_ID) as HTMLDivElement | null;
  portalContainer = existing ?? document.createElement('div');
  if (!existing) {
    portalContainer.id = DEVTOOLS_DOM.ROOT_ID;
    document.body.appendChild(portalContainer);
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
  return created;
}

export function markDevtoolsCreated() {
  created = true;
}

export class Devtools {
  private constructor() {}

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
  }
}
