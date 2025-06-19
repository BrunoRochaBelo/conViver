# API Reference – conViver

> Prefixo de rota: `/api/v1`  
> Todos os endpoints REST usam JSON e exigem header `Authorization: Bearer <token>` (exceto rotas públicas de auth).

---

## 1. Autenticação & Gerenciamento de Usuários

Endpoints gerenciados por `UsuariosController.cs`.

### 1.1. **POST** `/auth/signup`

**Descrição**: Registra um novo usuário na plataforma.
**Acesso**: Público
**Request Body** (`SignupRequestDto`)
```json
{
  "nome": "string (3-100 chars)",
  "email": "string (email único, max 100 chars)",
  "senha": "string (min 6 chars)"
}
```
**Response 201** (`SignupResponseDto`)
```json
{
  "id": "uuid",
  "email": "string",
  "perfil": "string (e.g., 'morador')"
}
```
**Erros Comuns**:
*   `400 Bad Request`: Dados de entrada inválidos (vide `ModelState`).
*   `409 Conflict`: `EMAIL_EXISTS` - O e-mail fornecido já está em uso.

### 1.2. **POST** `/auth/login`

**Descrição**: Autentica um usuário e retorna tokens de acesso.
**Acesso**: Público
**Request Body** (`LoginRequestDto`)
```json
{
  "email": "string",
  "senha": "string"
}
```
**Response 200** (`AuthResponseDto`)
```json
{
  "accessToken": "string (JWT)",
  "refreshToken": "string",
  "accessTokenExpiration": "datetime",
  "usuario": {
    "id": "uuid",
    "nome": "string",
    "email": "string",
    "perfil": "string",
    "condominioId": "uuid|null",
    "unidadeId": "uuid|null"
  }
}
```
**Erros Comuns**:
*   `400 Bad Request`: Dados de entrada inválidos.
*   `401 Unauthorized`: `INVALID_CREDENTIALS` - E-mail ou senha inválidos.

### 1.3. **POST** `/auth/refresh`

**Descrição**: Gera um novo token de acesso usando um refresh token. (*Implementação atual é simulação*)
**Acesso**: Público
**Request Body** (`RefreshTokenRequestDto`)
```json
{
  "refreshToken": "string"
}
```
**Response 200** (`AuthResponseDto`) - Similar ao `/auth/login`
**Erros Comuns**:
*   `400 Bad Request`: `INVALID_REFRESH_TOKEN` - Refresh token inválido ou expirado (simulado).

### 1.4. **GET** `/auth/me`

**Descrição**: Obtém informações do usuário autenticado.
**Acesso**: Qualquer usuário autenticado
**Response 200** (`UsuarioResponse` - DTO do serviço, similar ao `UserDto` de `AuthDtos.cs`)
```json
{
  "id": "uuid",
  "nome": "string",
  "email": "string",
  "perfil": "string", // Perfil principal do usuário na plataforma
  "condominios": [ // Lista de condomínios/unidades aos quais o usuário está vinculado
    {
      "condominioId": "uuid",
      "nomeCondominio": "string",
      "unidadeId": "uuid",
      "identificadorUnidade": "string", // Bloco/Apto
      "perfilNaUnidade": "string" // Ex: Morador, Proprietário, Inquilino
    }
  ]
  // Outras informações relevantes do usuário
}
```
**Erros Comuns**:
*   `401 Unauthorized`: Token de usuário inválido.
*   `404 Not Found`: Usuário não encontrado.

### 1.5. **POST** `/auth/forgot-password`

**Descrição**: Solicita a redefinição de senha para um usuário. (*Implementação atual é simulação*)
**Acesso**: Público
**Request Body** (`ForgotPasswordRequestDto`)
```json
{
  "email": "string"
}
```
**Response 200**
```json
{
  "message": "Se um usuário com este e-mail existir em nosso sistema, um link para redefinição de senha foi enviado."
}
```
**Erros Comuns**:
*   `400 Bad Request`: Dados de entrada inválidos.

### 1.6. **POST** `/auth/reset-password`

**Descrição**: Redefine a senha do usuário usando um token de reset. (*Implementação atual é simulação*)
**Acesso**: Público
**Request Body** (`ResetPasswordRequestDto`)
```json
{
  "resetToken": "string",
  "novaSenha": "string (min 6 chars)"
}
```
**Response 200**
```json
{
  "message": "Senha redefinida com sucesso."
}
```
**Erros Comuns**:
*   `400 Bad Request`: `RESET_FAILED` - Token inválido/expirado ou nova senha inválida (simulado).

### 1.7. **POST** `/auth/enable-2fa` (*Não Implementado*)
### 1.8. **POST** `/auth/verify-2fa` (*Não Implementado*)

### 1.9. **GET** `/adm/users` (Administração de Usuários)

**Descrição**: (Admin) Lista todos os usuários da plataforma.
**Acesso**: `Administradora`, `SuperAdmin`
**Path**: `/api/v1/adm/users`
**Query Params**:
*   `perfil` (enum `PerfilUsuario`): Filtra por perfil de usuário (opcional).
*   `ativo` (bool): Filtra por status de ativação na plataforma (opcional).
**Response 200** (`IEnumerable<AdminUserListDto>`)
```json
[
  {
    "id": "uuid",
    "nome": "string",
    "email": "string",
    "perfilGeral": "Administrador" | "Sindico" | "Morador" | "Porteiro" | ...,
    "isAtivoPlataforma": true,
    "dataCriacao": "datetime"
  }
]
```
**Erros Comuns**:
*   `401 Unauthorized`
*   `403 Forbidden`

---
## 2. Condomínios (Gerenciamento pela Administradora)

Endpoints gerenciados por `CondominiosController.cs`. Prefixo: `/api/v1/adm/condominios`.
**Acesso Geral**: `Administradora`, `SuperAdmin`.

### 2.1. **GET** `/adm/condominios`

**Descrição**: Lista todos os condomínios cadastrados na plataforma.
**Query Params**: (Não implementado no controller atual, mas bom manter para referência futura)
*   `page` (int), `size` (int), `search` (string)
**Response 200** (`IEnumerable<CondominioDto>`)
```json
[
  {
    "id": "uuid",
    "nome": "string",
    "cnpj": "string|null",
    "endereco": {
      "logradouro": "string",
      "numero": "string",
      "complemento": "string|null",
      "bairro": "string",
      "cidade": "string",
      "uf": "string",
      "cep": "string"
    },
    "telefoneContato": "string|null",
    "emailContato": "string|null",
    "ativo": true,
    "dataCadastro": "datetime"
  }
]
```
*Nota: O controller usa `CondominioDto`, mas a estrutura acima reflete `CondominioDetalhadoDto` que parece ser o DTO de fato retornado pelo serviço `ListarTodosAsync`.*

### 2.2. **POST** `/adm/condominios`

**Descrição**: Cadastra um novo condomínio na plataforma.
**Request Body** (`CondominioInputDto`)
```json
{
  "nome": "string (3-150 chars)",
  "cnpj": "string|null (XX.XXX.XXX/0001-XX)",
  "endereco": {
    "logradouro": "string",
    "numero": "string",
    "complemento": "string|null",
    "bairro": "string",
    "cidade": "string",
    "uf": "string (2 chars)",
    "cep": "string (8-9 chars)"
  },
  "telefoneContato": "string|null",
  "emailContato": "string|null",
  "ativo": true
}
```
**Response 201** (`CondominioDto` - reflete `CondominioDetalhadoDto`) - Mesma estrutura do item da lista em 2.1.

### 2.3. **GET** `/adm/condominios/{id}`

**Descrição**: Obtém detalhes de um condomínio específico.
**Path**: `/api/v1/adm/condominios/{id:guid}`
**Response 200** (`CondominioDto` - reflete `CondominioDetalhadoDto`) - Mesma estrutura do item da lista em 2.1.
**Erros Comuns**:
*   `404 Not Found`: Condomínio não encontrado.

### 2.4. **PUT** `/adm/condominios/{id}`

**Descrição**: Atualiza os dados de um condomínio existente.
**Path**: `/api/v1/adm/condominios/{id:guid}`
**Request Body** (`CondominioInputDto`): Mesmos campos do POST (2.2).
**Response 200** (`CondominioDto` - reflete `CondominioDetalhadoDto`): Mesma estrutura do item da lista em 2.1.
**Erros Comuns**:
*   `404 Not Found`: Condomínio não encontrado.

### 2.5. **DELETE** `/adm/condominios/{id}`

**Descrição**: Remove um condomínio da plataforma. (Operação destrutiva, verificar se é soft delete).
**Path**: `/api/v1/adm/condominios/{id:guid}`
**Response 204** (No Content)
**Erros Comuns**:
*   `404 Not Found`: Condomínio não encontrado ou não pôde ser removido.

---
## 3. Unidades & Membros (Gestão pelo Síndico)

### 3.1. Gestão de Unidades (Blocos, Apartamentos, Casas)

