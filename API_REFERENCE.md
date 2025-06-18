# API Reference – conViver

> Prefixo de rota: `/api/v1`  
> Todos os endpoints REST usam JSON e exigem header `Authorization: Bearer <token>` (exceto rotas públicas de auth).

---

## 1. Autenticação & Usuários

### 1.1. **POST** `/auth/signup`

**Descrição**: Registra um novo usuário (condômino, síndico ou operador, conforme convite).  
**Acesso**: Público  
**Request Body**

````json
{
  "nome": "string",
  "email": "string (email único)",
  "senha": "string (≥8 chars)",
  "confirmaSenha": "string (opcional)",
  "perfil": "super-admin|administradora|sindico|porteiro|condomino|contador",
  "condominioId": "uuid (se aplicável)"
}

Response 201
{
  "userId": "uuid",
  "email": "string",
  "perfil": "string",
  "condominioId": "uuid|null"
}

Erros Comuns

400 INVALID_PAYLOAD – JSON inválido ou campos ausentes 
422 VALIDATION_ERROR – email já cadastrado, senha fraca 

1.2. POST /auth/login
Descrição: Autentica usuário e retorna tokens JWT.
Acesso: Público
Request Body
{
  "email": "string",
  "senha": "string"
}

Response 200
{
  "accessToken": "string (JWT, exp 15min)",
  "refreshToken": "string (exp 14d)"
}

Erros Comuns

400 INVALID_PAYLOAD 
401 INVALID_CREDENTIALS – credenciais incorretas 
403 USER_BLOCKED – usuário bloqueado 

1.3. POST /auth/refresh
Descrição: Gera novo par de tokens dado um refreshToken válido.
Acesso: Público
Request Body
{ "refreshToken": "string" }

Response 200
{
  "accessToken": "string",
  "refreshToken": "string"
}

Erros

401 INVALID_REFRESH_TOKEN 

1.4. GET /auth/me
Descrição: Retorna dados do usuário logado.
Acesso: Qualquer usuário autenticado
Response 200
{
  "userId": "uuid",
  "nome": "string",
  "email": "string",
  "perfil": "string",
  "condominioId": "uuid|null"
}


1.5. POST /auth/forgot-password
Descrição: Inicia fluxo de redefinição de senha.
Acesso: Público
Request Body
{ "email": "string" }

Response 202 – token de reset enviado por e-mail (não retorna conteúdo).

1.6. POST /auth/reset-password
Descrição: Redefine senha usando token.
Acesso: Público
Request Body
{
  "token": "string",
  "novaSenha": "string (≥8 chars)",
  "confirmaSenha": "string"
}

Response 200

1.7. POST /auth/enable-2fa
Descrição: Ativa autenticação TOTP; retorna QR provisioning.
Acesso: Usuário autenticado
Response 200
{ "qrCode": "data:image/png;base64,..." }


1.8. POST /auth/verify-2fa
Descrição: Verifica código TOTP e finaliza ativação 2FA.
Acesso: Usuário autenticado
Headers: X-2FA-Code: 123456
Response 200

2. Condomínios

Prefixo: /adm/condominios

2.1. GET /adm/condominios
Descrição: Lista condomínios cadastrados.
Acesso: Super-Admin, Administradora
Query Params:

page (int), size (int), search (string)
Response 200 
{
  "total": 123,
  "items": [
    { "id":"uuid","nome":"string","cnpj":"string",… },
    …
  ]
}


2.2. POST /adm/condominios
Descrição: Cria novo condomínio.
Acesso: Super-Admin
Request Body
{
  "nome": "string",
  "cnpj": "string",
  "endereco": {
    "logradouro":"string","numero":"string","bairro":"string",
    "cidade":"string","uf":"string","cep":"string"
  }
}

Response 201
{ "id":"uuid","nome":"string",… }


2.3. GET /adm/condominios/{id}
Descrição: Detalhes de um condomínio.
Acesso: Super-Admin, Administradora (se vinculada)
Response 200
{
  "id":"uuid",
  "nome":"string",
  "cnpj":"string",
  "endereco":{…},
  "regraCobranca":{…},
  "métricas":{ "inadimplencia":0.05, "saldoCaixa":12345.67 }
}


