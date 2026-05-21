module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 15000,
  verbose: true,
  // Fake timers for setTimeout/setInterval heavy code
  fakeTimers: { enableGlobally: false },
  // Coverage
  collectCoverageFrom: ['script.js'],
  coverageReporters: ['text', 'lcov'],
  // Don't transform anything — plain JS
  transform: {},
};