*Nota: Os endpoints para CRUD de Unidades (`GET /syndic/units`, `POST /syndic/units`, `GET /syndic/units/{id}`, `PUT /syndic/units/{id}`, `DELETE /syndic/units/{id}`) descritos na versão anterior deste documento **não foram encontrados** nos controllers analisados (`CondominiosController` é para gestão de Condomínios pela Administradora, `UsuariosController` gerencia membros de unidades). Esta funcionalidade parece estar **Não Implementada** ou pendente de verificação.*

### 3.2. Gestão de Membros de Unidades

Endpoints gerenciados por `UsuariosController.cs`.

#### 3.2.1. **POST** `/syndic/units/{unidadeId}/members`

**Descrição**: (Síndico) Vincula um usuário existente a uma unidade do seu condomínio.
**Path**: `/api/v1/syndic/units/{unidadeId:guid}/members`
**Acesso**: `Sindico`
**Request Body** (`VincularUsuarioUnidadeRequestDto`)
```json
{
  "emailUsuario": "string (email do usuário a ser vinculado)",
  "relacaoComUnidade": "string|null (Ex: Proprietário, Inquilino, Dependente)"
}
```
**Response 201** (`MembroUnidadeDto`)
```json
{
  "membroId": "uuid", // ID do vínculo
  "usuarioId": "uuid",
  "nomeUsuario": "string",
  "emailUsuario": "string",
  "unidadeId": "uuid",
  "relacaoComUnidade": "string",
  "perfilNaUnidade": "Morador" | "Proprietario" | "Inquilino", // Enum PerfilUsuario
  "ativo": true // Status do vínculo (ativo/pendente)
}
```
**Erros Comuns**:
*   `400 Bad Request`: Dados inválidos ou usuário já vinculado.
*   `401 Unauthorized`: Claims inválidas (CondominioId do síndico).
*   `404 Not Found`: Unidade ou usuário não encontrado.

#### 3.2.2. **PUT** `/syndic/members/{memberId}`

**Descrição**: (Síndico) Aprova, bloqueia ou atualiza o perfil de um membro em uma unidade.
**Path**: `/api/v1/syndic/members/{memberId:guid}`
**Acesso**: `Sindico`
**Request Body** (`AtualizarMembroRequestDto`)
```json
{
  "ativo": true // true para aprovar/desbloquear, false para bloquear
  // "perfilNaUnidade": "Morador" | ... (opcional, para mudar perfil)
}
```
**Response 200** (`MembroUnidadeDto`) - Mesma estrutura de 3.2.1.
**Erros Comuns**:
*   `400 Bad Request`: Dados inválidos.
*   `401 Unauthorized`.
*   `404 Not Found`: Membro não encontrado.

#### 3.2.3. **DELETE** `/syndic/members/{memberId}`

**Descrição**: (Síndico) Desvincula um usuário de uma unidade.
**Path**: `/api/v1/syndic/members/{memberId:guid}`
**Acesso**: `Sindico`
**Response 204** (No Content)
**Erros Comuns**:
*   `401 Unauthorized`.
*   `404 Not Found`: Membro não encontrado.

4. Financeiro: Cobranças, Despesas e Relatórios

Endpoints gerenciados por `FinanceiroController.cs`.
Prefixo geral: `/api/v1/financeiro` (para Síndico) e rotas específicas para Administradora.

### 4.1. Cobranças (Boletos) - Síndico

#### 4.1.1. **GET** `/financeiro/cobrancas/dashboard`

**Descrição**: (Síndico) Obtém dados para o dashboard de cobranças do condomínio.
**Acesso**: `Sindico`
**Response 200** (`DashboardFinanceiroCobrancasDto`)
```json
{
  "inadimplenciaPercentual": 0.0,
  "totalPixMes": 0.0,
  "totalBoletosPendentes": 0
}
```
**Erros Comuns**:
*   `401 Unauthorized`: CondominioId inválido.
*   `404 Not Found`: Dados não encontrados.

#### 4.1.2. **GET** `/financeiro/cobrancas`

**Descrição**: (Síndico) Lista as cobranças (boletos) do condomínio.
**Acesso**: `Sindico`
**Query Params**:
*   `status` (string, opcional): Filtra por status (e.g., "Pendente", "Pago", "Atrasado").
*   (Outros filtros como `vencimentoFrom`, `vencimentoTo`, `page`, `size` podem ser adicionados conforme necessidade).
**Response 200** (`IEnumerable<CobrancaDto>`)
```json
[
  {
    "id": "uuid",
    "unidadeId": "uuid",
    "nomeSacado": "string|null",
    "valor": 100.00,
    "dataVencimento": "datetime",
    "statusCobranca": "Pendente" | "Pago" | "Atrasado" | "Cancelado",
    "linkSegundaVia": "string|null"
  }
]
```
**Erros Comuns**:
*   `401 Unauthorized`: CondominioId inválido.

#### 4.1.3. **POST** `/financeiro/cobrancas`

**Descrição**: (Síndico) Cria uma nova cobrança (boleto avulso, taxas extras) para uma unidade.
**Acesso**: `Sindico`
**Request Body** (`NovaCobrancaDto`)
```json
{
  "unidadeId": "uuid",
  "valor": 123.45,
  "dataVencimento": "YYYY-MM-DD",
  "descricao": "string|null"
}
```
**Response 201** (`CobrancaDto`) - Mesma estrutura de um item da lista em 4.1.2.
**Erros Comuns**:
*   `400 Bad Request`: Dados inválidos ou `INVALID_OPERATION` (ex: falha na geração).
*   `401 Unauthorized`: Claims inválidas.

#### 4.1.4. **GET** `/financeiro/cobrancas/{id}`

**Descrição**: (Síndico) Obtém detalhes de uma cobrança específica.
**Path**: `/api/v1/financeiro/cobrancas/{id:guid}`
**Acesso**: `Sindico` (Serviço deve validar se cobrança pertence ao condomínio do síndico).
**Response 200** (`CobrancaDto`) - Mesma estrutura de um item da lista em 4.1.2.
**Erros Comuns**:
*   `404 Not Found`: Cobrança não encontrada.

#### 4.1.5. **GET** `/financeiro/boletos/{id}/pdf`

**Descrição**: (Síndico) Obtém dados de um boleto específico, incluindo PDF e código de barras/Pix.
**Path**: `/api/v1/financeiro/boletos/{id:guid}/pdf`
**Acesso**: `Sindico` (e potencialmente `Condomino` se permitido pelo serviço).
**Response 200** (`BoletoPdfDto`)
```json
{
  "pdfBase64": "string (conteúdo do PDF em base64)",
  "brCode": "string (código para Pix Copia e Cola)",
  "metadados": {
    "valor": 100.00,
    "status": "gerado"
    // ... outros metadados relevantes
  }
}
```
**Erros Comuns**:
*   `404 Not Found`.

#### 4.1.6. **PUT** `/financeiro/cobrancas/{id}/cancelar`

**Descrição**: (Síndico) Cancela uma cobrança (boleto), se o status permitir.
**Path**: `/api/v1/financeiro/cobrancas/{id:guid}/cancelar` (*Endpoint no controller é `cobrancas/{id}/cancelar`*)
**Acesso**: `Sindico`
**Response 200** (`ResultadoOperacaoDto`) ou `204 No Content`
```json
{ // Exemplo de ResultadoOperacaoDto
  "sucesso": true,
  "mensagem": "Cobrança cancelada com sucesso."
}
```
**Erros Comuns**:
*   `400 Bad Request` ou `409 Conflict`: (`INVALID_OPERATION`) Se não puder ser cancelada (ex: já paga).
*   `404 Not Found`.

#### 4.1.7. **POST** `/financeiro/boletos/{id}/resend`

**Descrição**: (Síndico) Reenvia um boleto (2ª via) por e-mail/notificação. (*Serviço `ReenviarBoletoAsync` chamado*)
**Path**: `/api/v1/financeiro/boletos/{id:guid}/resend`
**Acesso**: `Sindico`
**Response 202** (Accepted) - Operação assíncrona.

### 4.2. Geração de Cobranças em Lote

#### 4.2.1. **POST** `/financeiro/cobrancas/gerar-lote` (Síndico)

**Descrição**: (Síndico) Dispara a geração de cobranças em lote para o condomínio (ex: mensalidade).
**Path**: `/api/v1/financeiro/cobrancas/gerar-lote`
**Acesso**: `Sindico`
**Request Body** (`GeracaoLoteRequestDto`)
```json
{
  "mes": 1-12, // Mês de referência
  "ano": "YYYY", // Ano de referência
  "descricoesPadrao": [ // Opcional, para itens recorrentes que compõem a cobrança
    {
      "descricao": "string",
      "valor": 0.0
    }
  ]
}
```
**Response 200** (`ResultadoOperacaoDto`)
```json
{
  "sucesso": true,
  "mensagem": "Geração em lote processada.",
  "erros": ["string|null"] // Lista de erros, se houver
}
```
**Erros Comuns**:
*   `400 Bad Request`: Dados inválidos.
*   `401 Unauthorized`: CondominioId inválido.

#### 4.2.2. **POST** `/adm/finance/batch` (Administradora)

