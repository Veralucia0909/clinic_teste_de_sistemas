// Regras de negócio do módulo de Gestão de Estoque.
// Cada regra responde a um risco citado pela clínica:
//  - falta de insumos ............ situacaoDoItem / itensAbaixoDoMinimo
//  - compras duplicadas .......... criarItem bloqueia item com mesmo nome
//  - divergência físico x sistema  ajustarInventario
//  - baixa rastreabilidade ....... toda entrada/saída/ajuste gera uma Movimentacao

import {
  CATEGORIAS,
  EstoqueErro,
  type Categoria,
  type EstoqueRepository,
  type ItemEstoque,
  type Movimentacao,
  type NovoItem,
  type SituacaoEstoque,
  type TipoMovimentacao,
} from "./estoque.types";

const ehInteiroPositivo = (valor: unknown): valor is number =>
  typeof valor === "number" && Number.isInteger(valor) && valor > 0;

const ehInteiroNaoNegativo = (valor: unknown): valor is number =>
  typeof valor === "number" && Number.isInteger(valor) && valor >= 0;

// Padroniza o nome para comparar duplicidade: sem espaços extras e sem diferença de maiúsculas
export function normalizarNome(nome: string): string {
  return nome.trim().replace(/\s+/g, " ").toLowerCase();
}

// Valida os dados de um novo item e devolve a lista de erros (vazia = válido)
export function validarNovoItem(dados: NovoItem): string[] {
  const erros: string[] = [];

  if (!dados.nome || dados.nome.trim().length < 2) {
    erros.push("Nome do item é obrigatório (mínimo 2 caracteres).");
  }
  if (!CATEGORIAS.includes(dados.categoria as Categoria)) {
    erros.push(`Categoria inválida. Use: ${CATEGORIAS.join(", ")}.`);
  }
  if (!dados.unidade || dados.unidade.trim() === "") {
    erros.push("Unidade de medida é obrigatória.");
  }
  if (!ehInteiroNaoNegativo(dados.estoque_minimo)) {
    erros.push("Estoque mínimo deve ser um número inteiro maior ou igual a zero.");
  }
  if (dados.quantidade !== undefined && !ehInteiroNaoNegativo(dados.quantidade)) {
    erros.push("Quantidade inicial deve ser um número inteiro maior ou igual a zero.");
  }
  if (dados.data_validade) {
    const data = new Date(`${dados.data_validade}T00:00:00Z`);
    if (Number.isNaN(data.getTime())) erros.push("Data de validade inválida (use AAAA-MM-DD).");
  }
  return erros;
}

// Situação de um item em relação ao estoque mínimo
export function situacaoDoItem(item: Pick<ItemEstoque, "quantidade" | "estoque_minimo">): SituacaoEstoque {
  if (item.quantidade <= 0) return "SEM_ESTOQUE";
  if (item.quantidade <= item.estoque_minimo) return "BAIXO";
  return "OK";
}

// Itens que precisam de reposição, os mais críticos primeiro
export function itensAbaixoDoMinimo(itens: ItemEstoque[]): ItemEstoque[] {
  return itens
    .filter((item) => situacaoDoItem(item) !== "OK")
    .sort((a, b) => a.quantidade - a.estoque_minimo - (b.quantidade - b.estoque_minimo));
}

// Itens que vencem em até `dias` dias a partir de `hoje` (inclui os já vencidos)
export function itensProximosDoVencimento(itens: ItemEstoque[], hoje: Date, dias = 30): ItemEstoque[] {
  const limite = new Date(hoje);
  limite.setUTCDate(limite.getUTCDate() + dias);
  return itens.filter((item) => {
    if (!item.data_validade) return false;
    const validade = new Date(`${item.data_validade}T00:00:00Z`);
    return validade <= limite;
  });
}

