// Testes unitários do cliente da API (integração front-end ↔ back-end)
import type { InternalAxiosRequestConfig } from "axios";
import { AxiosHeaders } from "axios";
import api, { API_URL } from "../api";

// pega a função que roda antes de cada requisição (interceptor de request)
const antesDaRequisicao = (api.interceptors.request as unknown as {
  handlers: { fulfilled: (c: InternalAxiosRequestConfig) => InternalAxiosRequestConfig }[];
}).handlers[0].fulfilled;

// e a que roda depois de cada resposta (interceptor de response)
const depoisDaResposta = (api.interceptors.response as unknown as {
  handlers: { fulfilled: (r: unknown) => unknown; rejected: (e: unknown) => Promise<unknown> }[];
}).handlers[0];

describe("api.ts", () => {
  beforeEach(() => localStorage.clear());

  test("CT-F23: aponta para o backend na porta 3000", () => {
    expect(api.defaults.baseURL).toBe(API_URL);
    expect(API_URL).toBe("http://localhost:3000");
  });

  test("CT-F24: envia o token JWT do login no cabeçalho Authorization", () => {
    localStorage.setItem("tokenAcesso", "abc.def.ghi");
    const config = antesDaRequisicao({ headers: new AxiosHeaders() } as InternalAxiosRequestConfig);
    expect(config.headers.Authorization).toBe("Bearer abc.def.ghi");
  });

  test("CT-F25: sem login, a requisição sai sem cabeçalho Authorization", () => {
    const config = antesDaRequisicao({ headers: new AxiosHeaders() } as InternalAxiosRequestConfig);
    expect(config.headers.Authorization).toBeUndefined();
  });

  test("CT-F28: resposta de sucesso passa direto e erro que não é token expirado chega à tela", async () => {
    const resposta = { status: 200, data: [] };
    expect(depoisDaResposta.fulfilled(resposta)).toBe(resposta);

    const erro = { response: { status: 422, data: { error: "Estoque insuficiente" } } };
    await expect(depoisDaResposta.rejected(erro)).rejects.toBe(erro);
  });
});