**Descrição**: (Administradora) Gera cobranças em lote para um condomínio específico ou múltiplos.
**Path**: `/api/v1/adm/finance/batch`
**Acesso**: `Administradora`
**Request Body** (`GeracaoLoteRequestDto`) - Similar a 4.2.1, mas o `FinanceiroController` indica que `condominioId` não é diretamente do token para esta rota admin, sugerindo que pode estar no DTO ou ser uma operação global (o que é menos provável).
*Nota: `GeracaoLoteRequestDto` não possui `condominioId`. O controller passa `Guid.Empty` ao serviço, o que implica que o DTO deveria conter o `condominioId` ou o serviço tem lógica especial para `Guid.Empty` que não está clara.*
```json
{
  // "condominioId": "uuid", // ESPERADO AQUI, mas não no DTO atual
  "mes": 1-12,
  "ano": "YYYY",
  "descricoesPadrao": [ /* ... */ ]
}
```
**Response 200** (`ResultadoOperacaoDto`) - Similar a 4.2.1.

### 4.3. Despesas - Síndico

Endpoints para gerenciamento de despesas do condomínio.

#### 4.3.1. **POST** `/financeiro/despesas`

**Descrição**: (Síndico) Registra uma nova despesa para o condomínio.
**Acesso**: `Sindico`
**Request Body** (`DespesaInputDto`)
```json
{
  "descricao": "string (3-200 chars)",
  "valor": 0.01, // > 0
  "dataCompetencia": "YYYY-MM-DD", // Mês/Ano a que se refere
  "dataVencimento": "YYYY-MM-DD|null", // Data de pagamento limite
  "categoria": "string|null (max 100 chars, e.g., Limpeza, Manutenção)",
  "observacoes": "string|null (max 500 chars)"
  // "fornecedorId": "uuid|null" // Futuro
}
```
**Response 201** (`DespesaDto`)
```json
{
  "id": "uuid", // Id do LancamentoFinanceiro
  "descricao": "string",
  "valor": 0.0,
  "dataCompetencia": "datetime",
  "dataVencimento": "datetime|null",
  "categoria": "string|null",
  "observacoes": "string|null",
  "dataRegistro": "datetime", // Quando foi lançada no sistema
  "status": "Pendente" | "Paga" | "Atrasada" | "Cancelada",
  "usuarioRegistroId": "uuid|null"
}
```
**Erros Comuns**:
*   `400 Bad Request`: Dados inválidos.
*   `401 Unauthorized`: Claims inválidas.

#### 4.3.2. **GET** `/financeiro/despesas`

**Descrição**: (Síndico) Lista as despesas do condomínio.
**Acesso**: `Sindico`
**Query Params**:
*   `categoria` (string, opcional): Filtra por categoria.
*   `mesCompetencia` (string `YYYY-MM`, opcional): Filtra por mês de competência.
**Response 200** (`IEnumerable<DespesaDto>`) - Lista de objetos com estrutura de 4.3.1.
**Erros Comuns**:
*   `401 Unauthorized`: CondominioId inválido.

#### 4.3.3. **GET** `/financeiro/despesas/{id}`

**Descrição**: (Síndico) Obtém detalhes de uma despesa específica.
**Path**: `/api/v1/financeiro/despesas/{id:guid}`
**Acesso**: `Sindico` (Serviço valida se despesa pertence ao condomínio).
**Response 200** (`DespesaDto`) - Estrutura de 4.3.1.
**Erros Comuns**:
*   `401 Unauthorized`.
*   `404 Not Found`: Despesa não encontrada.

#### 4.3.4. **PUT** `/financeiro/despesas/{id}`

**Descrição**: (Síndico) Atualiza uma despesa existente.
**Path**: `/api/v1/financeiro/despesas/{id:guid}`
**Acesso**: `Sindico`
**Request Body** (`DespesaInputDto`): Mesmos campos do POST (4.3.1).
**Response 200** (`DespesaDto`) - Estrutura de 4.3.1.
**Erros Comuns**:
*   `400 Bad Request`, `401 Unauthorized`, `404 Not Found`.

#### 4.3.5. **DELETE** `/financeiro/despesas/{id}`

**Descrição**: (Síndico) Remove (ou cancela) uma despesa.
**Path**: `/api/v1/financeiro/despesas/{id:guid}`
**Acesso**: `Sindico`
**Response 204** (No Content)
**Erros Comuns**:
*   `401 Unauthorized`, `404 Not Found`.

### 4.4. Relatórios Financeiros - Síndico

#### 4.4.1. **GET** `/financeiro/relatorios/balancete`

**Descrição**: (Síndico) Gera o relatório de balancete para um período.
**Acesso**: `Sindico`
**Query Params**:
*   `dataInicio` (datetime `YYYY-MM-DD`, obrigatório).
*   `dataFim` (datetime `YYYY-MM-DD`, obrigatório).
**Response 200** (`BalanceteDto`)
```json
{
  "periodoInicio": "datetime",
  "periodoFim": "datetime",
  "saldoAnterior": 0.0,
  "receitas": [
    { "categoria": "string", "descricao": "string", "valor": 0.0, "data": "datetime" }
  ],
  "despesas": [
    { "categoria": "string", "descricao": "string", "valor": 0.0, "data": "datetime" }
  ],
  "saldoAtual": 0.0,
  "totalReceitas": 0.0,
  "totalDespesas": 0.0
}
```
**Erros Comuns**:
*   `400 Bad Request`: Datas inválidas.
*   `401 Unauthorized`.
*   `404 Not Found`: Não foi possível gerar o balancete.

---
## 5. Pagamentos & Acordos

Endpoints gerenciados por `FinanceiroController.cs`.

### 5.1. **POST** `/finance/callback` (Webhook de Pagamento)

**Descrição**: Webhook para notificação de pagamento bancário (baixa automática).
**Path**: `/api/v1/finance/callback`
**Acesso**: Público (idealmente com IP Whitelist ou outra forma de segurança de webhook).
**Request Body** (`PagamentoWebhookDto`)
```json
{
  "nossoNumero": "string", // Identificador do boleto no sistema do banco
  "dataPagamento": "YYYY-MM-DD",
  "valorPago": 123.45,
  "traceId": "uuid" // ID de rastreamento da transação
}
```
**Response 200** (OK) - Geralmente corpo vazio ou uma mensagem simples de confirmação.

### 5.2. **POST** `/financeiro/manual-payment` (Registro Manual de Pagamento)

**Descrição**: (Síndico) Registra um pagamento manualmente (ex: Pix direto, caixa).
**Path**: `/api/v1/financeiro/manual-payment`
**Acesso**: `Sindico`
**Request Body** (`ManualPaymentInputDto`)
```json
{
  "boletoId": "uuid", // ID da Cobranca/Boleto que está sendo pago
  "valor": 100.00,
  "dataPagamento": "YYYY-MM-DD"
}
```
**Response 201** (`PagamentoDto`)
```json
{
  "pagamentoId": "uuid",
  "status": "Confirmado" // Ou status similar
}
```
**Erros Comuns**:
*   `400 Bad Request`: Dados inválidos.
*   `404 Not Found`: BoletoId não encontrado.

### 5.3. **POST** `/adm/finance/refund` (Solicitação de Estorno)

**Descrição**: (Administradora) Solicita um estorno de pagamento.
**Path**: `/api/v1/adm/finance/refund`
**Acesso**: `Administradora`
**Request Body** (`RefundRequestDto`)
```json
{
  "pagamentoId": "uuid", // ID do pagamento a ser estornado
  "motivo": "string"
}
```
**Response 202** (Accepted) - Indica que a solicitação de estorno foi aceita para processamento (geralmente assíncrono).
**Erros Comuns**:
*   `404 Not Found`: PagamentoId não encontrado.

### 5.4. Acordos de Inadimplência (Plano de Parcelamento) - Síndico

#### 5.4.1. **POST** `/financeiro/installment-plan`

**Descrição**: (Síndico) Cria um novo plano de parcelamento (acordo) para débitos de uma unidade.
**Path**: `/api/v1/financeiro/installment-plan`
**Acesso**: `Sindico`
**Request Body** (`InstallmentPlanInputDto`)
```json
{
  "unidadeId": "uuid",
  "entrada": 50.00, // Valor da entrada
  "parcelas": 6 // Número de parcelas (excluindo entrada)
}
```
**Response 201** (`InstallmentPlanDto`)
```json
{
  "id": "uuid", // ID do Acordo
  "valorTotal": 600.00,
  "entrada": 50.00,
  "parcelas": [
    { "numero": 1, "valor": 91.67, "vencimento": "YYYY-MM-DD", "pago": false }
    // ... outras parcelas
  ]
}
```

#### 5.4.2. **GET** `/financeiro/installment-plan/{id}`

**Descrição**: (Síndico) Obtém detalhes de um plano de parcelamento (acordo).
**Path**: `/api/v1/financeiro/installment-plan/{id:guid}`
**Acesso**: `Sindico`
**Response 200** (`InstallmentPlanDto`) - Mesma estrutura de 5.4.1.
**Erros Comuns**:
*   `404 Not Found`: Acordo não encontrado.

---
## 6. Reservas & Agenda de Áreas Comuns

Endpoints gerenciados por `ReservasController.cs`. Rota base: `/api/v1`.
Acesso geral: `Sindico`, `Condomino`, `Inquilino`.

