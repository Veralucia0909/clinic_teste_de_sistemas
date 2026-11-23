// Cliente HTTP do sistema Clinic: todas as telas integradas falam com a API
// (backend Express na porta 3000). Mesmo padrão do api.ts do repositório
// Alekmz/clinic_backend_2025-2: envia o token JWT e renova o token expirado.
import axios from "axios";

export const API_URL = "http://localhost:3000";

const api = axios.create({
  baseURL: API_URL,
});

// Antes de cada requisição: envia o token de acesso guardado no login
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("tokenAcesso");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Depois de cada resposta: se o token expirou, pede um novo e repete a requisição
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && error.response.data?.error === "expired token") {
      const tokenRefresh = localStorage.getItem("tokenRefresh");
      const response = await axios.get(`${API_URL}/renovar-token`, { params: { token: tokenRefresh } });
      const novoToken = response.data.data.tokenAcesso;
      localStorage.setItem("tokenAcesso", novoToken);
      error.config.headers.Authorization = `Bearer ${novoToken}`;
      return axios(error.config);
    }
    return Promise.reject(error);
  },
);

export default api;
