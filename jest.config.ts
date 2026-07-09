import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: { strict: true } }],
  },
  moduleNameMapper: {
    "^@hoare-ai/(.*)$": "<rootDir>/packages/$1/index.ts",
  },
  collectCoverage: false,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
};

export default config;
