/** Configuração do Jest para os testes unitários do backend */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  collectCoverageFrom: ["src/estoque/**/*.ts", "!src/estoque/estoque.repository.ts", "!src/estoque/estoque.types.ts"],
  coverageReporters: ["text", "text-summary"],
};