2.4. PUT /adm/condominios/{id}
Descrição: Atualiza dados do condomínio.
Acesso: Super-Admin
Request Body: mesmos campos do POST
Response 200

2.5. DELETE /adm/condominios/{id}
Descrição: Soft-delete do condomínio (marca ativo=false).
Acesso: Super-Admin
Response 204

3. Unidades & Membros

Prefixo: /syndic/units e /syndic/members

3.1. GET /syndic/units
Descrição: Lista unidades do condomínio do síndico.
Acesso: Síndico
Response 200
[ { "id":"uuid","identificacao":"A101","fracaoIdeal":0.025,… }, … ]


3.2. POST /syndic/units
Descrição: Cria nova unidade.
Acesso: Síndico
Request Body
{ "identificacao":"string","fracaoIdeal":0.025,"tipo":"residencial|comercial" }

Response 201

3.3. GET /syndic/units/{id}
Descrição: Detalhes da unidade, boletos e membros.
Acesso: Síndico
Response 200
{
  "id":"uuid","identificacao":"string","membros":[…],"boletos":[…]
}


3.4. PUT /syndic/units/{id}
Descrição: Atualiza dados da unidade.
Acesso: Síndico
Request Body: mesmos campos do POST
Response 200

3.5. DELETE /syndic/units/{id}
Descrição: Remove unidade (só se sem boletos).
Acesso: Síndico
Response 204

3.6. POST /syndic/units/{id}/members
Descrição: Víncula um usuário à unidade (status = pendente).
Acesso: Síndico
Request Body
{ "usuarioId":"uuid","papel":"proprietario|inquilino" }

Response 201

3.7. PUT /syndic/members/{memberId}
Descrição: Aprova ou bloqueia membro.
Acesso: Síndico
Request Body
{ "status":"aprovado|bloqueado" }

Response 200

3.8. DELETE /syndic/members/{memberId}
Descrição: Desvincula usuário da unidade.
Acesso: Síndico
Response 204

4. Boletos & Financeiro

Prefixos: /adm/finance e /syndic/finance

4.1. POST /adm/finance/batch
Descrição: Gera lote de boletos mensal.
Acesso: Administradora
Request Body
{ "mesAno":"YYYY-MM","condominioId":"uuid" }

Response 202
{ "batchId":"uuid","totalGerados":123 }


4.2. GET /syndic/finance/boletos
Descrição: Filtra boletos do condomínio.
Acesso: Síndico
Query Params:
status, vencimentoFrom=YYYY-MM-DD, vencimentoTo=YYYY-MM-DD, page, size
Response 200
{
 "total": 50,
 "items": [ { "id":"uuid","valor":100.00,"status":"pago",… }, … ]
}


4.3. POST /syndic/finance/boletos
Descrição: Gera boleto avulso (taxas extras).
Acesso: Síndico
Request Body
{
  "unidadeId":"uuid",
  "valor":123.45,
  "dataVencimento":"YYYY-MM-DD",
  "descricao":"string"
}

Response 201
{ "id":"uuid","linhaDigitavel":"string","brCode":"string" }


4.4. GET /syndic/finance/boletos/{id}
Descrição: Baixa PDF base64 + QR-Pix.
Acesso: Síndico / Condômino dono
Response 200
{
  "pdfBase64":"string",
  "brCode":"string",
  "metadados": { "valor":100.00, "status":"gerado", … }
}


4.5. PUT /syndic/finance/boletos/{id}/cancel
Descrição: Cancela boleto (se Gerado/Registrado).
Acesso: Síndico
Response 200

4.6. POST /syndic/finance/boletos/{id}/resend
Descrição: Reenvia e-mail/app com 2ª via.
Acesso: Síndico
Response 202

5. Pagamentos & Webhook
5.1. POST /finance/callback
Descrição: Webhook bancário para baixa automática.
Acesso: Banco (IP whitelist)
Request Body
{
  "nossoNumero":"string",
  "dataPagamento":"YYYY-MM-DD",
  "valorPago":123.45,
  "traceId":"uuid"
}

Response 200 – retorno vazio.

