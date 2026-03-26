import { createContext, useContext } from 'react';
import type { CreemConfig } from './types';

export const CreemContext = createContext<CreemConfig | null>(null);

export function useCreemConfig(): CreemConfig {
  const config = useContext(CreemContext);
  if (!config) throw new Error('useCreemConfig must be used within a CreemProvider');
  return config;
}
