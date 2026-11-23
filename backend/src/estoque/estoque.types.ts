// Tipos do módulo de Gestão de Estoque

export const CATEGORIAS = ["INSUMO", "MEDICAMENTO", "MATERIAL", "CONSUMO"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export type TipoMovimentacao = "ENTRADA" | "SAIDA" | "AJUSTE";

export type SituacaoEstoque = "SEM_ESTOQUE" | "BAIXO" | "OK";

export interface ItemEstoque {
  id: number;
  nome: string;
  categoria: Categoria;
  unidade: string; // ex.: "caixa", "unidade", "frasco"
  quantidade: number; // saldo atual
  estoque_minimo: number;
  data_validade?: string | null; // AAAA-MM-DD (medicamentos e insumos)
}

export interface NovoItem {
  nome: string;
  categoria: string;
  unidade: string;
  quantidade?: number;
  estoque_minimo: number;
  data_validade?: string | null;
}

export interface Movimentacao {
  id: number;
  item_id: number;
  tipo: TipoMovimentacao;
  quantidade: number; // sempre positiva; o tipo diz se entrou ou saiu
  saldo_anterior: number;
  saldo_atual: number;
  motivo: string;
  usuario_id: number;
  data: string; // ISO
}

// Contrato de acesso a dados. Em produção é implementado com Prisma;
// nos testes unitários é substituído por um objeto falso (mock).
export interface EstoqueRepository {
  listarItens(): Promise<ItemEstoque[]>;
  buscarItemPorId(id: number): Promise<ItemEstoque | null>;
  buscarItemPorNome(nome: string): Promise<ItemEstoque | null>;
  criarItem(dados: Omit<ItemEstoque, "id">): Promise<ItemEstoque>;
  atualizarQuantidade(id: number, quantidade: number): Promise<ItemEstoque>;
  registrarMovimentacao(dados: Omit<Movimentacao, "id">): Promise<Movimentacao>;
  listarMovimentacoes(itemId: number): Promise<Movimentacao[]>;
}

// Erro de regra de negócio: vira resposta HTTP com o status indicado
export class EstoqueErro extends Error {
  status: number;
  constructor(mensagem: string, status = 400) {
    super(mensagem);
    this.name = "EstoqueErro";
    this.status = status;
  }
}
