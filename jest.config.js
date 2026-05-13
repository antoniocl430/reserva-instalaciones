const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })

const customJestConfig = {
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  // Los tests de src/__tests__/lib/ usan Vitest, no Jest.
  // Los tests de src/__tests__/frontend/ y components/ también son Vitest.
  testMatch: [
    '<rootDir>/src/__tests__/api/**/*.test.ts',
    '<rootDir>/src/__tests__/backend/**/*.test.ts',
  ],
}

module.exports = createJestConfig(customJestConfig)
