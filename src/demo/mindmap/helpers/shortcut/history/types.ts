export interface Command {
  id?: string;
  label?: string;
  execute(): void | Promise<void>;
  undo(): void | Promise<void>;
}

export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
}
