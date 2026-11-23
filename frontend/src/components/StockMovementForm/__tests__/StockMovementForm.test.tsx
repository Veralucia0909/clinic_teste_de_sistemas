// Testes unitários do formulário de movimentação (entrada/saída).
// O cliente da API (api.ts) e o react-toastify são substituídos por mocks:
// nenhuma chamada real ao backend é feita.
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "react-toastify";
import api from "../../../api/api";
import StockMovementForm from "..";
import type { StockItem } from "../../../utils/estoque";

jest.mock("../../../api/api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock("react-toastify", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockedApi = api as jest.Mocked<typeof api>;

const itens: StockItem[] = [
  { id: 2, nome: "Dipirona 500mg", categoria: "MEDICAMENTO", unidade: "caixa", quantidade: 3, estoque_minimo: 5 },
];

async function preencher(user: ReturnType<typeof userEvent.setup>, tipo: "ENTRADA" | "SAIDA", quantidade: string, motivo: string) {
  await user.selectOptions(screen.getByLabelText("Item"), "2");
  await user.selectOptions(screen.getByLabelText("Tipo"), tipo);
  await user.type(screen.getByLabelText("Quantidade"), quantidade);
  await user.type(screen.getByLabelText("Motivo"), motivo);
  await user.click(screen.getByRole("button", { name: "Registrar" }));
}

describe("StockMovementForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.post.mockResolvedValue({ data: {} });
  });

  test("CT-F14: mostra as mensagens de erro e não chama a API com o formulário vazio", async () => {
    const user = userEvent.setup();
    render(<StockMovementForm items={itens} usuarioId={7} onSaved={jest.fn()} />);

    await user.click(screen.getByRole("button", { name: "Registrar" }));

    expect(screen.getByText("Selecione um item do estoque.")).toBeInTheDocument();
    expect(screen.getByText("Informe uma quantidade inteira maior que zero.")).toBeInTheDocument();
    expect(screen.getByText("Informe o motivo (mínimo 3 caracteres).")).toBeInTheDocument();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  test("CT-F15: bloqueia saída maior que o saldo antes de chamar a API", async () => {
    const user = userEvent.setup();
    render(<StockMovementForm items={itens} usuarioId={7} onSaved={jest.fn()} />);

    await preencher(user, "SAIDA", "4", "Uso no consultório");

    expect(screen.getByText("Estoque insuficiente: saldo atual de 3 caixa.")).toBeInTheDocument();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  test("CT-F16: entrada válida chama POST /estoque/itens/:id/entrada e avisa a página", async () => {
    const user = userEvent.setup();
    const onSaved = jest.fn();
    render(<StockMovementForm items={itens} usuarioId={7} onSaved={onSaved} />);

    await preencher(user, "ENTRADA", "10", "Compra NF 1234");

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(mockedApi.post).toHaveBeenCalledWith("/estoque/itens/2/entrada", {
      quantidade: 10,
      motivo: "Compra NF 1234",
      usuario_id: 7,
    });
    expect(toast.success).toHaveBeenCalledWith("Entrada registrada!");
  });

  test("CT-F17: saída válida chama POST /estoque/itens/:id/saida e limpa o formulário", async () => {
    const user = userEvent.setup();
    render(<StockMovementForm items={itens} usuarioId={7} onSaved={jest.fn()} />);

    await preencher(user, "SAIDA", "3", "Sala de curativos");

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Saída registrada!"));
    expect(mockedApi.post).toHaveBeenCalledWith("/estoque/itens/2/saida", expect.objectContaining({ quantidade: 3 }));
    expect(screen.getByLabelText("Motivo")).toHaveValue("");
  });

  test("CT-F18: erro devolvido pela API aparece para o usuário e a página não é avisada", async () => {
    mockedApi.post.mockRejectedValue({ response: { status: 422, data: { error: "Estoque insuficiente: saldo de 3 caixa, saída solicitada de 3." } } });
    jest.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    const onSaved = jest.fn();
    render(<StockMovementForm items={itens} usuarioId={7} onSaved={onSaved} />);

    await preencher(user, "SAIDA", "3", "Uso");

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Estoque insuficiente: saldo de 3 caixa, saída solicitada de 3."),
    );
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Registrar" })).toBeEnabled();
  });
});
