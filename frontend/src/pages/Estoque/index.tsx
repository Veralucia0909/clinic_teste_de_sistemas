import { useCallback, useEffect, useState } from "react";
import api from "../../api/api";
import StockList from "../../components/StockList";
import StockMovementForm from "../../components/StockMovementForm";
import { getApiErrorMessage } from "../../utils/estoque";
import type { StockItem } from "../../utils/estoque";

const Estoque = () => {
  const [items, setItems] = useState<StockItem[]>([]);
  const [erro, setErro] = useState<string>("");

  // id do usuário logado (gravado no login): vai junto em cada movimentação
  const usuarioId = Number(localStorage.getItem("idUsuario")) || 0;

  // Busca os itens do estoque na API do backend (GET /estoque/itens)
  const fetchItems = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get<StockItem[]>("/estoque/itens");
      setItems(response.data);
      setErro("");
    } catch (error) {
      console.error("Erro ao obter itens do estoque:", error);
      setErro(getApiErrorMessage(error, "Não foi possível carregar o estoque."));
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  return (
    <div className="w-full space-y-6">
      <h1 className="text-2xl font-bold text-cyan-800">Gestão de Estoque</h1>
      {erro && (
        <p role="alert" className="bg-red-100 text-red-700 p-3 rounded-lg">
          {erro}
        </p>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StockList items={items} />
        <StockMovementForm items={items} usuarioId={usuarioId} onSaved={fetchItems} />
      </div>
    </div>
  );
};

export default Estoque;