### 6.1. **GET** `/app/reservas/agenda`

**Descrição**: Retorna todas as reservas do mês para todas as áreas comuns do condomínio.
**Path**: `/api/v1/app/reservas/agenda`
**Query Params**:
*   `mesAno` (string `YYYY-MM`, obrigatório): Mês e ano para consulta da agenda.
**Response 200** (`IEnumerable<AgendaReservaDto>`)
```json
[
  {
    "id": "uuid",
    "areaComumId": "string", // ID da área comum
    // "nomeAreaComum": "Salão de Festas", // (requer lookup)
    "inicio": "2025-07-10T14:00:00Z",
    "fim": "2025-07-10T18:00:00Z",
    "status": "Aprovada" | "Pendente" | "Recusada" | "Cancelada",
    "unidadeId": "uuid",
    // "nomeUnidade": "Apto 101", // (requer lookup)
    "tituloReserva": "string (e.g., Apto 101 - Churrasqueira)"
  }
]
```
**Erros Comuns**:
*   `400 Bad Request`: `INVALID_DATE` - Formato de `mesAno` inválido.
*   `401 Unauthorized`: CondominioId inválido no token.

### 6.2. **POST** `/app/reservas`

**Descrição**: Solicita uma nova reserva para uma área comum.
**Path**: `/api/v1/app/reservas`
**Request Body** (`ReservaInputDto`)
```json
{
  "unidadeId": "uuid", // ID da unidade que está reservando
  "areaComumId": "string (ID ou nome da área comum)",
  "inicio": "datetime (YYYY-MM-DDTHH:mm:ss)",
  "fim": "datetime (YYYY-MM-DDTHH:mm:ss)",
  "observacoes": "string|null (max 500 chars)"
}
```
**Response 201** (`ReservaDto`)
```json
{
  "id": "uuid",
  "condominioId": "uuid",
  "unidadeId": "uuid",
  "usuarioId": "uuid", // Quem solicitou
  "areaComumId": "string",
  "inicio": "datetime",
  "fim": "datetime",
  "status": "Pendente" | "Aprovada" | ...,
  "dataSolicitacao": "datetime",
  "observacoes": "string|null",
  "aprovadorId": "uuid|null",
  "justificativaAprovacaoRecusa": "string|null"
}
```
**Erros Comuns**:
*   `400 Bad Request`: Dados inválidos ou falha na criação (e.g., área não existe, conflito de horário).
*   `401 Unauthorized`: Claims inválidas.

### 6.3. **GET** `/app/reservas/{id}`

**Descrição**: Obtém detalhes de uma reserva específica.
**Path**: `/api/v1/app/reservas/{id:guid}`
**Response 200** (`ReservaDto`) - Mesma estrutura de 6.2.
**Erros Comuns**:
*   `401 Unauthorized`: Não tem permissão para ver esta reserva.
*   `404 Not Found`: Reserva não encontrada.

### 6.4. **PUT** `/syndic/reservas/{id}` (Aprovar/Recusar Reserva)

**Descrição**: (Síndico) Aprova ou recusa uma solicitação de reserva.
**Path**: `/api/v1/syndic/reservas/{id:guid}`
**Acesso**: `Sindico`
**Request Body** (`ReservaStatusUpdateDto`)
```json
{
  "status": "Aprovada" | "Recusada", // Outros status conforme o fluxo
  "justificativa": "string|null (max 500 chars)"
}
```
**Response 200** (`ReservaDto`) - Reserva atualizada, mesma estrutura de 6.2.
**Erros Comuns**:
*   `400 Bad Request`: Dados inválidos (ex: status não permitido) ou `INVALID_OPERATION`.
*   `401 Unauthorized`.
*   `404 Not Found`: Reserva não encontrada.

### 6.5. **DELETE** `/app/reservas/{id}` (Cancelar Reserva)

**Descrição**: Cancela uma reserva (solicitada pelo próprio usuário ou síndico).
**Path**: `/api/v1/app/reservas/{id:guid}`
**Acesso**: `Sindico`, `Condomino`, `Inquilino` (usuário deve ser o solicitante ou síndico).
**Response 204** (No Content)
**Erros Comuns**:
*   `401 Unauthorized`.
*   `403 Forbidden`: Não tem permissão para cancelar.
*   `404 Not Found`: Reserva não encontrada ou não pôde ser cancelada.

---
## 7. Avisos (Mural Digital)

Endpoints gerenciados por `AvisosController.cs`. Rotas base: `/api/v1/app/avisos` e `/api/v1/syndic/avisos`.

### 7.1. **POST** `/syndic/avisos`

**Descrição**: (Síndico) Publica um novo aviso para o condomínio.
**Path**: `/api/v1/syndic/avisos`
**Acesso**: `Sindico`
**Request Body** (`AvisoInputDto`)
```json
{
  "categoria": "string (Obrigatório, e.g., Manutenção, Eventos, Geral)",
  "titulo": "string (Obrigatório, e.g., Manutenção Elevador)",
  "corpo": "string|null (Detalhes do aviso)"
}
```
**Response 201** (`Aviso` - entidade, verificar se DTO é mais apropriado)
```json
{
  "id": "uuid",
  "condominioId": "uuid",
  "usuarioId": "uuid", // Quem publicou
  "categoria": "string",
  "titulo": "string",
  "corpo": "string|null",
  "dataPublicacao": "datetime",
  "dataExpiracao": "datetime|null", // Se aplicável
  "ativo": true
}
```
**Erros Comuns**:
*   `400 Bad Request`: Dados inválidos.
*   `401 Unauthorized`: Claims inválidas.

### 7.2. **GET** `/app/avisos`

**Descrição**: Lista os avisos do condomínio do usuário logado.
**Path**: `/api/v1/app/avisos`
**Acesso**: `Sindico`, `Condomino`, `Inquilino`
**Query Params**:
*   `page` (int, default 1): Número da página.
*   `size` (int, default 10): Quantidade de itens por página.
*   (`categoria` - mencionada no doc antigo, mas não no controller `ListarAvisosPorApp`. Pode ser adicionada).
**Response 200** (`IEnumerable<Aviso>`) - Lista de entidades `Aviso` (verificar se DTO).
**Erros Comuns**:
*   `401 Unauthorized`: CondominioId inválido.

### 7.3. **PUT** `/syndic/avisos/{id}`

**Descrição**: (Síndico) Edita um aviso existente.
**Path**: `/api/v1/syndic/avisos/{id:guid}`
**Acesso**: `Sindico`
**Request Body** (`AvisoInputDto`): Mesmos campos do POST (7.1).
**Response 200** (`Aviso` - entidade) - Aviso atualizado.
**Erros Comuns**:
*   `400 Bad Request`.
*   `401 Unauthorized`.
*   `404 Not Found`: Aviso não encontrado.

### 7.4. **DELETE** `/syndic/avisos/{id}`

**Descrição**: (Síndico) Arquiva (soft delete) um aviso.
**Path**: `/api/v1/syndic/avisos/{id:guid}`
**Acesso**: `Sindico`
**Response 204** (No Content)
**Erros Comuns**:
*   `401 Unauthorized`.
*   `404 Not Found`: Aviso não encontrado.

---
## 8. Chamados & Help-desk

Endpoints gerenciados por `ChamadosController.cs`.

### 8.1. **POST** `/app/chamados` (Abrir Chamado)

**Descrição**: Abre um novo chamado no sistema (condômino/inquilino).
**Path**: `/api/v1/app/chamados`
**Acesso**: `Sindico`, `Condomino`, `Inquilino`
**Request Body** (`ChamadoInputDto`)
```json
{
  "titulo": "string (5-100 chars)",
  "descricao": "string (10-1000 chars)",
  "fotos": ["string (URL ou base64)|null"], // Lista
  "unidadeId": "uuid|null" // Opcional, se específico de uma unidade
}
```
**Response 201** (`ChamadoDto`)
```json
{
  "id": "uuid",
  "titulo": "string",
  "descricao": "string",
  "fotos": ["string"],
  "status": "Aberto" | "EmAndamento" | "Concluido" | "Cancelado",
  "dataAbertura": "datetime",
  "dataResolucao": "datetime|null",
  "usuarioId": "uuid", // Quem abriu
  "unidadeId": "uuid|null",
  "respostaDoSindico": "string|null",
  "avaliacaoNota": "int|null (1-5)",
  "avaliacaoComentario": "string|null"
}
```
**Erros Comuns**:
*   `400 Bad Request`: Dados inválidos.
*   `401 Unauthorized`: Claims inválidas.

### 8.2. **GET** `/app/chamados` (Listar Meus Chamados)

**Descrição**: Lista os chamados abertos pelo usuário logado.
**Path**: `/api/v1/app/chamados`
**Acesso**: `Sindico`, `Condomino`, `Inquilino`
**Query Params**:
*   `status` (string, opcional): Filtra por status.
**Response 200** (`IEnumerable<ChamadoDto>`) - Lista de objetos com estrutura de 8.1 Response.
**Erros Comuns**:
*   `401 Unauthorized`.

### 8.3. **GET** `/app/chamados/{id}` (Detalhe do Meu Chamado)

