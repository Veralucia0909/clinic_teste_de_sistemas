// Cadastra itens de exemplo no estoque pela API (o back-end precisa estar rodando).
// Uso: node scripts/itens-exemplo.mjs email senha
const API = "http://localhost:3000";
const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.log("Uso: node scripts/itens-exemplo.mjs email senha");
  process.exit(1);
}

const login = await fetch(`${API}/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const dados = await login.json();
if (!login.ok) {
  console.log("Falha no login:", dados);
  process.exit(1);
}
const token = dados.data.tokenAcesso;

const itens = [
  { nome: "Dipirona 500mg", categoria: "MEDICAMENTO", unidade: "caixa", quantidade: 3, estoque_minimo: 5, data_validade: "2027-03-31" },
  { nome: "Insulina NPH", categoria: "MEDICAMENTO", unidade: "frasco", quantidade: 8, estoque_minimo: 4, data_validade: "2026-12-10" },
  { nome: "Luva de procedimento M", categoria: "INSUMO", unidade: "caixa", quantidade: 12, estoque_minimo: 5 },
  { nome: "Seringa 5ml", categoria: "INSUMO", unidade: "unidade", quantidade: 0, estoque_minimo: 20 },
  { nome: "Gaze estéril", categoria: "MATERIAL", unidade: "pacote", quantidade: 25, estoque_minimo: 10 },
  { nome: "Álcool 70%", categoria: "CONSUMO", unidade: "frasco", quantidade: 2, estoque_minimo: 6 },
  { nome: "Papel lençol", categoria: "CONSUMO", unidade: "rolo", quantidade: 8, estoque_minimo: 4 },
];

for (const item of itens) {
  const r = await fetch(`${API}/estoque/itens`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(item),
  });
  const corpo = await r.json();
  console.log(`${r.status === 201 ? "✔ cadastrado" : "• " + r.status}  ${item.nome}${r.status === 201 ? "" : " – " + (corpo.error ?? "")}`);
}
console.log("Pronto! Atualize a tela de Estoque no navegador.");
