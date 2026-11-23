// Testes unitários do componente StockList (React Testing Library)
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StockList from "..";
import type { StockItem } from "../../../utils/estoque";

const itens: StockItem[] = [
  { id: 1, nome: "Luva de procedimento M", categoria: "INSUMO", unidade: "caixa", quantidade: 12, estoque_minimo: 5 },
  { id: 2, nome: "Dipirona 500mg", categoria: "MEDICAMENTO", unidade: "caixa", quantidade: 3, estoque_minimo: 5 },
  { id: 3, nome: "Seringa 5ml", categoria: "MATERIAL", unidade: "unidade", quantidade: 0, estoque_minimo: 20 },
];

describe("StockList", () => {
  test("CT-F09: mostra todos os itens com saldo e situação", () => {
    render(<StockList items={itens} />);

    const linhas = screen.getAllByTestId("stock-item");
    expect(linhas).toHaveLength(3);
    expect(within(linhas[0]).getByText("Luva de procedimento M")).toBeInTheDocument();
    expect(within(linhas[0]).getByText("Normal")).toBeInTheDocument();
    expect(within(linhas[1]).getByText("Estoque baixo")).toBeInTheDocument();
    expect(within(linhas[2]).getByText("Sem estoque")).toBeInTheDocument();
  });

  test("CT-F10: exibe alerta com a quantidade de itens para reposição", () => {
    render(<StockList items={itens} />);
    expect(screen.getByRole("alert")).toHaveTextContent("2 itens precisam de reposição.");
  });

  test("CT-F11: não exibe alerta quando todos os itens estão normais", () => {
    render(<StockList items={[itens[0]]} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("CT-F12: a busca pelo nome filtra a lista", async () => {
    const user = userEvent.setup();
    render(<StockList items={itens} />);

    await user.type(screen.getByPlaceholderText("Buscar item pelo nome"), "seringa");

    expect(screen.getAllByTestId("stock-item")).toHaveLength(1);
    expect(screen.getByText("Seringa 5ml")).toBeInTheDocument();
  });

  test("CT-F13: o filtro de categoria filtra a lista e mostra mensagem quando não há resultado", async () => {
    const user = userEvent.setup();
    render(<StockList items={itens} />);

    await user.selectOptions(screen.getByLabelText("Categoria"), "MEDICAMENTO");
    expect(screen.getAllByTestId("stock-item")).toHaveLength(1);

    await user.selectOptions(screen.getByLabelText("Categoria"), "CONSUMO");
    expect(screen.getByText("Nenhum item encontrado.")).toBeInTheDocument();
  });
});
