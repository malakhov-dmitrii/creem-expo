import type { Config } from 'jest';
const config: Config = {
  testMatch: ['<rootDir>/tests/**/*.test.{ts,tsx}'],
  testPathIgnorePatterns: ['<rootDir>/tests/server/'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/tests/setup.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '^react-native$': '<rootDir>/tests/__mocks__/react-native.ts',
    '^expo-web-browser$': '<rootDir>/tests/__mocks__/expo-web-browser.ts',
    '^expo-linking$': '<rootDir>/tests/__mocks__/expo-linking.ts',
  },
};
export default config;
