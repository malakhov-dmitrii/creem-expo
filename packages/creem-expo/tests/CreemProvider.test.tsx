import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { CreemProvider } from '../src/CreemProvider';
import { useCreemConfig } from '../src/context';
import type { CreemConfig } from '../src/types';

const TEST_CONFIG: CreemConfig = { apiUrl: 'http://test-api.example.com' };

function wrapper({ children }: { children: React.ReactNode }) {
  return <CreemProvider config={TEST_CONFIG}>{children}</CreemProvider>;
}

describe('CreemProvider', () => {
  it('renders children and provides config', () => {
    const { result } = renderHook(() => useCreemConfig(), { wrapper });
    expect(result.current).toBeTruthy();
    expect(result.current.apiUrl).toBe('http://test-api.example.com');
  });
});

describe('useCreemConfig', () => {
  it('returns the config provided to CreemProvider', () => {
    const { result } = renderHook(() => useCreemConfig(), { wrapper });
    expect(result.current.apiUrl).toBe('http://test-api.example.com');
  });

  it('throws when used outside CreemProvider', () => {
    expect(() => {
      renderHook(() => useCreemConfig());
    }).toThrow('useCreemConfig must be used within a CreemProvider');
  });

  it('provides authToken when configured', () => {
    const configWithAuth: CreemConfig = { apiUrl: 'http://x', authToken: 'tok_123' };
    const authWrapper = ({ children }: { children: React.ReactNode }) => (
      <CreemProvider config={configWithAuth}>{children}</CreemProvider>
    );
    const { result } = renderHook(() => useCreemConfig(), { wrapper: authWrapper });
    expect(result.current.authToken).toBe('tok_123');
  });

  it('provides scheme when configured', () => {
    const configWithScheme: CreemConfig = { apiUrl: 'http://x', scheme: 'myapp' };
    const schemeWrapper = ({ children }: { children: React.ReactNode }) => (
      <CreemProvider config={configWithScheme}>{children}</CreemProvider>
    );
    const { result } = renderHook(() => useCreemConfig(), { wrapper: schemeWrapper });
    expect(result.current.scheme).toBe('myapp');
  });

  it('returns updated config when provider props change', () => {
    const { result } = renderHook(() => useCreemConfig(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <CreemProvider config={{ apiUrl: 'http://first' }}>{children}</CreemProvider>
      ),
    });
    expect(result.current.apiUrl).toBe('http://first');
  });
});
