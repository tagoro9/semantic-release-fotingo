module.exports = {
  coverageDirectory: './coverage/',
  coverageReporters: ['html', 'lcov'],
  moduleNameMapper: {
    '^~/(.*)': '<rootDir>/src/$1',
  },
  preset: 'ts-jest',
  testEnvironment: 'node',
};
