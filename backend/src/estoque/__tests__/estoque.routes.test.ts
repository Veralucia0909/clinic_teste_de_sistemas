// Testes unitários das rotas HTTP do estoque (backend).
// As rotas são montadas num Express isolado, com um repositório em memória no lugar do banco.
import express from "express";
import request from "supertest";
import { criarEstoqueService } from "../estoque.service";
import { criarRotasEstoque } from "../estoque.routes";
import type { EstoqueRepository, ItemEstoque, Movimentacao } from "../estoque.types";

function criarRepoEmMemoria(itensIniciais: ItemEstoque[]): EstoqueRepository {
  const itens = itensIniciais.map((i) => ({ ...i }));
  const movimentacoes: Movimentacao[] = [];
  return {
    listarItens: async () => itens,
    buscarItemPorId: async (id) => itens.find((i) => i.id === id) ?? null,
    buscarItemPorNome: async (nome) => itens.find((i) => i.nome.toLowerCase() === nome) ?? null,
    criarItem: async (dados) => {
      const item = { id: itens.length + 1, ...dados };
      itens.push(item);
      return item;
    },
    atualizarQuantidade: async (id, quantidade) => {
      const item = itens.find((i) => i.id === id)!;
      item.quantidade = quantidade;
      return item;
    },
    registrarMovimentacao: async (dados) => {
      const mov = { id: movimentacoes.length + 1, ...dados };
      movimentacoes.push(mov);
      return mov;
    },
    listarMovimentacoes: async (itemId) => movimentacoes.filter((m) => m.item_id === itemId),
  };
}

function montarApp() {
  const repo = criarRepoEmMemoria([
    { id: 1, nome: "Seringa 5ml", categoria: "MATERIAL", unidade: "unidade", quantidade: 20, estoque_minimo: 10 },
    { id: 2, nome: "Álcool 70%", categoria: "INSUMO", unidade: "frasco", quantidade: 1, estoque_minimo: 5 },
  ]);
  const app = express();
  app.use(express.json());
  app.use("/estoque", criarRotasEstoque(criarEstoqueService(repo)));
  return app;
}

describe("Rotas /estoque", () => {
  test("CT-B22: GET /estoque/itens retorna os itens com a situação calculada", async () => {
    const resposta = await request(montarApp()).get("/estoque/itens");

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(2);
    expect(resposta.body[1]).toMatchObject({ nome: "Álcool 70%", situacao: "BAIXO" });
  });

  test("CT-B23: GET /estoque/alertas lista os itens para reposição", async () => {
    const resposta = await request(montarApp()).get("/estoque/alertas");

    expect(resposta.status).toBe(200);
    expect(resposta.body.reposicao.map((i: ItemEstoque) => i.nome)).toEqual(["Álcool 70%"]);
  });

  test("CT-B24: POST /estoque/itens cadastra item válido (201)", async () => {
    const resposta = await request(montarApp())
      .post("/estoque/itens")
      .send({ nome: "Gaze estéril", categoria: "MATERIAL", unidade: "pacote", estoque_minimo: 15 });

    expect(resposta.status).toBe(201);
    expect(resposta.body.data).toMatchObject({ id: 3, nome: "Gaze estéril", quantidade: 0 });
  });

  test("CT-B25: POST /estoque/itens com dados inválidos responde 400", async () => {
    const resposta = await request(montarApp()).post("/estoque/itens").send({ nome: "", categoria: "MATERIAL" });

    expect(resposta.status).toBe(400);
    expect(resposta.body.error).toMatch(/Nome do item é obrigatório/);
  });

  test("CT-B26: POST /estoque/itens com nome repetido responde 409", async () => {
    const resposta = await request(montarApp())
      .post("/estoque/itens")
      .send({ nome: "seringa 5ml", categoria: "MATERIAL", unidade: "unidade", estoque_minimo: 10 });

    expect(resposta.status).toBe(409);
  });

  test("CT-B27: entrada e saída atualizam o saldo e ficam no histórico", async () => {
    const app = montarApp();

    const entrada = await request(app)
      .post("/estoque/itens/2/entrada")
      .send({ quantidade: 10, motivo: "Compra NF 778", usuario_id: 3 });
    const saida = await request(app)
      .post("/estoque/itens/2/saida")
      .send({ quantidade: 4, motivo: "Sala de curativos", usuario_id: 3 });
    const historico = await request(app).get("/estoque/itens/2/movimentacoes");

    expect(entrada.status).toBe(201);
    expect(saida.body.data.item.quantidade).toBe(7);
    expect(historico.body.map((m: Movimentacao) => m.tipo)).toEqual(["ENTRADA", "SAIDA"]);
  });

  test("CT-B28: saída maior que o saldo responde 422 e não altera o estoque", async () => {
    const app = montarApp();

    const resposta = await request(app)
      .post("/estoque/itens/2/saida")
      .send({ quantidade: 2, motivo: "Uso", usuario_id: 3 });
    const itens = await request(app).get("/estoque/itens");

    expect(resposta.status).toBe(422);
    expect(resposta.body.error).toMatch(/Estoque insuficiente/);
    expect(itens.body[1].quantidade).toBe(1);
  });

  test("CT-B29: inventário corrige divergência e item inexistente responde 404", async () => {
    const app = montarApp();

    const ajuste = await request(app)
      .post("/estoque/itens/1/inventario")
      .send({ contagem_fisica: 18, motivo: "Inventário mensal", usuario_id: 3 });
    const inexistente = await request(app).get("/estoque/itens/999/movimentacoes");

    expect(ajuste.status).toBe(200);
    expect(ajuste.body.data).toMatchObject({ diferenca: -2, item: { quantidade: 18 } });
    expect(inexistente.status).toBe(404);
  });

  test("CT-B30: erro inesperado do banco responde 500 sem expor detalhes", async () => {
    const service = criarEstoqueService({
      listarItens: async () => {
        throw new Error("conexão perdida");
      },
    } as unknown as EstoqueRepository);
    const app = express();
    app.use("/estoque", criarRotasEstoque(service));
    jest.spyOn(console, "error").mockImplementation(() => {});

    const resposta = await request(app).get("/estoque/itens");

    expect(resposta.status).toBe(500);
    expect(resposta.body.error).toBe("Erro interno ao processar o estoque.");
  });
});
