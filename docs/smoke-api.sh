#!/usr/bin/env bash
# Teste de fumaça da integração: backend rodando (porta 3000) + PostgreSQL.
# Uso: bash docs/smoke-api.sh   (o usuário vera@clinic.com precisa existir: POST /cadastro)
U=http://localhost:3000; H='Content-Type: application/json'
echo "1) Login (POST /login)"
T=$(curl -s -X POST $U/login -H "$H" -d '{"email":"vera@clinic.com","password":"12345678"}' | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['tokenAcesso'])")
echo "   token recebido: ${T:0:20}..."
A="Authorization: Bearer $T"
echo "2) Estoque sem token (esperado 401)"; curl -s -w "  [HTTP %{http_code}]\n" $U/estoque/itens
echo "3) Cadastrar item (esperado 201)"; curl -s -w "  [HTTP %{http_code}]\n" -X POST $U/estoque/itens -H "$H" -H "$A" -d '{"nome":"Gaze estéril","categoria":"MATERIAL","unidade":"pacote","quantidade":5,"estoque_minimo":10}'
echo "4) Cadastrar o mesmo item de novo (esperado 409)"; curl -s -w "  [HTTP %{http_code}]\n" -X POST $U/estoque/itens -H "$H" -H "$A" -d '{"nome":"GAZE  ESTÉRIL","categoria":"MATERIAL","unidade":"pacote","estoque_minimo":10}'
ID=$(curl -s $U/estoque/itens -H "$A" | python3 -c "import json,sys;print([i['id'] for i in json.load(sys.stdin) if i['nome']=='Gaze estéril'][0])")
echo "5) Entrada de 20 (esperado 201, saldo 25)"; curl -s -w "  [HTTP %{http_code}]\n" -X POST $U/estoque/itens/$ID/entrada -H "$H" -H "$A" -d '{"quantidade":20,"motivo":"Compra NF 8890","usuario_id":1}'
echo "6) Saída de 30 (esperado 422)"; curl -s -w "  [HTTP %{http_code}]\n" -X POST $U/estoque/itens/$ID/saida -H "$H" -H "$A" -d '{"quantidade":30,"motivo":"Uso","usuario_id":1}'
echo "7) Inventário: contagem física 24 (esperado diferença -1)"; curl -s -w "  [HTTP %{http_code}]\n" -X POST $U/estoque/itens/$ID/inventario -H "$H" -H "$A" -d '{"contagem_fisica":24,"motivo":"Inventário mensal","usuario_id":1}'
echo "8) Histórico de movimentações"; curl -s $U/estoque/itens/$ID/movimentacoes -H "$A"; echo
echo "9) Login com senha errada (esperado 401, sem erro no servidor)"; curl -s -w "  [HTTP %{http_code}]\n" -X POST $U/login -H "$H" -d '{"email":"vera@clinic.com","password":"senhaerrada"}'
