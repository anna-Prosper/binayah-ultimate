import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  // Only run files in __tests__ dirs or *.test.ts files (skip Next.js app code).
  testMatch: ["**/__tests__/**/*.test.ts", "**/*.test.ts"],
  // Don't transform node_modules; do transform our src.
  transformIgnorePatterns: ["/node_modules/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // Coverage only for our lib/ directory (pure business logic).
  collectCoverageFrom: [
    "src/lib/**/*.ts",
    "!src/lib/**/*.d.ts",
  ],
};

export default config;
