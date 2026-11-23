# Clinic – Módulo de Gestão de Estoque com testes unitários (Jest)

**Situação de Aprendizagem – Teste de Sistemas** · Técnico em Desenvolvimento de Sistemas, 3ª fase · Aluna: Vera Lúcia Paula de Lima

Sistema web da clínica com **front-end e back-end integrados pela API** e o novo **módulo de Gestão de Estoque**. O módulo foi planejado, testado com Jest e documentado: são **58 testes unitários, todos aprovados**, mais um teste de integração com PostgreSQL e um teste pelo navegador.

## Estrutura

```
clinic/
├── backend/    API Express + TypeScript + Prisma (PostgreSQL) + JWT  – porta 3000
├── frontend/   React + TypeScript + Vite + Tailwind                  – porta 5173
└── docs/
    ├── smoke-api.sh   teste de integração da API (backend + banco)
    └── evidencias/    saídas do Jest, do tsc, da API e capturas de tela
```

Projetos base (código dos professores): front-end [lucianorp/desi-senai-2026-2](https://github.com/lucianorp/desi-senai-2026-2) (`clinica-frontend`) e back-end [Alekmz/clinic_backend_2025-2](https://github.com/Alekmz/clinic_backend_2025-2) (`api_clinica`).

## Como o front-end e o back-end se conectam

| Tela / ação | Front-end | API (back-end) |
| --- | --- | --- |
| Login | `LoginForm` → `api.post("/login")`, guarda `tokenAcesso`, `tokenRefresh` e `idUsuario` | `POST /login` (JWT) |
| Criar conta | `RegisterUser` → `api.post("/cadastro")` | `POST /cadastro` (senha com bcrypt) |
| Lista de estoque | `pages/Estoque` → `api.get("/estoque/itens")` | `GET /estoque/itens` |
| Entrada / saída | `StockMovementForm` → `api.post("/estoque/itens/:id/entrada")` ou `/saida` | `POST /estoque/itens/:id/entrada` e `/saida` |
| Token expirado | `src/api/api.ts` renova o token sozinho | `GET /renovar-token` |

Todas as rotas `/estoque` exigem o token (`Authorization: Bearer ...`), enviado automaticamente pelo `src/api/api.ts`.

Outras rotas do estoque: `POST /estoque/itens` (cadastro, bloqueia nome duplicado), `GET /estoque/alertas` (reposição e validade), `POST /estoque/itens/:id/inventario` (ajuste pela contagem física) e `GET /estoque/itens/:id/movimentacoes` (histórico).

> As telas antigas de pacientes, prontuários e contadores do dashboard ainda usam o JSON Server. Ele passou para a **porta 3001**, para não conflitar com a API: `npm run server` na pasta `frontend`.

## Como rodar o sistema

Requisitos: Node.js 20+ e PostgreSQL 15+.

```bash
# 1) Back-end
cd backend
npm install
cp .env.example .env          # ajuste DATABASE_URL e CHAVE_SECRETA
npx prisma contract emit      # gera o contrato com os modelos ItemEstoque e MovimentacaoEstoque
npx prisma db init            # cria as tabelas no PostgreSQL
npm run dev                   # API em http://localhost:3000

# 2) Front-end (outro terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173
npm run server                # (opcional) JSON Server das telas antigas, porta 3001
```

Crie um usuário pela tela "Criar Conta" (ou `POST /cadastro`), faça login e abra **Estoque** no menu lateral.

## Como rodar os testes

```bash
cd backend  && npm test        # 30 testes (npm run test:coverage para cobertura)
cd frontend && npm test        # 28 testes (npm run test:coverage para cobertura)
bash docs/smoke-api.sh         # integração: precisa do backend e do banco rodando
```

| Parte | Testes | Aprovados | Cobertura de linhas |
| --- | --- | --- | --- |
| Back-end | 30 | 30 | 95,76% |
| Front-end | 28 | 28 | 88,61% |

O plano de testes, o roteiro e o registro completo dos resultados, incluindo as falhas encontradas no código existente, estão no documento da Situação de Aprendizagem.
