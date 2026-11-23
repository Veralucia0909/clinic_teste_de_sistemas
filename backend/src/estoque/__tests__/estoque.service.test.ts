// Testes unitários das regras de negócio do estoque (backend).
// O banco de dados é substituído por um repositório falso (mock) criado com jest.fn().
import {
  criarEstoqueService,
  itensAbaixoDoMinimo,
  itensProximosDoVencimento,
  normalizarNome,
  situacaoDoItem,
  validarNovoItem,
} from "../estoque.service";
import { EstoqueErro, type EstoqueRepository, type ItemEstoque } from "../estoque.types";

const DATA_FIXA = new Date("2026-11-20T12:00:00.000Z");

function criarItem(dados: Partial<ItemEstoque> = {}): ItemEstoque {
  return {
    id: 1,
    nome: "Luva de procedimento M",
    categoria: "INSUMO",
    unidade: "caixa",
    quantidade: 10,
    estoque_minimo: 5,
    data_validade: null,
    ...dados,
  };
}

function criarRepoMock(item: ItemEstoque | null = criarItem()): jest.Mocked<EstoqueRepository> {
  return {
    listarItens: jest.fn().mockResolvedValue(item ? [item] : []),
    buscarItemPorId: jest.fn().mockResolvedValue(item),
    buscarItemPorNome: jest.fn().mockResolvedValue(null),
    criarItem: jest.fn().mockImplementation(async (dados) => ({ id: 99, ...dados })),
    atualizarQuantidade: jest.fn().mockImplementation(async (id, quantidade) => ({ ...item!, id, quantidade })),
    registrarMovimentacao: jest.fn().mockImplementation(async (dados) => ({ id: 500, ...dados })),
    listarMovimentacoes: jest.fn().mockResolvedValue([]),
  };
}

const novoItemValido = {
  nome: "Dipirona 500mg",
  categoria: "MEDICAMENTO",
  unidade: "caixa",
  quantidade: 20,
  estoque_minimo: 5,
  data_validade: "2027-03-31",
};

describe("Validação de novo item (validarNovoItem)", () => {
  test("CT-B01: aceita um item com todos os dados válidos", () => {
    expect(validarNovoItem(novoItemValido)).toEqual([]);
  });

  test("CT-B02: rejeita item sem nome, com categoria inválida e sem unidade", () => {
    const erros = validarNovoItem({ nome: " ", categoria: "COMIDA", unidade: "", estoque_minimo: 1 });
    expect(erros).toHaveLength(3);
    expect(erros.join(" ")).toMatch(/Nome do item é obrigatório/);
    expect(erros.join(" ")).toMatch(/Categoria inválida/);
    expect(erros.join(" ")).toMatch(/Unidade de medida é obrigatória/);
  });

  test("CT-B03: rejeita estoque mínimo negativo ou decimal e quantidade negativa", () => {
    expect(validarNovoItem({ ...novoItemValido, estoque_minimo: -1 })).toHaveLength(1);
    expect(validarNovoItem({ ...novoItemValido, estoque_minimo: 2.5 })).toHaveLength(1);
    expect(validarNovoItem({ ...novoItemValido, quantidade: -3 })).toHaveLength(1);
  });

  test("CT-B04: rejeita data de validade em formato inválido", () => {
    expect(validarNovoItem({ ...novoItemValido, data_validade: "31/03/2027" })).toEqual([
      "Data de validade inválida (use AAAA-MM-DD).",
    ]);
  });
});

