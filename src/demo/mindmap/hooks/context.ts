import { createContext, useContext } from 'react';

import { MindmapController } from '../controller';

export const MindmapContext = createContext<MindmapController | null>(null);

export function useMindmapController() {
  const context = useContext(MindmapContext);
  if (!context) {
    throw new Error('useMindmapController must be used within a MindmapContext.Provider');
  }
  return context;
}
