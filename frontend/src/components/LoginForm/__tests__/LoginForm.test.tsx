// Testes unitários do login integrado à API do backend (POST /login).
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { toast } from "react-toastify";
import api from "../../../api/api";
import LoginForm from "..";

const mockLogin = jest.fn();
const mockNavigate = jest.fn();

jest.mock("../../../api/api", () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock("react-toastify", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("react-router", () => ({ useNavigate: () => mockNavigate }));
jest.mock("../../../context/AuthContext", () => ({ useAuth: () => ({ login: mockLogin }) }));
// o modal de cadastro não faz parte deste teste
jest.mock("../../ui/Modal", () => ({ __esModule: true, default: ({ children }: { children: ReactNode }) => <>{children}</> }));
jest.mock("../../RegisterUser", () => ({ __esModule: true, default: () => null }));

const mockedApi = api as jest.Mocked<typeof api>;

async function entrar(email: string, senha: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email:"), email);
  await user.type(screen.getByLabelText("Senha:"), senha);
  await user.click(screen.getByRole("button", { name: /entrar/i }));
}

describe("LoginForm integrado à API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test("CT-F26: login válido guarda os tokens da API e entra no sistema", async () => {
    mockedApi.post.mockResolvedValue({
      data: { data: { tokenAcesso: "token-acesso", tokenRefresh: "token-refresh", idUsuario: 7 } },
    });
    render(<LoginForm />);

    await entrar("joao@email.com", "1234abcd");

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith("joao@email.com"));
    expect(mockedApi.post).toHaveBeenCalledWith("/login", { email: "joao@email.com", password: "1234abcd" });
    expect(localStorage.getItem("tokenAcesso")).toBe("token-acesso");
    expect(localStorage.getItem("tokenRefresh")).toBe("token-refresh");
    expect(localStorage.getItem("idUsuario")).toBe("7");
    expect(toast.success).toHaveBeenCalledWith("Login realizado com sucesso!", expect.anything());
  });

  test("CT-F27: senha errada (401 da API) mostra mensagem e não guarda tokens", async () => {
    mockedApi.post.mockRejectedValue(
      Object.assign(new Error("401"), { isAxiosError: true, response: { status: 401, data: { message: "Senha incorreta!" } } }),
    );
    render(<LoginForm />);

    await entrar("joao@email.com", "senhaerrada");

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Usuário não encontrado. Verifique o email e senha", expect.anything()),
    );
    expect(mockLogin).not.toHaveBeenCalled();
    expect(localStorage.getItem("tokenAcesso")).toBeNull();
  });
});
