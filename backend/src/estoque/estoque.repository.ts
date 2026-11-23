// Implementação do repositório com o Prisma (banco PostgreSQL), no mesmo
// padrão de consultas usado no app.ts (db.orm.public.<Modelo>).
// Requer os modelos ItemEstoque e MovimentacaoEstoque no contract.prisma
// (rodar `npm run contract:emit` e a migração depois de atualizar o contrato).
// Este arquivo não entra nos testes unitários: nos testes, o banco é substituído por um mock.
import { db } from "../prisma/db";
import type { EstoqueRepository, ItemEstoque, Movimentacao } from "./estoque.types";

// O contrato só passa a ter os modelos novos depois do `contract:emit`
const orm = db.orm.public as any;

const paraItem = (linha: any): ItemEstoque => ({
  ...linha,
  quantidade: Number(linha.quantidade),
  estoque_minimo: Number(linha.estoque_minimo),
});

export const estoqueRepositoryPrisma: EstoqueRepository = {
  async listarItens() {
    const linhas = await orm.ItemEstoque.orderBy([(i: any) => i.nome.asc()]).all();
    return linhas.map(paraItem);
  },
  async buscarItemPorId(id) {
    const linha = await orm.ItemEstoque.where({ id }).first();
    return linha ? paraItem(linha) : null;
  },
  async buscarItemPorNome(nomeNormalizado) {
    const linha = await orm.ItemEstoque.where((i: any) => i.nome.ilike(nomeNormalizado)).first();
    return linha ? paraItem(linha) : null;
  },
  async criarItem(dados) {
    return paraItem(await orm.ItemEstoque.create(dados));
  },
  async atualizarQuantidade(id, quantidade) {
    return paraItem(await orm.ItemEstoque.where({ id }).update({ quantidade }));
  },
  async registrarMovimentacao(dados) {
    return (await orm.MovimentacaoEstoque.create(dados)) as Movimentacao;
  },
  async listarMovimentacoes(itemId) {
    return orm.MovimentacaoEstoque.where({ item_id: itemId })
      .orderBy([(m: any) => m.data.desc()])
      .all();
  },
};
