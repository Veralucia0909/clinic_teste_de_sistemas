// Testes unitários das funções de apoio do estoque (frontend)
import {
  countLowStock,
  filterStockItems,
  getApiErrorMessage,
  getStockStatus,
  movementEndpoint,
  validateMovement,
} from "../estoque";
import type { MovementFormData, StockItem } from "../estoque";

const itens: StockItem[] = [
  { id: 1, nome: "Luva de procedimento M", categoria: "INSUMO", unidade: "caixa", quantidade: 12, estoque_minimo: 5 },
  { id: 2, nome: "Dipirona 500mg", categoria: "MEDICAMENTO", unidade: "caixa", quantidade: 3, estoque_minimo: 5 },
  { id: 3, nome: "Seringa 5ml", categoria: "MATERIAL", unidade: "unidade", quantidade: 0, estoque_minimo: 20 },
];

const formBase: MovementFormData = { itemId: "2", tipo: "SAIDA", quantidade: "2", motivo: "Uso no consultório" };

describe("getStockStatus", () => {
  test("CT-F01: classifica SEM_ESTOQUE, BAIXO (inclusive no limite) e OK", () => {
    expect(getStockStatus({ quantidade: 0, estoque_minimo: 5 })).toBe("SEM_ESTOQUE");
    expect(getStockStatus({ quantidade: 5, estoque_minimo: 5 })).toBe("BAIXO");
    expect(getStockStatus({ quantidade: 6, estoque_minimo: 5 })).toBe("OK");
  });
});

describe("filterStockItems e countLowStock", () => {
  test("CT-F02: filtra pelo nome sem diferenciar maiúsculas", () => {
    expect(filterStockItems(itens, "  DIPIRONA ", "TODAS").map((i) => i.id)).toEqual([2]);
  });

  test("CT-F03: filtra por categoria e combina com a busca", () => {
    expect(filterStockItems(itens, "", "MATERIAL").map((i) => i.id)).toEqual([3]);
    expect(filterStockItems(itens, "luva", "MEDICAMENTO")).toEqual([]);
  });

  test("CT-F04: conta os itens que precisam de reposição", () => {
    expect(countLowStock(itens)).toBe(2);
  });
});

describe("validateMovement", () => {
  test("CT-F05: aceita uma saída válida dentro do saldo", () => {
    expect(validateMovement(formBase, itens[1])).toEqual({});
  });

  test("CT-F06: exige item, quantidade inteira positiva e motivo", () => {
    const erros = validateMovement({ itemId: "", tipo: "ENTRADA", quantidade: "0", motivo: "" }, undefined);
    expect(erros).toEqual({
      itemId: "Selecione um item do estoque.",
      quantidade: "Informe uma quantidade inteira maior que zero.",
      motivo: "Informe o motivo (mínimo 3 caracteres).",
    });
    expect(validateMovement({ ...formBase, quantidade: "1.5" }, itens[1]).quantidade).toBeDefined();
  });

  test("CT-F07: bloqueia saída maior que o saldo, mas permite entrada de qualquer valor", () => {
    expect(validateMovement({ ...formBase, quantidade: "4" }, itens[1]).quantidade).toBe(
      "Estoque insuficiente: saldo atual de 3 caixa.",
    );
    expect(validateMovement({ ...formBase, tipo: "ENTRADA", quantidade: "40" }, itens[1])).toEqual({});
  });
});

describe("Integração com a API", () => {
  test("CT-F08: monta a rota da API de entrada/saída e lê a mensagem de erro da API", () => {
    expect(movementEndpoint(2, "ENTRADA")).toBe("/estoque/itens/2/entrada");
    expect(movementEndpoint(2, "SAIDA")).toBe("/estoque/itens/2/saida");
    expect(getApiErrorMessage({ response: { data: { error: "Estoque insuficiente" } } }, "Padrão")).toBe(
      "Estoque insuficiente",
    );
    expect(getApiErrorMessage(new Error("Network Error"), "Padrão")).toBe("Padrão");
  });
});
