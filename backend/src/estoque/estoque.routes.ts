// Rotas HTTP do módulo de estoque.
// A função recebe o service pronto, então os testes podem usar um repositório falso.
import { Router, type Request, type Response } from "express";
import type { EstoqueService } from "./estoque.service";
import { EstoqueErro } from "./estoque.types";

function tratarErro(res: Response, erro: unknown) {
  if (erro instanceof EstoqueErro) {
    return res.status(erro.status).json({ error: erro.message });
  }
  console.error(erro);
  return res.status(500).json({ error: "Erro interno ao processar o estoque." });
}

export function criarRotasEstoque(service: EstoqueService): Router {
  const router = Router();

  router.get("/itens", async (_req: Request, res: Response) => {
    try {
      res.json(await service.listarItens());
    } catch (erro) {
      tratarErro(res, erro);
    }
  });

  router.get("/alertas", async (_req: Request, res: Response) => {
    try {
      res.json(await service.listarAlertas());
    } catch (erro) {
      tratarErro(res, erro);
    }
  });

  router.post("/itens", async (req: Request, res: Response) => {
    try {
      const item = await service.criarItem(req.body);
      res.status(201).json({ mensagem: "Item cadastrado no estoque!", data: item });
    } catch (erro) {
      tratarErro(res, erro);
    }
  });

  router.post("/itens/:id/entrada", async (req: Request, res: Response) => {
    try {
      const { quantidade, motivo, usuario_id } = req.body;
      const resultado = await service.registrarEntrada(Number(req.params.id), quantidade, motivo, usuario_id);
      res.status(201).json({ mensagem: "Entrada registrada!", data: resultado });
    } catch (erro) {
      tratarErro(res, erro);
    }
  });

  router.post("/itens/:id/saida", async (req: Request, res: Response) => {
    try {
      const { quantidade, motivo, usuario_id } = req.body;
      const resultado = await service.registrarSaida(Number(req.params.id), quantidade, motivo, usuario_id);
      res.status(201).json({ mensagem: "Saída registrada!", data: resultado });
    } catch (erro) {
      tratarErro(res, erro);
    }
  });

  router.post("/itens/:id/inventario", async (req: Request, res: Response) => {
    try {
      const { contagem_fisica, motivo, usuario_id } = req.body;
      const resultado = await service.ajustarInventario(
        Number(req.params.id),
        contagem_fisica,
        motivo,
        usuario_id,
      );
      res.json({ mensagem: "Inventário conferido!", data: resultado });
    } catch (erro) {
      tratarErro(res, erro);
    }
  });

  router.get("/itens/:id/movimentacoes", async (req: Request, res: Response) => {
    try {
      res.json(await service.historico(Number(req.params.id)));
    } catch (erro) {
      tratarErro(res, erro);
    }
  });

  return router;
}