describe("Situação do estoque e alertas", () => {
  test("CT-B05: classifica o item como SEM_ESTOQUE, BAIXO ou OK", () => {
    expect(situacaoDoItem({ quantidade: 0, estoque_minimo: 5 })).toBe("SEM_ESTOQUE");
    expect(situacaoDoItem({ quantidade: 5, estoque_minimo: 5 })).toBe("BAIXO"); // limite exato
    expect(situacaoDoItem({ quantidade: 6, estoque_minimo: 5 })).toBe("OK");
  });

  test("CT-B06: lista só os itens que precisam de reposição, do mais crítico ao menos crítico", () => {
    const itens = [
      criarItem({ id: 1, nome: "Gaze", quantidade: 50, estoque_minimo: 10 }), // OK
      criarItem({ id: 2, nome: "Seringa", quantidade: 4, estoque_minimo: 5 }), // falta 1
      criarItem({ id: 3, nome: "Álcool 70%", quantidade: 0, estoque_minimo: 8 }), // falta 8
    ];
    expect(itensAbaixoDoMinimo(itens).map((i) => i.nome)).toEqual(["Álcool 70%", "Seringa"]);
  });

  test("CT-B07: aponta itens vencidos ou que vencem nos próximos 30 dias", () => {
    const itens = [
      criarItem({ id: 1, nome: "Vencido", data_validade: "2026-11-01" }),
      criarItem({ id: 2, nome: "Vence em 10 dias", data_validade: "2026-11-30" }),
      criarItem({ id: 3, nome: "Vence em 2027", data_validade: "2027-06-01" }),
      criarItem({ id: 4, nome: "Sem validade", data_validade: null }),
    ];
    expect(itensProximosDoVencimento(itens, DATA_FIXA).map((i) => i.nome)).toEqual([
      "Vencido",
      "Vence em 10 dias",
    ]);
  });
});

describe("Cadastro de item (criarItem)", () => {
  test("CT-B08: cadastra item válido com nome limpo e quantidade inicial", async () => {
    const repo = criarRepoMock();
    const service = criarEstoqueService(repo);

    const item = await service.criarItem({ ...novoItemValido, nome: "  Dipirona   500mg " });

    expect(repo.buscarItemPorNome).toHaveBeenCalledWith("dipirona 500mg");
    expect(repo.criarItem).toHaveBeenCalledWith(expect.objectContaining({ nome: "Dipirona 500mg", quantidade: 20 }));
    expect(item.id).toBe(99);
  });

  test("CT-B09: bloqueia cadastro duplicado (evita compras duplicadas)", async () => {
    const repo = criarRepoMock();
    repo.buscarItemPorNome.mockResolvedValue(criarItem({ nome: "Dipirona 500mg" }));
    const service = criarEstoqueService(repo);

    await expect(service.criarItem({ ...novoItemValido, nome: "DIPIRONA 500MG" })).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining("Já existe o item"),
    });
    expect(repo.criarItem).not.toHaveBeenCalled();
  });

  test("CT-B10: não acessa o banco quando os dados são inválidos", async () => {
    const repo = criarRepoMock();
    const service = criarEstoqueService(repo);

    await expect(service.criarItem({ ...novoItemValido, categoria: "X" })).rejects.toBeInstanceOf(EstoqueErro);
    expect(repo.buscarItemPorNome).not.toHaveBeenCalled();
  });
});

