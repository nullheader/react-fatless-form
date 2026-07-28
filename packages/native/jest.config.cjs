/** @type {import('jest').Config} */
module.exports = {
  displayName: 'react-fatless-form-native',
  // jsdom, not the React Native jest preset: this package's src/ never
  // renders actual React Native components (see babel.config.cjs) - its
  // hooks are tested with @testing-library/react's `renderHook`, which
  // needs a DOM the same way the web package's tests do. The one real
  // `react-native` import (Keyboard, in useFormSubmit.ts) is mocked per-test
  // rather than requiring the full RN preset/metro toolchain.
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/__tests__/**/*.test.[jt]s?(x)'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    // Mirrors this package's own tsconfig.typecheck.json `paths` mapping -
    // see packages/web/jest.config.cjs and tsconfig.typecheck.json for the
    // full rationale.
    '^react-fatless-form$': '<rootDir>/../core/src/index.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  coverageProvider: 'v8',
}
