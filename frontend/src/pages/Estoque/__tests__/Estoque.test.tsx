// Testes unitários da página de Gestão de Estoque.
// O cliente da API (api.ts) é simulado: nenhuma chamada real ao backend.
import { render, screen } from "@testing-library/react";
import api from "../../../api/api";
import Estoque from "..";

jest.mock("../../../api/api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock("react-toastify", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockedApi = api as jest.Mocked<typeof api>;

describe("Página Estoque", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem("idUsuario", "7");
  });

  test("CT-F19: carrega os itens pela API (GET /estoque/itens) ao abrir a página", async () => {
    mockedApi.get.mockResolvedValue({
      data: [{ id: 1, nome: "Papel lençol", categoria: "CONSUMO", unidade: "rolo", quantidade: 8, estoque_minimo: 4, situacao: "OK" }],
    });

    render(<Estoque />);

    expect(await screen.findByText("Papel lençol")).toBeInTheDocument();
    expect(mockedApi.get).toHaveBeenCalledWith("/estoque/itens");
    expect(screen.getByRole("heading", { name: "Gestão de Estoque" })).toBeInTheDocument();
  });

  test("CT-F20: mostra aviso quando a API está fora do ar", async () => {
    mockedApi.get.mockRejectedValue(new Error("Network Error"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    render(<Estoque />);

    expect(await screen.findByText("Não foi possível carregar o estoque.")).toBeInTheDocument();
  });
});