describe("Entrada e saída de itens", () => {
  test("CT-B11: entrada soma ao saldo e registra a movimentação (rastreabilidade)", async () => {
    const repo = criarRepoMock(criarItem({ quantidade: 10 }));
    const service = criarEstoqueService(repo, () => DATA_FIXA);

    const { item, movimentacao } = await service.registrarEntrada(1, 15, "Compra NF 1234", 7);

    expect(repo.atualizarQuantidade).toHaveBeenCalledWith(1, 25);
    expect(item.quantidade).toBe(25);
    expect(movimentacao).toMatchObject({
      tipo: "ENTRADA",
      quantidade: 15,
      saldo_anterior: 10,
      saldo_atual: 25,
      usuario_id: 7,
      data: "2026-11-20T12:00:00.000Z",
    });
  });

  test("CT-B12: entrada com quantidade zero, negativa ou decimal é rejeitada", async () => {
    const repo = criarRepoMock();
    const service = criarEstoqueService(repo);

    for (const quantidade of [0, -5, 1.5]) {
      await expect(service.registrarEntrada(1, quantidade, "Compra", 7)).rejects.toThrow(/maior que zero/);
    }
    expect(repo.atualizarQuantidade).not.toHaveBeenCalled();
  });

  test("CT-B13: saída subtrai do saldo e registra a movimentação", async () => {
    const repo = criarRepoMock(criarItem({ quantidade: 10 }));
    const service = criarEstoqueService(repo);

    const { movimentacao } = await service.registrarSaida(1, 4, "Uso no consultório 2", 7);

    expect(repo.atualizarQuantidade).toHaveBeenCalledWith(1, 6);
    expect(movimentacao).toMatchObject({ tipo: "SAIDA", saldo_anterior: 10, saldo_atual: 6 });
  });

  test("CT-B14: saída maior que o saldo é bloqueada (estoque nunca fica negativo)", async () => {
    const repo = criarRepoMock(criarItem({ quantidade: 3 }));
    const service = criarEstoqueService(repo);

    await expect(service.registrarSaida(1, 4, "Uso", 7)).rejects.toMatchObject({
      status: 422,
      message: "Estoque insuficiente: saldo de 3 caixa, saída solicitada de 4.",
    });
    expect(repo.atualizarQuantidade).not.toHaveBeenCalled();
    expect(repo.registrarMovimentacao).not.toHaveBeenCalled();
  });

  test("CT-B15: saída de todo o saldo é permitida (valor limite)", async () => {
    const repo = criarRepoMock(criarItem({ quantidade: 3 }));
    const service = criarEstoqueService(repo);

    const { item } = await service.registrarSaida(1, 3, "Uso", 7);
    expect(item.quantidade).toBe(0);
  });

  test("CT-B16: movimentação de item inexistente retorna 404", async () => {
    const repo = criarRepoMock(null);
    const service = criarEstoqueService(repo);

    await expect(service.registrarEntrada(999, 1, "Compra", 7)).rejects.toMatchObject({ status: 404 });
  });

  test("CT-B17: exige motivo e usuário responsável em toda movimentação", async () => {
    const repo = criarRepoMock();
    const service = criarEstoqueService(repo);

    await expect(service.registrarSaida(1, 1, "", 7)).rejects.toThrow(/motivo/);
    await expect(service.registrarSaida(1, 1, "Uso no consultório", 0)).rejects.toThrow(/Usuário responsável/);
  });
});

describe("Inventário (divergência entre estoque físico e sistema)", () => {
  test("CT-B18: ajusta o saldo para a contagem física e informa a diferença", async () => {
    const repo = criarRepoMock(criarItem({ quantidade: 10 }));
    const service = criarEstoqueService(repo);

    const resultado = await service.ajustarInventario(1, 7, "Inventário mensal", 7);

    expect(resultado.diferenca).toBe(-3);
    expect(repo.atualizarQuantidade).toHaveBeenCalledWith(1, 7);
    expect(resultado.movimentacao).toMatchObject({ tipo: "AJUSTE", quantidade: 3, saldo_atual: 7 });
  });

  test("CT-B19: não gera movimentação quando a contagem bate com o sistema", async () => {
    const repo = criarRepoMock(criarItem({ quantidade: 10 }));
    const service = criarEstoqueService(repo);

    const resultado = await service.ajustarInventario(1, 10, "Inventário mensal", 7);

    expect(resultado).toMatchObject({ diferenca: 0, movimentacao: null });
    expect(repo.registrarMovimentacao).not.toHaveBeenCalled();
  });
});

describe("Listagens", () => {
  test("CT-B20: listarItens devolve cada item com a sua situação", async () => {
    const repo = criarRepoMock(criarItem({ quantidade: 2, estoque_minimo: 5 }));
    const service = criarEstoqueService(repo);

    expect(await service.listarItens()).toEqual([expect.objectContaining({ situacao: "BAIXO" })]);
  });

  test("CT-B21: normalizarNome ignora espaços extras e maiúsculas", () => {
    expect(normalizarNome("  Luva   de PROCEDIMENTO ")).toBe("luva de procedimento");
  });
});
