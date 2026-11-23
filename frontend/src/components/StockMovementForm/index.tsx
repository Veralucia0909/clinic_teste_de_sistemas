import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import api from "../../api/api";
import { toast } from "react-toastify";
import { getApiErrorMessage, movementEndpoint, validateMovement } from "../../utils/estoque";
import type { MovementFormData, StockItem } from "../../utils/estoque";

interface StockMovementFormProps {
  items: StockItem[];
  usuarioId: number; // id do usuário logado, devolvido pela API no login
  onSaved: () => void; // avisa a página para recarregar a lista
}

const createInitialForm = (): MovementFormData => ({
  itemId: "",
  tipo: "ENTRADA",
  quantidade: "",
  motivo: "",
});

const StockMovementForm = ({ items, usuarioId, onSaved }: StockMovementFormProps) => {
  const [formData, setFormData] = useState<MovementFormData>(createInitialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof MovementFormData, string>>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = event.target;
    setFormData((anterior) => ({ ...anterior, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const item = items.find((i) => String(i.id) === formData.itemId);
    const validationErrors = validateMovement(formData, item);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0 || !item) return;

    try {
      setIsSaving(true);

      // A API valida de novo, atualiza o saldo e grava a movimentação (rastreabilidade)
      await api.post(movementEndpoint(item.id, formData.tipo), {
        quantidade: Number(formData.quantidade),
        motivo: formData.motivo.trim(),
        usuario_id: usuarioId,
      });

      toast.success(formData.tipo === "ENTRADA" ? "Entrada registrada!" : "Saída registrada!");
      setFormData(createInitialForm());
      onSaved();
    } catch (error) {
      console.error("Erro ao registrar movimentação:", error);
      // mostra a mensagem da API quando houver (ex.: 422 "Estoque insuficiente...")
      toast.error(getApiErrorMessage(error, "Erro ao registrar movimentação de estoque!"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="bg-white shadow rounded-2xl p-6 space-y-4">
      <h2 className="text-xl font-semibold text-cyan-800">Registrar movimentação</h2>

      <div>
        <label htmlFor="itemId" className="block text-sm font-medium mb-1">
          Item
        </label>
        <select
          id="itemId"
          name="itemId"
          value={formData.itemId}
          onChange={handleChange}
          className="w-full border p-2 rounded-lg"
        >
          <option value="">Selecione...</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nome} (saldo: {item.quantidade})
            </option>
          ))}
        </select>
        {errors.itemId && <p className="text-red-600 text-sm mt-1">{errors.itemId}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="tipo" className="block text-sm font-medium mb-1">
            Tipo
          </label>
          <select id="tipo" name="tipo" value={formData.tipo} onChange={handleChange} className="w-full border p-2 rounded-lg">
            <option value="ENTRADA">Entrada</option>
            <option value="SAIDA">Saída</option>
          </select>
        </div>

        <div>
          <label htmlFor="quantidade" className="block text-sm font-medium mb-1">
            Quantidade
          </label>
          <input
            id="quantidade"
            name="quantidade"
            type="number"
            min={1}
            value={formData.quantidade}
            onChange={handleChange}
            className="w-full border p-2 rounded-lg"
          />
          {errors.quantidade && <p className="text-red-600 text-sm mt-1">{errors.quantidade}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="motivo" className="block text-sm font-medium mb-1">
          Motivo
        </label>
        <input
          id="motivo"
          name="motivo"
          type="text"
          value={formData.motivo}
          onChange={handleChange}
          placeholder="Ex.: Compra NF 1234 / Uso no consultório 2"
          className="w-full border p-2 rounded-lg"
        />
        {errors.motivo && <p className="text-red-600 text-sm mt-1">{errors.motivo}</p>}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 bg-cyan-700 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 transition"
        >
          {isSaving ? "Salvando..." : "Registrar"}
        </button>
      </div>
    </form>
  );
};

export default StockMovementForm;