**Descrição**: Obtém um chamado específico pelo ID (visão do usuário do app).
**Path**: `/api/v1/app/chamados/{id:guid}`
**Acesso**: `Sindico`, `Condomino`, `Inquilino` (Serviço valida se usuário pode ver).
**Response 200** (`ChamadoDto`) - Estrutura de 8.1 Response.
**Erros Comuns**:
*   `401 Unauthorized`.
*   `403 Forbidden` (se não for o criador e não síndico).
*   `404 Not Found`.

### 8.4. **POST** `/app/chamados/{id}/avaliar` (Avaliar Chamado)

**Descrição**: Avalia um chamado concluído (realizado pelo condômino/inquilino que abriu).
**Path**: `/api/v1/app/chamados/{id:guid}/avaliar`
**Acesso**: `Condomino`, `Inquilino`
**Request Body** (`ChamadoAvaliacaoDto`)
```json
{
  "avaliacaoNota": "int (1-5, obrigatório)",
  "avaliacaoComentario": "string|null (max 500 chars)"
}
```
**Response 200** (`ChamadoDto`) - Chamado atualizado com a avaliação.
**Erros Comuns**:
*   `400 Bad Request`: Dados inválidos ou chamado não pode ser avaliado (status, já avaliado).
*   `401 Unauthorized`.
*   `403 Forbidden` (não é o criador).
*   `404 Not Found`.

### 8.5. Gestão de Chamados pelo Síndico

#### 8.5.1. **GET** `/syndic/chamados`

**Descrição**: (Síndico) Lista todos os chamados do condomínio.
**Path**: `/api/v1/syndic/chamados`
**Acesso**: `Sindico`
**Query Params**:
*   `status` (string, opcional): Filtra por status.
**Response 200** (`IEnumerable<ChamadoDto>`) - Lista de objetos com estrutura de 8.1 Response.
*Nota: O doc antigo mencionava Kanban (open, progress, done). O controller atual retorna lista simples.*
**Erros Comuns**:
*   `401 Unauthorized`.

#### 8.5.2. **GET** `/syndic/chamados/{id}`

**Descrição**: (Síndico) Obtém um chamado específico pelo ID.
**Path**: `/api/v1/syndic/chamados/{id:guid}`
**Acesso**: `Sindico`
**Response 200** (`ChamadoDto`) - Estrutura de 8.1 Response.
**Erros Comuns**:
*   `401 Unauthorized`.
*   `404 Not Found`.

#### 8.5.3. **PUT** `/syndic/chamados/{id}`

**Descrição**: (Síndico) Atualiza o status e/ou adiciona resposta a um chamado.
**Path**: `/api/v1/syndic/chamados/{id:guid}`
**Acesso**: `Sindico`
**Request Body** (`ChamadoUpdateDto`)
```json
{
  "status": "EmAndamento" | "Concluido" | "Cancelado", // Obrigatório
  "respostaDoSindico": "string|null (max 1000 chars)"
}
```
**Response 200** (`ChamadoDto`) - Chamado atualizado.
**Erros Comuns**:
*   `400 Bad Request`: Dados ou transição de status inválida.
*   `401 Unauthorized`.
*   `404 Not Found`.

---
## 9. Portaria – Visitantes

Endpoints gerenciados por `VisitantesController.cs`. Rota base: `/api/v1/visitantes`.

### 9.1. **POST** `/visitantes/registrar-entrada` (Portaria)

**Descrição**: (Porteiro, Administrador) Registra a entrada de um visitante.
**Path**: `/api/v1/visitantes/registrar-entrada`
**Acesso**: `Porteiro`, `Administrador`
**Request Body** (`VisitanteInputDto`)
```json
{
  "unidadeId": "uuid",
  "nome": "string",
  "documento": "string|null",
  "motivoVisita": "string|null",
  "horarioSaidaPrevisto": "datetime|null",
  "observacoes": "string|null"
  // "fotoUrl" é gerenciado pelo backend ou um endpoint dedicado de upload
}
```
**Response 201** (`VisitanteDto`)
```json
{
  "id": "uuid",
  "unidadeId": "uuid",
  "nome": "string",
  "documento": "string|null",
  "fotoUrl": "string|null",
  "motivoVisita": "string|null",
  "dataChegada": "datetime",
  "dataSaida": "datetime|null",
  "horarioSaidaPrevisto": "datetime|null",
  "observacoes": "string|null",
  "status": "Presente" | "Saiu" | "PreAutorizado" | ..., // Enum VisitanteStatus
  "qrCode": "string|null", // Se gerado na pré-autorização
  "preAutorizadoPorCondominoId": "uuid|null",
  "dataValidadePreAutorizacao": "datetime|null",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```
**Erros Comuns**:
*   `400 Bad Request`: Dados inválidos (e.g., `unidadeId` não existe).
*   `401 Unauthorized`.

### 9.2. **POST** `/visitantes/{id}/registrar-saida` (Portaria)

**Descrição**: (Porteiro, Administrador) Registra a saída de um visitante.
**Path**: `/api/v1/visitantes/{id:guid}/registrar-saida`
**Acesso**: `Porteiro`, `Administrador`
**Response 200** (`VisitanteDto`) - Visitante atualizado com `dataSaida` e status.
**Erros Comuns**:
*   `400 Bad Request`: (`INVALID_OPERATION`) Ex: Visitante já saiu.
*   `404 Not Found`: Visitante não encontrado.

### 9.3. **POST** `/visitantes/pre-autorizar` (Condômino)

**Descrição**: (Condômino, Administrador, Síndico) Pré-autoriza a entrada de um visitante, potencialmente gerando um QR Code.
**Path**: `/api/v1/visitantes/pre-autorizar`
**Acesso**: `Condomino`, `Administrador`, `Sindico`
**Request Body** (`PreAutorizacaoVisitanteDto`)
```json
{
  "unidadeId": "uuid", // Unidade do condômino que autoriza
  "condominoId": "uuid", // ID do condômino que autoriza
  "nomeVisitante": "string",
  "documentoVisitante": "string|null",
  "motivoVisita": "string|null",
  "horarioEntradaPrevisto": "datetime|null",
  "horarioSaidaPrevisto": "datetime|null",
  "dataValidadePreAutorizacao": "datetime|null" // Para QR Code
}
```
**Response 201** (`VisitanteDto`) - Visitante criado com status `PreAutorizado` e `qrCode` populado.
**Erros Comuns**:
*   `400 Bad Request`: Dados inválidos (e.g., `unidadeId` não pertence ao `condominoId`).

### 9.4. **POST** `/visitantes/validar-qr-code` (Portaria)

**Descrição**: (Porteiro, Administrador) Valida um QR Code para entrada de visitante.
**Path**: `/api/v1/visitantes/validar-qr-code`
**Acesso**: `Porteiro`, `Administrador`
**Request Body** (`QRCodeValidationRequestDto`)
```json
{
  "qrCodeValue": "string"
}
```
**Response 200** (`VisitanteDto`) - Dados do visitante se o QR Code for válido e ativo; registra entrada.
**Erros Comuns**:
*   `400 Bad Request`: QR Code inválido, expirado.
*   `404 Not Found`: Visitante associado ao QR Code não encontrado.

### 9.5. **GET** `/visitantes/historico` (Consulta)

**Descrição**: (Síndico, Administrador, Porteiro) Lista o histórico de visitantes com filtros.
**Path**: `/api/v1/visitantes/historico`
**Acesso**: `Sindico`, `Administrador`, `Porteiro`
**Query Params**:
*   `unidadeId` (uuid, opcional)
*   `inicio` (datetime `YYYY-MM-DD`, opcional)
*   `fim` (datetime `YYYY-MM-DD`, opcional)
*   `nomeVisitante` (string, opcional)
**Response 200** (`IEnumerable<VisitanteDto>`)

### 9.6. **GET** `/visitantes/atuais` (Consulta)

**Descrição**: (Síndico, Administrador, Porteiro, Condômino) Lista visitantes atualmente presentes no condomínio. Condômino vê apenas da sua unidade.
**Path**: `/api/v1/visitantes/atuais`
**Acesso**: `Sindico`, `Administrador`, `Porteiro`, `Condomino`
**Query Params**:
*   `unidadeId` (uuid, opcional): Se condômino, é forçado para sua unidade.
**Response 200** (`IEnumerable<VisitanteDto>`)

### 9.7. **GET** `/visitantes/{id}` (Detalhe)

**Descrição**: Obtém detalhes de um visitante específico. Condômino só pode ver se for da sua unidade ou pré-autorizado por ele.
**Path**: `/api/v1/visitantes/{id:guid}`
**Acesso**: `Sindico`, `Administrador`, `Porteiro`, `Condomino`
**Response 200** (`VisitanteDto`)
**Erros Comuns**:
*   `403 Forbidden` (para Condômino sem permissão).
*   `404 Not Found`.

### 9.8. **PUT** `/visitantes/{id}` (Atualizar Dados - Portaria)

