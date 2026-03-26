import React from 'react';
import { CreemContext } from './context';
import type { CreemConfig } from './types';

interface CreemProviderProps {
  config: CreemConfig;
  children: React.ReactNode;
}

export function CreemProvider({ config, children }: CreemProviderProps) {
  return <CreemContext.Provider value={config}>{children}</CreemContext.Provider>;
}
