// Funções de apoio do módulo de estoque (frontend).
// Ficam separadas dos componentes para poderem ser testadas de forma isolada.

export type Categoria = "INSUMO" | "MEDICAMENTO" | "MATERIAL" | "CONSUMO";
export type TipoMovimentacao = "ENTRADA" | "SAIDA";
export type SituacaoEstoque = "SEM_ESTOQUE" | "BAIXO" | "OK";

// Formato que a API do backend devolve em GET /estoque/itens
export interface StockItem {
  id: number;
  nome: string;
  categoria: Categoria;
  unidade: string;
  quantidade: number;
  estoque_minimo: number;
  data_validade?: string | null;
  situacao?: SituacaoEstoque; // calculada pelo backend
}

export interface MovementFormData {
  itemId: string;
  tipo: TipoMovimentacao;
  quantidade: string; // vem do input como texto
  motivo: string;
}

export const CATEGORIA_LABEL: Record<Categoria, string> = {
  INSUMO: "Insumo",
  MEDICAMENTO: "Medicamento",
  MATERIAL: "Material",
  CONSUMO: "Item de consumo",
};

export const SITUACAO_LABEL: Record<SituacaoEstoque, string> = {
  SEM_ESTOQUE: "Sem estoque",
  BAIXO: "Estoque baixo",
  OK: "Normal",
};

export function getStockStatus(item: Pick<StockItem, "quantidade" | "estoque_minimo">): SituacaoEstoque {
  if (item.quantidade <= 0) return "SEM_ESTOQUE";
  if (item.quantidade <= item.estoque_minimo) return "BAIXO";
  return "OK";
}

// Filtra por nome (sem diferenciar maiúsculas) e por categoria ("TODAS" = sem filtro)
export function filterStockItems(items: StockItem[], termo: string, categoria: Categoria | "TODAS"): StockItem[] {
  const busca = termo.trim().toLowerCase();
  return items.filter(
    (item) =>
      item.nome.toLowerCase().includes(busca) && (categoria === "TODAS" || item.categoria === categoria),
  );
}

export function countLowStock(items: StockItem[]): number {
  return items.filter((item) => getStockStatus(item) !== "OK").length;
}

// Valida o formulário de movimentação. Devolve um objeto com as mensagens por campo.
export function validateMovement(
  form: MovementFormData,
  item: StockItem | undefined,
): Partial<Record<keyof MovementFormData, string>> {
  const erros: Partial<Record<keyof MovementFormData, string>> = {};
  const quantidade = Number(form.quantidade);

  if (!item) erros.itemId = "Selecione um item do estoque.";

  if (form.quantidade.trim() === "" || !Number.isInteger(quantidade) || quantidade <= 0) {
    erros.quantidade = "Informe uma quantidade inteira maior que zero.";
  } else if (form.tipo === "SAIDA" && item && quantidade > item.quantidade) {
    erros.quantidade = `Estoque insuficiente: saldo atual de ${item.quantidade} ${item.unidade}.`;
  }

  if (form.motivo.trim().length < 3) erros.motivo = "Informe o motivo (mínimo 3 caracteres).";

  return erros;
}

// Rota da API para cada tipo de movimentação
export function movementEndpoint(itemId: number, tipo: TipoMovimentacao): string {
  return `/estoque/itens/${itemId}/${tipo === "ENTRADA" ? "entrada" : "saida"}`;
}

// Extrai a mensagem de erro enviada pela API ({ error: "..." }) ou usa a mensagem padrão
export function getApiErrorMessage(error: unknown, padrao: string): string {
  const resposta = (error as { response?: { data?: { error?: unknown } } })?.response;
  const mensagem = resposta?.data?.error;
  return typeof mensagem === "string" && mensagem.trim() !== "" ? mensagem : padrao;
}