**Descrição**: (Porteiro, Administrador) Atualiza dados de um visitante já registrado.
**Path**: `/api/v1/visitantes/{id:guid}`
**Acesso**: `Porteiro`, `Administrador`
**Request Body** (`VisitanteUpdateDto`)
```json
{
  "nome": "string",
  "documento": "string|null",
  "motivoVisita": "string|null",
  "horarioSaidaPrevisto": "datetime|null",
  "observacoes": "string|null",
  "status": "Presente" | "Saiu" | ... // Opcional, se permitido atualizar status aqui
}
```
**Response 200** (`VisitanteDto`) - Visitante atualizado.
**Erros Comuns**:
*   `400 Bad Request`: Dados inválidos.
*   `404 Not Found`.

---
## 10. Portaria – Encomendas

Endpoints gerenciados por `EncomendasController.cs`. Rota base: `/api/v1/syndic/encomendas`.
*Nota: A rota base `/syndic/encomendas` para todas as operações, incluindo as de "Porteiro" e "Condômino", pode precisar de revisão para clareza de papéis. O controller atual parece focado no Síndico/Portaria.*

### 10.1. **POST** `/syndic/encomendas` (Registrar Recebimento)

**Descrição**: (Síndico/Porteiro) Registra o recebimento de uma nova encomenda.
**Path**: `/api/v1/syndic/encomendas`
**Acesso**: `Sindico` (Controller está com `Authorize(Roles = "Sindico")`. Se Porteiros usam, o role precisa ser ajustado ou um novo endpoint).
**Request Body** (`EncomendaInputDto`)
```json
{
  "unidadeId": "uuid",
  "descricao": "string|null (e.g., Pacote Sedex)",
  "codigoRastreio": "string|null",
  "remetente": "string|null",
  "observacoes": "string|null"
  // "fotoUrl" - Gerenciado pelo backend ou endpoint dedicado
}
```
**Response 201** (`Encomenda` - entidade, verificar DTO)
```json
{
  "id": "uuid",
  "unidadeId": "uuid",
  "descricao": "string|null",
  "recebidoEm": "datetime",
  "retiradoEm": "datetime|null",
  "status": "Recebida" | "Retirada" | "Devolvida", // Enum EncomendaStatus
  "codigoRastreio": "string|null",
  // ... outros campos da entidade Encomenda
}
```

### 10.2. **POST** `/syndic/encomendas/{id}/retirar` (Registrar Retirada)

**Descrição**: (Síndico/Porteiro) Confirma a retirada da encomenda pelo morador.
**Path**: `/api/v1/syndic/encomendas/{id:guid}/retirar`
**Acesso**: `Sindico`
**Response 200** (`Encomenda` - entidade) - Encomenda atualizada.
**Erros Comuns**:
*   `404 Not Found`.

### 10.3. **GET** `/syndic/encomendas` (Listar Encomendas - Síndico/Portaria)

**Descrição**: (Síndico/Porteiro) Lista encomendas do condomínio, com filtros.
**Path**: `/api/v1/syndic/encomendas`
**Acesso**: `Sindico`
**Query Params**:
*   `status` (string, opcional): Filtra por status (e.g., "Recebida", "Retirada").
**Response 200** (`IEnumerable<Encomenda>`) - Lista de entidades.

### 10.4. **GET** `/syndic/encomendas/{id}` (Detalhe da Encomenda - Síndico/Portaria)

**Descrição**: (Síndico/Porteiro) Obtém detalhes de uma encomenda específica.
**Path**: `/api/v1/syndic/encomendas/{id:guid}`
**Acesso**: `Sindico`
**Response 200** (`Encomenda` - entidade).
**Erros Comuns**:
*   `404 Not Found`.

### 10.5. **GET** `/app/encomendas` (Listar Minhas Encomendas - Condômino) - *Não Implementado*

**Descrição**: (Condômino) Lista encomendas destinadas à sua unidade.
*Endpoint não encontrado no `EncomendasController.cs` atual.*

---
## 11. Prestadores & Ordens de Serviço

### 11.1. Prestadores de Serviço

Endpoints gerenciados por `PrestadoresController.cs`. Rotas base: `/api/v1/app/prestadores` e `/api/v1/syndic/prestadores`.

#### 11.1.1. **POST** `/syndic/prestadores` (Cadastrar Prestador)

**Descrição**: (Síndico) Cadastra um novo prestador de serviço para o condomínio.
**Path**: `/api/v1/syndic/prestadores`
**Acesso**: `Sindico`
**Request Body** (`PrestadorInputDto`)
```json
{
  "nome": "string (3-150 chars)",
  "telefone": "string|null (max 20 chars)",
  "email": "string|null (email, max 100 chars)",
  "documento": "string|null (CNPJ/CPF, max 20 chars)",
  "especialidade": "string|null (max 100 chars)",
  "enderecoCompleto": "string|null (max 250 chars)"
}
```
**Response 201** (`PrestadorDto`)
```json
{
  "id": "uuid",
  "nome": "string",
  "telefone": "string|null",
  "email": "string|null",
  "documento": "string|null",
  "especialidade": "string|null",
  "enderecoCompleto": "string|null",
  "ratingMedio": "double|null",
  "totalAvaliacoes": 0,
  "detalhesAvaliacoes": [] // Lista de AvaliacaoPrestadorDto
}
```

#### 11.1.2. **GET** `/app/prestadores` (Listar Prestadores)

**Descrição**: Lista os prestadores de serviço ativos para o condomínio (visível para condôminos e síndico).
**Path**: `/api/v1/app/prestadores`
**Acesso**: `Sindico`, `Condomino`, `Inquilino`
**Query Params**:
*   `especialidade` (string, opcional): Filtra por especialidade.
*   (`page`, `size` - não no controller atual, mas padrão para listas).
**Response 200** (`IEnumerable<PrestadorDto>`) - Lista de objetos com estrutura de 11.1.1 Response.

#### 11.1.3. **GET** `/app/prestadores/{id}` (Detalhe do Prestador)

**Descrição**: Obtém os detalhes de um prestador de serviço específico.
**Path**: `/api/v1/app/prestadores/{id:guid}`
**Acesso**: `Sindico`, `Condomino`, `Inquilino`
**Response 200** (`PrestadorDto`) - Estrutura de 11.1.1 Response.
**Erros Comuns**:
*   `404 Not Found`: Prestador não encontrado ou inativo.

#### 11.1.4. **PUT** `/syndic/prestadores/{id}` (Atualizar Prestador)

**Descrição**: (Síndico) Atualiza os dados de um prestador de serviço.
**Path**: `/api/v1/syndic/prestadores/{id:guid}`
**Acesso**: `Sindico`
**Request Body** (`PrestadorInputDto`): Mesmos campos do POST (11.1.1).
**Response 200** (`PrestadorDto`) - Prestador atualizado.
**Erros Comuns**:
*   `404 Not Found`.

#### 11.1.5. **DELETE** `/syndic/prestadores/{id}` (Desativar Prestador)

**Descrição**: (Síndico) Desativa um prestador de serviço.
**Path**: `/api/v1/syndic/prestadores/{id:guid}`
**Acesso**: `Sindico`
**Response 204** (No Content)
**Erros Comuns**:
*   `404 Not Found`.

#### 11.1.6. **POST** `/app/prestadores/{id}/avaliar` (Avaliar Prestador)

**Descrição**: Registra uma avaliação para um prestador de serviço.
**Path**: `/api/v1/app/prestadores/{id:guid}/avaliar`
**Acesso**: `Sindico`, `Condomino`, `Inquilino`
**Request Body** (`AvaliacaoPrestadorInputDto`)
```json
{
  "nota": "int (1-5, obrigatório)",
  "comentario": "string|null (max 1000 chars)",
  "ordemServicoId": "uuid|null" // Opcional, para vincular a uma OS
}
```
**Response 200** (`AvaliacaoPrestadorDto`) (*Controller retorna Ok, não 201*)
```json
{
  "id": "uuid",
  "usuarioId": "uuid",
  "nomeUsuario": "string", // Pode precisar de lookup
  "nota": 0,
  "comentario": "string|null",
  "dataAvaliacao": "datetime",
  "ordemServicoId": "uuid|null"
}
```
**Erros Comuns**:
*   `400 Bad Request`: Dados inválidos ou prestador não pode ser avaliado.
*   `404 Not Found`: Prestador não encontrado.

### 11.2. Ordens de Serviço (OS)

Endpoints gerenciados por `OrdensServicoController.cs`. Rota base: `/api/v1`.

#### 11.2.1. **POST** `/app/os` (Condômino Cria OS)

**Descrição**: (Condômino/Inquilino) Cria uma nova Ordem de Serviço (para sua unidade ou área comum).
**Path**: `/api/v1/app/os`
**Acesso**: `Condomino`, `Inquilino`, `Sindico`
**Request Body** (`OrdemServicoInputUserDto`)
```json
{
  "descricaoProblema": "string (10-1000 chars)",
  "unidadeId": "uuid|null", // Se nulo, área comum
  "categoriaServico": "string|null (max 100 chars, e.g., Elétrica)",
  "fotos": ["string (URL/base64)|null"]
}
```
**Response 201** (`OrdemServicoDto`)
```json
{
  "id": "uuid",
  "condominioId": "uuid",
  "titulo": "string", // Pode ser gerado a partir da descrição
  "descricao": "string",
  "usuarioSolicitanteId": "uuid",
  "unidadeId": "uuid|null",
  "categoriaServico": "string",
  "status": "Aberta" | "EmAndamento" | ...,
  "prioridade": "Baixa" | "Media" | ...,
  "dataAbertura": "datetime",
  "dataAgendamento": "datetime|null",
  "dataConclusao": "datetime|null",
  "prestadorServicoId": "uuid|null",
  "custoEstimado": 0.0,
  "custoFinal": 0.0,
  "fotos": ["string"],
  "observacoesSindico": "string|null"
}
```