5.2. POST /syndic/finance/manual-payment
Descrição: Registra pagamento manual (Pix/caixa).
Acesso: Síndico
Request Body
{ "boletoId":"uuid","valor":100.00,"dataPagamento":"YYYY-MM-DD" }

Response 201
{ "pagamentoId":"uuid","status":"confirmado" }


5.3. POST /adm/finance/refund
Descrição: Solicita estorno de pagamento.
Acesso: Administradora
Request Body
{ "pagamentoId":"uuid","motivo":"string" }

Response 202 – estorno em background.

5.4. POST /syndic/finance/installment-plan
Descrição: Cria acordo de inadimplência.
Acesso: Síndico
Request Body
{
  "unidadeId":"uuid",
  "entrada":50.00,
  "parcelas":6
}

Response 201
{ "acordoId":"uuid","parcelasCriadas":6 }


5.5. GET /syndic/finance/installment-plan/{id}
Descrição: Detalhes do acordo + suas parcelas.
Acesso: Síndico
Response 200
{
  "id":"uuid",
  "valorTotal":600.00,
  "entrada":50.00,
  "parcelas":[
    { "numero":1,"valor":91.67,"vencimento":"YYYY-MM-DD","pago":false },
    …
  ]
}


## 6. Reservas & Agenda de Áreas Comuns

> Prefixos: `/app/reservas` (condômino) e `/syndic/reservas` (síndico)

