import { useState } from "react";
import type { ChangeEvent } from "react";
import { FaBoxOpen, FaExclamationTriangle } from "react-icons/fa";
import {
  CATEGORIA_LABEL,
  SITUACAO_LABEL,
  countLowStock,
  filterStockItems,
  getStockStatus,
} from "../../utils/estoque";
import type { Categoria, SituacaoEstoque, StockItem } from "../../utils/estoque";

interface StockListProps {
  items: StockItem[];
}

const corDaSituacao: Record<SituacaoEstoque, string> = {
  SEM_ESTOQUE: "bg-red-100 text-red-700",
  BAIXO: "bg-yellow-100 text-yellow-800",
  OK: "bg-green-100 text-green-700",
};

const StockList = ({ items }: StockListProps) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [categoria, setCategoria] = useState<Categoria | "TODAS">("TODAS");

  const filteredItems = filterStockItems(items, searchTerm, categoria);
  const totalAlertas = countLowStock(items);

  return (
    <div className="bg-white shadow rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-cyan-800 mb-4">Itens em estoque</h2>

      {/* alerta de reposição */}
      {totalAlertas > 0 && (
        <p role="alert" className="flex items-center gap-2 bg-yellow-50 text-yellow-800 p-3 rounded-lg mb-4">
          <FaExclamationTriangle />
          {totalAlertas === 1
            ? "1 item precisa de reposição."
            : `${totalAlertas} itens precisam de reposição.`}
        </p>
      )}

      {/* filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <label htmlFor="stockSearch" className="sr-only">
          Buscar item
        </label>
        <input
          id="stockSearch"
          type="text"
          value={searchTerm}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value)}
          placeholder="Buscar item pelo nome"
          className="border rounded-lg px-3 py-2 flex-1 focus:ring-2 focus:ring-cyan-600 outline-none"
        />

        <label htmlFor="stockCategory" className="sr-only">
          Categoria
        </label>
        <select
          id="stockCategory"
          value={categoria}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => setCategoria(event.target.value as Categoria | "TODAS")}
          className="border rounded-lg px-3 py-2"
        >
          <option value="TODAS">Todas as categorias</option>
          {Object.entries(CATEGORIA_LABEL).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </div>

      {/* lista */}
      {filteredItems.length > 0 ? (
        <ul className="divide-y divide-gray-200">
          {filteredItems.map((item) => {
            const situacao = getStockStatus(item);
            return (
              <li key={item.id} className="flex items-center justify-between py-3" data-testid="stock-item">
                <div className="flex items-center gap-3">
                  <div className="bg-cyan-100 text-cyan-700 p-3 rounded-full">
                    <FaBoxOpen size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{item.nome}</p>
                    <p className="text-sm text-gray-600">
                      {CATEGORIA_LABEL[item.categoria]} · mínimo {item.estoque_minimo} {item.unidade}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {item.quantidade} {item.unidade}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded-full ${corDaSituacao[situacao]}`}>
                    {SITUACAO_LABEL[situacao]}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-gray-500 text-center py-6">Nenhum item encontrado.</p>
      )}
    </div>
  );
};

export default StockList;