#### 11.2.2. **GET** `/app/os` (Condômino Lista Suas OS)

**Descrição**: (Condômino/Inquilino) Lista as Ordens de Serviço abertas pelo usuário.
**Path**: `/api/v1/app/os`
**Acesso**: `Condomino`, `Inquilino`, `Sindico`
**Query Params**:
*   `status` (string, opcional): Filtra por status.
**Response 200** (`IEnumerable<OrdemServicoDto>`)

#### 11.2.3. **GET** `/app/os/{id}` (Condômino Detalha Sua OS)

**Descrição**: (Condômino/Inquilino) Obtém detalhes de uma OS específica criada pelo usuário (ou se for síndico).
**Path**: `/api/v1/app/os/{id:guid}`
**Acesso**: `Condomino`, `Inquilino`, `Sindico`
**Response 200** (`OrdemServicoDto`)
**Erros Comuns**:
*   `404 Not Found`: OS não encontrada ou acesso não permitido.

#### 11.2.4. **POST** `/syndic/os` (Síndico Cria OS)

**Descrição**: (Síndico) Cria uma nova Ordem de Serviço, podendo atribuir prestador, etc.
**Path**: `/api/v1/syndic/os`
**Acesso**: `Sindico`
**Request Body** (`OrdemServicoInputSindicoDto`)
```json
{
  "titulo": "string (5-150 chars)",
  "descricaoServico": "string (10-2000 chars)",
  "unidadeId": "uuid|null",
  "categoriaServico": "string (default 'Manutenção Geral')",
  "prestadorServicoId": "uuid|null",
  "dataAgendamento": "datetime|null",
  "custoEstimado": 0.0,
  "prioridade": "Baixa" | "Media" | "Alta" | "Urgente (default Media)",
  "fotos": ["string (URL/base64)|null"]
}
```
**Response 201** (`OrdemServicoDto`)

#### 11.2.5. **GET** `/syndic/os` (Síndico Lista Todas OS)

**Descrição**: (Síndico) Lista todas as Ordens de Serviço do condomínio.
**Path**: `/api/v1/syndic/os`
**Acesso**: `Sindico`
**Query Params**:
*   `status` (string, opcional)
*   `prioridade` (string, opcional)
**Response 200** (`IEnumerable<OrdemServicoDto>`)

#### 11.2.6. **GET** `/syndic/os/{id}` (Síndico Detalha OS)

**Descrição**: (Síndico) Obtém detalhes de uma Ordem de Serviço específica.
**Path**: `/api/v1/syndic/os/{id:guid}`
**Acesso**: `Sindico`
**Response 200** (`OrdemServicoDto`)
**Erros Comuns**:
*   `404 Not Found`.

#### 11.2.7. **PUT** `/syndic/os/{id}` (Síndico Atualiza OS)

**Descrição**: (Síndico) Atualiza o status ou outros detalhes de uma Ordem de Serviço.
**Path**: `/api/v1/syndic/os/{id:guid}`
**Acesso**: `Sindico`
**Request Body** (`OrdemServicoStatusUpdateDto`)
```json
{
  "status": "string (e.g., EmAndamento, Concluida, Cancelada)",
  "observacaoInterna": "string|null (max 1000 chars)"
}
```
**Response 204** (No Content) (*Controller retorna NoContent após `AtualizarOSPorSindicoAsync`*)
**Erros Comuns**:
*   `400 Bad Request`: (`INVALID_OPERATION`) Ex: transição de status inválida.

#### 11.2.8. **GET** `/prestador/os` (Prestador Lista Suas OS)

**Descrição**: (Prestador) Lista as Ordens de Serviço atribuídas ao prestador logado.
**Path**: `/api/v1/prestador/os`
**Acesso**: `Prestador` (Role a ser criada/atribuída)
**Query Params**:
*   `status` (string, opcional)
**Response 200** (`IEnumerable<OrdemServicoDto>`)

#### 11.2.9. **PUT** `/prestador/os/{id}/atualizar` (Prestador Atualiza Progresso)

**Descrição**: (Prestador) Atualiza o progresso de uma Ordem de Serviço.
**Path**: `/api/v1/prestador/os/{id:guid}/atualizar`
**Acesso**: `Prestador`
**Request Body** (`OrdemServicoProgressoUpdateDto`)
```json
{
  "status": "string (e.g., EmAndamento, Finalizada)",
  "descricaoProgresso": "string (10-2000 chars)",
  "fotosEvidencia": ["string (URL/base64)|null"],
  "percentualConclusao": "int|null (0-100)"
}
```
**Response 200** (`OrdemServicoDto`) - OS Atualizada.
**Erros Comuns**:
*   `400 Bad Request`: (`INVALID_OPERATION`)
*   `404 Not Found`: OS não encontrada ou não pertence ao prestador.

---
## 12. Biblioteca Documental

Endpoints gerenciados por `DocumentosController.cs`. Rota base: `/api/v1/docs`.

### 12.1. **POST** `/syndic/docs` (Upload de Documento)

**Descrição**: (Síndico) Realiza o upload de um novo documento para o condomínio.
**Path**: `/api/v1/docs/syndic/docs`
**Acesso**: `Sindico`
**Content-Type**: `multipart/form-data`
**Form Data**:
*   `file` (arquivo, obrigatório): O arquivo a ser enviado (limite 10MB).
*   `tituloDescritivo` (string, opcional): Título do documento.
*   `categoria` (string, opcional, default "Geral").
**Response 201** (`DocumentoDto`)
```json
{
  "id": "uuid",
  "tituloDescritivo": "string",
  "categoria": "string",
  "nomeArquivoOriginal": "string",
  "tipoArquivo": "string (MIME type)",
  "tamanhoArquivoBytes": 0,
  "url": "string (URL para visualização/download)",
  "dataUpload": "datetime",
  "usuarioUploadId": "uuid"
}
```
**Erros Comuns**:
*   `400 Bad Request`: Arquivo não fornecido, inválido, ou erro no processamento.
*   `501 Not Implemented`: Se o serviço de storage não estiver configurado.

### 12.2. **GET** `/app/docs` (Listar Documentos)

**Descrição**: Lista os documentos do condomínio.
**Path**: `/api/v1/docs/app/docs`
**Acesso**: `Sindico`, `Condomino`, `Inquilino`
**Query Params**:
*   `categoria` (string, opcional): Filtra por categoria.
**Response 200** (`IEnumerable<DocumentoDto>`) - Lista de objetos com estrutura de 12.1 Response.

### 12.3. **GET** `/app/docs/{id}` (Detalhe do Documento)

**Descrição**: Obtém um documento específico pelo ID.
**Path**: `/api/v1/docs/app/docs/{id:guid}`
**Acesso**: `Sindico`, `Condomino`, `Inquilino`
**Response 200** (`DocumentoDto`) - Estrutura de 12.1 Response.
**Erros Comuns**:
*   `404 Not Found`.

### 12.4. **GET** `/download/{id}` (Download de Documento)

**Descrição**: Realiza o download de um documento específico.
**Path**: `/api/v1/docs/download/{id:guid}`
**Acesso**: `Sindico`, `Condomino`, `Inquilino`
**Response 200** (File Stream) - O arquivo para download.
**Erros Comuns**:
*   `404 Not Found`: Documento não encontrado ou arquivo físico ausente.
*   `501 Not Implemented`: Se o serviço de storage não estiver configurado.

### 12.5. **DELETE** `/syndic/docs/{id}` (Deletar Documento)

**Descrição**: (Síndico) Deleta um documento do sistema (e do storage).
**Path**: `/api/v1/docs/syndic/docs/{id:guid}`
**Acesso**: `Sindico`
**Response 204** (No Content)
**Erros Comuns**:
*   `404 Not Found`.
*   `500 Internal Server Error`: Erro ao deletar arquivo físico.

---
## 13. Relatórios & KPIs

### 13.1. **GET** `/financeiro/relatorios/balancete` (Síndico)

**Descrição**: Gera o relatório de balancete para um período. (Já detalhado na Seção 4.4.1)
**Acesso**: `Sindico`
*Nota: Anteriormente listado como `/syndic/reports/balancete`. O controller `FinanceiroController` implementa em `/api/v1/financeiro/relatorios/balancete`.*

### 13.2. **GET** `/accountant/reports/dirf` (*Não Implementado*)

**Descrição**: (Contador) Gera relatório DIRF anual.
*Endpoint não encontrado nos controllers analisados.*

### 13.3. **GET** `/syndic/reports/dashboard` (Síndico Dashboard Geral)