### 6.1 **GET** `/app/reservas/agenda?mesAno=YYYY-MM`
**Acesso**: Condômino, Síndico
**Descrição**: Retorna todas as reservas do mês para todas as áreas.
**Response 200**
```json
[
  {
    "id": "uuid",
    "area": "Salão de Festas",
    "inicio": "2025-07-10T14:00:00-03:00",
    "fim": "2025-07-10T18:00:00-03:00",
    "status": "aprovada",
    "unidadeId": "uuid"
  },
  …
]

6.2 POST /app/reservas
Acesso: Condômino
Descrição: Solicita nova reserva.
Request Body
{
  "area": "Churrasqueira",
  "inicio": "2025-07-15T10:00:00-03:00",
  "fim": "2025-07-15T13:00:00-03:00"
}

Response 201
{ "id": "uuid", "status": "pendente" }

6.3 PUT /syndic/reservas/{id}
Acesso: Síndico
Descrição: Aprova ou recusa reserva.
Request Body
{ "status": "aprovada|recusada" }

Response 200
6.4 DELETE /app/reservas/{id}
Acesso: Condômino
Descrição: Cancela reserva (até X h antes).
Response 204

7. Avisos (Mural Digital)

Prefixos: /syndic/avisos e /app/avisos

7.1 POST /syndic/avisos
Acesso: Síndico
Descrição: Publica novo aviso.
Request Body
{
  "titulo": "Manutenção Elevador",
  "corpo": "Elevador A ficará fora do ar das 9h às 12h.",
  "categoria": "manutencao"
}

Response 201
{ "id": "uuid", "publicadoEm": "2025-06-16T09:00:00-03:00" }

7.2 GET /app/avisos?page=1&size=10&categoria=manutencao
Acesso: Condômino
Descrição: Lista avisos com paginação e filtro.
Response 200
{ "total": 5, "items": [ { "id":"uuid","titulo":"...","categoria":"..." }, … ] }

7.3 PUT /syndic/avisos/{id}
Acesso: Síndico
Descrição: Edita um aviso publicado.
Request Body: mesmos campos do POST
Response 200
7.4 DELETE /syndic/avisos/{id}
Acesso: Síndico
Descrição: Arquiva aviso (soft delete).
Response 204

8. Chamados & Help-desk

Prefixos: /app/chamados e /syndic/chamados

8.1 POST /app/chamados
Acesso: Condômino
Descrição: Abre novo chamado.
Request Body
{
  "titulo": "Lampada queimada",
  "descricao": "Sala 201 corredor, lâmpada pifou.",
  "fotos": ["base64string", …]
}

Response 201
{ "id": "uuid", "status": "aberto" }

8.2 GET /app/chamados?status=aberto
Acesso: Condômino
Descrição: Lista os próprios chamados.
Response 200
[ { "id":"uuid","titulo":"...","status":"aberto" }, … ]

8.3 GET /syndic/chamados?status=open|progress|done
Acesso: Síndico
Descrição: Kanban de chamados.
Response 200
{
  "open": [ … ],
  "progress": [ … ],
  "done": [ … ]
}

8.4 PUT /syndic/chamados/{id}
Acesso: Síndico
Descrição: Atualiza status e responde.
Request Body
{ "status":"em_andamento|concluido", "resposta":"string" }

Response 200
8.5 POST /app/chamados/{id}/avaliar
Acesso: Condômino
Descrição: Avalia a solução (1–5).
Request Body
{ "nota": 4, "comentario": "Muito ágil!" }

Response 201

9. Portaria – Visitantes

Prefixo: /gate/visitantes e /app/visitantes

9.1 POST /gate/visitantes
Acesso: Porteiro
Descrição: Registra chegada.
Request Body
{
  "nome":"João Silva",
  "documento":"12345678900",
  "unidadeId":"uuid",
  "fotoUrl":"https://..."
}

Response 201
{ "id":"uuid","dataChegada":"2025-06-16T10:00:00-03:00" }

9.2 PUT /gate/visitantes/saida/{id}
Acesso: Porteiro
Descrição: Marca saída.
Response 200
{ "dataSaida":"2025-06-16T12:30:00-03:00" }

9.3 POST /app/visitantes/preauth
Acesso: Condômino
Descrição: Pré-autoriza visitante gerando QR.
Request Body
{ "nome":"Maria", "documento":"98765432100", "unidadeId":"uuid" }

Response 201
{ "qrCode":"data:image/png;base64,..." }

9.4 GET /syndic/visitantes?from=YYYY-MM-DD&to=YYYY-MM-DD
Acesso: Síndico
Descrição: Consulta histórico.
Response 200
[ { "id":"uuid","nome":"...","dataChegada":"..." }, … ]


10. Portaria – Encomendas

Prefixos: /gate/encomendas, /app/encomendas, /syndic/encomendas

10.1 POST /gate/encomendas
Acesso: Porteiro
Descrição: Registra chegada de encomenda.
Request Body
{
  "unidadeId":"uuid",
  "descricao":"Pacote Sedex",
  "fotoUrl":"https://..."
}

Response 201
{ "id":"uuid","recebidoEm":"2025-06-16T11:00:00-03:00" }

10.2 PUT /gate/encomendas/{id}/retirada
Acesso: Porteiro
Descrição: Confirma retirada pelo morador.
Request Body
{ "retiradoPor":"uuid" }

Response 200
{ "retiradoEm":"2025-06-16T15:00:00-03:00" }

10.3 GET /app/encomendas
Acesso: Condômino
Descrição: Lista encomendas da unidade.
Response 200
[ { "id":"uuid","status":"recebida" }, … ]

10.4 GET /syndic/encomendas?status=recebida|retirada
Acesso: Síndico
Descrição: Visão geral com filtros.
Response 200
[ { "id":"uuid","unidadeId":"...",… }, … ]


11. Prestadores & Ordens de Serviço
11.1 Prestadores

Prefixos: /syndic/prestadores e /app/prestadores

11.1.1 POST /syndic/prestadores
Acesso: Síndico
Request Body
{ "nome":"string","telefone":"string","especialidade":"string" }

Response 201
{ "id":"uuid","rating":null }

11.1.2 GET /app/prestadores
Acesso: Condômino
Query: ?especialidade=string&page&size
Response 200
{ "total":10,"items":[{"id":"uuid","nome":"...","rating":4.5},…] }

11.1.3 PUT /syndic/prestadores/{id}
Acesso: Síndico
Request Body: mesmos campos do POST
Response 200

11.2 Ordens de Serviço (OS)

Prefixos: /syndic/os e /prestador/os

11.2.1 POST /syndic/os
Acesso: Síndico
Request Body
{
  "unidadeId":"uuid",
  "prestadorId":"uuid",
  "descricao":"string",
  "prioridade":"baixa|media|alta"
}

Response 201
{ "id":"uuid","status":"aberta","criadoEm":"..." }

11.2.2 PUT /syndic/os/{id}
Acesso: Síndico
Request Body
{ "status":"em_andamento|concluida" }

Response 200
11.2.3 GET /prestador/os
Acesso: Prestador
Response 200
[ { "id":"uuid","descricao":"...","status":"aberta" }, … ]

11.2.4 PUT /prestador/os/{id}/atualizar
Acesso: Prestador
Request Body
{ "progresso":"string","fotos":[ "base64…", … ] }

Response 200

12. Biblioteca Documental

Prefixos: /syndic/docs e /app/docs

12.1 POST /syndic/docs
Acesso: Síndico
Content-Type: multipart/form-data
Form Data

file: PDF 
categoria: string 
titulo: string
Response 201 
{ "id":"uuid","url":"https://storage/...pdf" }

12.2 GET /app/docs
Acesso: Condômino
Response 200
[ { "id":"uuid","categoria":"atas","titulo":"...", "url":"..." }, … ]

12.3 DELETE /syndic/docs/{id}
Acesso: Síndico
Response 204

13. Relatórios & KPIs

Prefixos: /syndic/reports, /accountant/reports, /admin/reports

13.1 GET /syndic/reports/balancete?mes=YYYY-MM
Acesso: Síndico, Contador
Response 200

JSON + header Content-Disposition: attachment; filename="balancete-YYYY-MM.csv" 
13.2 GET /accountant/reports/dirf?ano=2025
Acesso: Contador
Response 200 – PDF binário
13.3 GET /syndic/reports/dashboard
Acesso: Síndico
Response 200
{
  "inadimplencia": 0.04,
  "saldoCaixa": 12345.67,
  "reservasHoje": 3,
  "chamadosAbertos": 5
}

13.4 GET /admin/reports/global
Acesso: Super-Admin
Response 200 – métricas agregadas multi-condomínio

14. Configurações & Parametrizações

Prefixos: /syndic/settings e /admin/settings/psp

14.1 GET /syndic/settings/cobranca
Acesso: Síndico
Response 200
{
  "diaVencimento": 5,
  "multaPercent": 2.0,
  "jurosDiaPercent": 0.033,
  "enviarEmail": true,
  "enviarWhatsApp": false,
  "descontoPontualidade": 5.0
}

14.2 PUT /syndic/settings/cobranca
Acesso: Síndico
Request Body: mesmos campos do GET
Response 200
14.3 GET /syndic/settings/reservas
Acesso: Síndico
Response 200
{ "maxSimultaneas": 2, "horarioInicio": "08:00", "horarioFim":"22:00" }

14.4 PUT /syndic/settings/reservas
Acesso: Síndico
Request Body: mesmos campos do GET
Response 200
14.5 GET /syndic/settings/notificacoes
Acesso: Síndico
Response 200
{ "push": true, "email": true, "whatsapp": false }

14.6 PUT /syndic/settings/notificacoes
Acesso: Síndico
Request Body: mesmos campos do GET
Response 200
14.7 GET /admin/settings/psp
Acesso: Super-Admin
Response 200
{ "pixKey": "string", "webhookUrl": "string" }

14.8 PUT /admin/settings/psp
Acesso: Super-Admin
Request Body: mesmos campos do GET
Response 200

15. Notificações & Tempo-Real
15.1 POST /app/notify/subscribe
Acesso: Qualquer usuário logado
Request Body
{ "token": "FCM/APNS token" }

Response 201
15.2 WebSocket / SignalR
Endpoint: wss://<baseUrl>/ws
Protocol: Sec-WebSocket-Protocol: bearer,<JWT>
Hubs:

/ws/dashboard (síndico) → eventos kpiUpdate 
/ws/gate (porteiro) → visitorArrived 
/ws/notify (condômino) → newAviso, reservaStatus 

Códigos de Erro Padrão
HTTP	Code	Descrição
400	INVALID_PAYLOAD	JSON malformado
401	INVALID_CREDENTIALS	Auth falhou
403	FORBIDDEN	Sem permissão
404	NOT_FOUND	Recurso não existe
409	BUSINESS_RULE_VIOLATION	Violação de regra (ex.: já cancelado)
422	VALIDATION_ERROR	Falha em validações de campo



Fim do API Reference – conViver
Para exemplos de uso, integre com o Swagger UI disponível em /swagger.
Qualquer dúvida, consulte o API_TESTS em tests/Integration.


````
