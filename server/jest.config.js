module.exports = {
  displayName: 'server',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
  // Add better test cleanup configuration
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  globalTeardown: '<rootDir>/tests/teardown.js',
  // Detect open handles and force exit to prevent hanging
  detectOpenHandles: true,
  forceExit: true,
  // Set reasonable test timeout
  testTimeout: 10000,
};