**Descrição**: Obtém os dados consolidados para o dashboard geral do síndico.
**Path**: `/api/v1/syndic/reports/dashboard` (Gerenciado por `DashboardController.cs`)
**Acesso**: `Sindico`
**Response 200** (`DashboardGeralDto`)
```json
{
  "metricas": {
    "inadimplenciaPercentual": 0.0,
    "inadimplenciaValorTotal": 0.0,
    "saldoDisponivel": 0.0,
    "proximasDespesas": [
      {
        "id": "uuid",
        "descricao": "string",
        "valor": 0.0,
        "dataVencimento": "datetime"
      }
    ]
  },
  "alertas": [
    {
      "id": "uuid",
      "titulo": "string",
      "mensagem": "string",
      "criticidade": "normal" | "alta" | "critica",
      "dataCriacao": "datetime"
    }
  ],
  "atividadesRecentes": [
    {
      "id": "uuid",
      "tipo": "Chamado" | "Aviso" | "Reserva" | ..., // Tipo da atividade
      "descricao": "string (resumo da atividade)",
      "dataOcorrencia": "datetime"
    }
  ]
}
```
**Erros Comuns**:
*   `401 Unauthorized`: CondominioId inválido.
*   `404 Not Found`: Dados do dashboard não encontrados.

### 13.4. **GET** `/admin/reports/global` (*Não Implementado*)

**Descrição**: (Super-Admin) Métricas agregadas multi-condomínio.
*Endpoint não encontrado nos controllers analisados.*

---
## 14. Votações

Endpoints gerenciados por `VotacoesController.cs`. Rota base: `/api/v1/Votacoes` (ou conforme `[controller]` token).

### 14.1. **POST** `/syndic/votacoes` (Criar Votação)

**Descrição**: (Síndico) Cria uma nova votação para o condomínio.
**Path**: `/api/v1/Votacoes/syndic/votacoes`
**Acesso**: `Sindico`
**Request Body** (`VotacaoInputDto`)
```json
{
  "titulo": "string (3-150 chars)",
  "descricao": "string|null (max 500 chars)",
  "dataFim": "datetime|null", // Data e hora para encerramento automático
  "opcoes": [ // MinLength(2)
    { "descricao": "string (1-200 chars)" },
    { "descricao": "string (1-200 chars)" }
  ]
}
```
**Response 201** (`VotacaoDetalheDto`)
```json
{
  "id": "uuid",
  "titulo": "string",
  "descricao": "string|null",
  "dataInicio": "datetime",
  "dataFim": "datetime|null",
  "status": "Aberta" | "Encerrada" | "Apurada",
  "opcoes": [
    { "id": "uuid", "descricao": "string", "quantidadeVotos": 0 }
  ],
  "criadoPor": "uuid", // ID do usuário síndico que criou
  "usuarioJaVotou": false // Relativo ao usuário que consulta (se aplicável na criação, será false)
}
```
**Erros Comuns**:
*   `400 Bad Request`: Dados inválidos.
*   `401 Unauthorized`: Claims inválidas.

### 14.2. **GET** `/app/votacoes` (Listar Votações Abertas)

**Descrição**: Lista as votações abertas para o condomínio do usuário.
**Path**: `/api/v1/Votacoes/app/votacoes`
**Acesso**: `Sindico`, `Condomino`, `Inquilino`
**Response 200** (`IEnumerable<VotacaoResumoDto>`)
```json
[
  {
    "id": "uuid",
    "titulo": "string",
    "dataInicio": "datetime",
    "dataFim": "datetime|null",
    "status": "Aberta" | "Encerrada" | "Apurada"
  }
]
```
**Erros Comuns**:
*   `401 Unauthorized`: CondominioId inválido.

### 14.3. **GET** `/app/votacoes/{id}` (Detalhes da Votação)

**Descrição**: Obtém os detalhes de uma votação específica, incluindo se o usuário já votou.
**Path**: `/api/v1/Votacoes/app/votacoes/{id:guid}`
**Acesso**: `Sindico`, `Condomino`, `Inquilino`
**Response 200** (`VotacaoDetalheDto`) - Mesma estrutura de 14.1 Response, `usuarioJaVotou` será true/false.
**Erros Comuns**:
*   `401 Unauthorized`.
*   `404 Not Found`: Votação não encontrada.

### 14.4. **POST** `/app/votacoes/{id}/votar` (Registrar Voto)

**Descrição**: Registra um voto em uma opção de uma votação específica.
**Path**: `/api/v1/Votacoes/app/votacoes/{id:guid}/votar`
**Acesso**: `Sindico`, `Condomino`, `Inquilino`
**Request Body** (`VotoInputDto`)
```json
{
  "opcaoId": "uuid" // ID da opção escolhida
}
```
**Response 200**
```json
"Voto registrado com sucesso."
```
**Erros Comuns**:
*   `400 Bad Request`: Votação não aberta, opção inválida (`InvalidOperationException`).
*   `401 Unauthorized`.
*   `404 Not Found`: Votação ou opção não encontrada.
*   `409 Conflict`: Usuário já votou (`InvalidOperationException`).

### 14.5. **GET** `/syndic/votacoes/{id}/resultado` (Resultado da Votação)

**Descrição**: (Síndico) Obtém os resultados de uma votação (inclui contagem de votos por opção).
**Path**: `/api/v1/Votacoes/syndic/votacoes/{id:guid}/resultado`
**Acesso**: `Sindico`
**Response 200** (`VotacaoDetalheDto`) - Mesma estrutura de 14.1 Response, com `quantidadeVotos` preenchido para cada opção.
**Erros Comuns**:
*   `401 Unauthorized`.
*   `404 Not Found`: Votação não encontrada.

### 14.6. **PUT** `/syndic/votacoes/{id}/encerrar` (Encerrar Votação)

**Descrição**: (Síndico) Encerra manualmente uma votação que está em andamento.
**Path**: `/api/v1/Votacoes/syndic/votacoes/{id:guid}/encerrar`
**Acesso**: `Sindico`
**Response 200**
```json
"Votação encerrada com sucesso."
```
**Erros Comuns**:
*   `401 Unauthorized`.
*   `404 Not Found`: Votação não encontrada ou já encerrada.

---
## 15. Configurações & Parametrizações

*Nota: Nenhum controller dedicado para configurações gerais do sistema, condomínio (além do CRUD básico em `CondominiosController`), ou de módulos específicos (como cobrança, reservas) foi encontrado na análise. Esta seção é um placeholder para funcionalidades futuras ou que podem estar em outros sistemas/locais.*

### 15.1. Configurações de Cobrança (Síndico) - *Não Implementado*
*   `GET /syndic/settings/cobranca`
*   `PUT /syndic/settings/cobranca`

### 15.2. Configurações de Reservas (Síndico) - *Não Implementado*
*   `GET /syndic/settings/reservas`
*   `PUT /syndic/settings/reservas`

### 15.3. Configurações de Notificações (Síndico) - *Não Implementado*
*   `GET /syndic/settings/notificacoes`
*   `PUT /syndic/settings/notificacoes`

### 15.4. Configurações de Gateway de Pagamento (Admin) - *Não Implementado*
*   `GET /admin/settings/psp`
*   `PUT /admin/settings/psp`

---
## 16. Notificações & Tempo-Real

### 16.1. **POST** `/app/notify/subscribe` (*Não Implementado*)

**Descrição**: Registra o token do dispositivo (FCM/APNS) para recebimento de notificações push.
*Endpoint não encontrado nos controllers analisados.*

### 16.2. WebSocket / SignalR (*Não Implementado*)

**Descrição**: Conexão para recebimento de atualizações em tempo-real.
*Nenhuma implementação de Hub SignalR (e.g., `class MyHub : Hub` ou `Hub<T>`) foi encontrada nos projetos `conViver.API` ou `conViver.Infrastructure`.*
Endpoints como `wss://<baseUrl>/ws` e hubs (`/ws/dashboard`, `/ws/gate`, `/ws/notify`) não foram confirmados.

---
## Códigos de Erro Padrão
HTTP	Code	Descrição
400	INVALID_PAYLOAD	JSON malformado ou dados de input semanticamente incorretos.
400	BAD_REQUEST     Requisição inválida por outros motivos (e.g. violação de regra de negócio específica do endpoint, query param mal formatado).
401	UNAUTHORIZED    Autenticação falhou (token não enviado, inválido ou expirado) ou usuário não tem as claims necessárias (e.g. `condominioId`).
403	FORBIDDEN	Usuário autenticado, mas não tem permissão para acessar o recurso/operação (baseado em Roles).
404	NOT_FOUND	Recurso não existe.
409	CONFLICT        Violação de regra de negócio que impede a execução (e.g., recurso já existe, estado inválido para a operação).
422	VALIDATION_ERROR	(Menos comum se usando `ModelState` para 400) Falha específica em validações de campo (ex: e-mail já cadastrado).
500 INTERNAL_SERVER_ERROR Erro inesperado no servidor.
501 NOT_IMPLEMENTED Funcionalidade (e.g. serviço dependente como storage) não implementada/configurada.


Fim do API Reference – conViver
Para exemplos de uso, integre com o Swagger UI disponível em `/swagger` (se configurado).
Qualquer dúvida, consulte o código dos Controllers e DTOs ou os testes de integração.
````
