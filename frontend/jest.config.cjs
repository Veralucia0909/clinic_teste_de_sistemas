/** Configuração do Jest para os testes unitários do frontend */
module.exports = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "\\.(css|less|scss)$": "identity-obj-proxy",
    "\\.(png|jpg|jpeg|svg)$": "<rootDir>/test/fileMock.cjs",
  },
  collectCoverageFrom: [
    "src/api/api.ts",
    "src/components/LoginForm/**/*.tsx",
    "src/utils/estoque.ts",
    "src/components/StockList/**/*.tsx",
    "src/components/StockMovementForm/**/*.tsx",
    "src/pages/Estoque/**/*.tsx",
  ],
  coverageReporters: ["text", "text-summary"],
};
