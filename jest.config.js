module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 15000,
  verbose: true,
  // Fake timers for setTimeout/setInterval heavy code
  fakeTimers: { enableGlobally: false },
  // Coverage — babel (Istanbul) provider is used with manual instrumentation in
  // load-game.js so that new Function() eval'd code registers in global.__coverage__.
  collectCoverageFrom: ['script.js'],
  coverageProvider: 'babel',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    // Thresholds match current measured coverage — any regression will fail the build.
    // These will be tightened as more tests are added.
    global: { statements: 50, branches: 42, functions: 42, lines: 55 },
  },
  // Don't transform anything — plain JS
  transform: {},
};
