import type { ShortcutCommand, ShortcutContext } from '../types';

const MOVE_STEP = 20;

export const MoveLeftCommand: ShortcutCommand = {
  id: 'move-left',
  keys: ['ArrowLeft'],
  execute: ({ viewport }: ShortcutContext) => {
    const scale = viewport.scale;
    viewport.scrollBy(-MOVE_STEP / scale, 0);
    return true;
  },
};

export const MoveRightCommand: ShortcutCommand = {
  id: 'move-right',
  keys: ['ArrowRight'],
  execute: ({ viewport }: ShortcutContext) => {
    const scale = viewport.scale;
    viewport.scrollBy(MOVE_STEP / scale, 0);
    return true;
  },
};

export const MoveUpCommand: ShortcutCommand = {
  id: 'move-up',
  keys: ['ArrowUp'],
  execute: ({ viewport }: ShortcutContext) => {
    const scale = viewport.scale;
    viewport.scrollBy(0, -MOVE_STEP / scale);
    return true;
  },
};

export const MoveDownCommand: ShortcutCommand = {
  id: 'move-down',
  keys: ['ArrowDown'],
  execute: ({ viewport }: ShortcutContext) => {
    const scale = viewport.scale;
    viewport.scrollBy(0, MOVE_STEP / scale);
    return true;
  },
};