export function criarEstoqueService(repo: EstoqueRepository, agora: () => Date = () => new Date()) {
  async function obterItem(id: number): Promise<ItemEstoque> {
    const item = await repo.buscarItemPorId(id);
    if (!item) throw new EstoqueErro("Item de estoque não encontrado.", 404);
    return item;
  }

  async function movimentar(
    item: ItemEstoque,
    tipo: TipoMovimentacao,
    quantidade: number,
    novoSaldo: number,
    motivo: string,
    usuarioId: number,
  ): Promise<{ item: ItemEstoque; movimentacao: Movimentacao }> {
    const atualizado = await repo.atualizarQuantidade(item.id, novoSaldo);
    const movimentacao = await repo.registrarMovimentacao({
      item_id: item.id,
      tipo,
      quantidade,
      saldo_anterior: item.quantidade,
      saldo_atual: novoSaldo,
      motivo: motivo.trim(),
      usuario_id: usuarioId,
      data: agora().toISOString(),
    });
    return { item: atualizado, movimentacao };
  }

  function validarMotivoEUsuario(motivo: string, usuarioId: number) {
    if (!motivo || motivo.trim().length < 3) {
      throw new EstoqueErro("Informe o motivo da movimentação (mínimo 3 caracteres).");
    }
    if (!ehInteiroPositivo(usuarioId)) {
      throw new EstoqueErro("Usuário responsável é obrigatório.");
    }
  }

  return {
    async listarItens() {
      const itens = await repo.listarItens();
      return itens.map((item) => ({ ...item, situacao: situacaoDoItem(item) }));
    },

    async listarAlertas() {
      const itens = await repo.listarItens();
      return {
        reposicao: itensAbaixoDoMinimo(itens),
        vencimento: itensProximosDoVencimento(itens, agora()),
      };
    },

    async criarItem(dados: NovoItem) {
      const erros = validarNovoItem(dados);
      if (erros.length > 0) throw new EstoqueErro(erros.join(" "));

      const existente = await repo.buscarItemPorNome(normalizarNome(dados.nome));
      if (existente) {
        throw new EstoqueErro(
          `Já existe o item "${existente.nome}" no estoque. Registre uma entrada nele em vez de cadastrar outro.`,
          409,
        );
      }

      return repo.criarItem({
        nome: dados.nome.trim().replace(/\s+/g, " "),
        categoria: dados.categoria as Categoria,
        unidade: dados.unidade.trim(),
        quantidade: dados.quantidade ?? 0,
        estoque_minimo: dados.estoque_minimo,
        data_validade: dados.data_validade ?? null,
      });
    },

    async registrarEntrada(itemId: number, quantidade: number, motivo: string, usuarioId: number) {
      if (!ehInteiroPositivo(quantidade)) {
        throw new EstoqueErro("A quantidade da entrada deve ser um número inteiro maior que zero.");
      }
      validarMotivoEUsuario(motivo, usuarioId);
      const item = await obterItem(itemId);
      return movimentar(item, "ENTRADA", quantidade, item.quantidade + quantidade, motivo, usuarioId);
    },

    async registrarSaida(itemId: number, quantidade: number, motivo: string, usuarioId: number) {
      if (!ehInteiroPositivo(quantidade)) {
        throw new EstoqueErro("A quantidade da saída deve ser um número inteiro maior que zero.");
      }
      validarMotivoEUsuario(motivo, usuarioId);
      const item = await obterItem(itemId);
      if (quantidade > item.quantidade) {
        throw new EstoqueErro(
          `Estoque insuficiente: saldo de ${item.quantidade} ${item.unidade}, saída solicitada de ${quantidade}.`,
          422,
        );
      }
      return movimentar(item, "SAIDA", quantidade, item.quantidade - quantidade, motivo, usuarioId);
    },

    // Corrige o saldo do sistema com a contagem física (inventário)
    async ajustarInventario(itemId: number, contagemFisica: number, motivo: string, usuarioId: number) {
      if (!ehInteiroNaoNegativo(contagemFisica)) {
        throw new EstoqueErro("A contagem física deve ser um número inteiro maior ou igual a zero.");
      }
      validarMotivoEUsuario(motivo, usuarioId);
      const item = await obterItem(itemId);
      const diferenca = contagemFisica - item.quantidade;
      if (diferenca === 0) {
        return { item, movimentacao: null, diferenca };
      }
      const resultado = await movimentar(
        item,
        "AJUSTE",
        Math.abs(diferenca),
        contagemFisica,
        motivo,
        usuarioId,
      );
      return { ...resultado, diferenca };
    },

    async historico(itemId: number) {
      await obterItem(itemId);
      return repo.listarMovimentacoes(itemId);
    },
  };
}

export type EstoqueService = ReturnType<typeof criarEstoqueService>;
