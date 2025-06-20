
# Modelo de Dados – conViver

**Data:** 16/06/2025 (Atualizado em [YYYY-MM-DD])
**Timezone:** America/Recife (UTC-3)
**Banco:** PostgreSQL 16 (DDL abaixo)

Este documento descreve o esquema relacional completo, convenções, tabelas, colunas, relacionamentos e índices necessários para implementar o modelo de dados da plataforma conViver, com base no `ConViverDbContextModelSnapshot.cs`.

---

## 📜 Convenções

- **snake_case** para nomes de tabelas e colunas.
- **UUID** (`uuid`) como PK para a maioria das tabelas (`id`).
- Colunas de data/hora: `TIMESTAMPTZ` (`timestamp with time zone`) para `created_at`, `updated_at` e outros campos de data/hora.
- Colunas monetárias: `NUMERIC(14,2)` (a menos que especificado de outra forma).
- FKs seguem o padrão `<tabela_referenciada>_id`.
- `created_at`/`updated_at` com `DEFAULT NOW()` são ideais, mas o snapshot não especifica defaults, então omitidos no DDL gerado a partir do snapshot. O EF Core gerencia esses valores na aplicação.
- JSONB para campos semi-estruturados (ex.: `condominios.endereco`).
- Enums são armazenados como `INTEGER` no banco de dados conforme o snapshot.

---

## 🗄️ Tabelas e DDL

### 1. `condominios`

```sql
CREATE TABLE condominios (
  id UUID PRIMARY KEY,
  nome TEXT NOT NULL, -- VARCHAR(120) no doc original
  cnpj TEXT NULL,      -- CHAR(14) UNIQUE no doc original. Snapshot não especifica UNIQUE nem tamanho fixo.
  ativo BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  -- Endereco (Owned Entity)
  endereco_logradouro TEXT NOT NULL,
  endereco_numero TEXT NOT NULL,
  endereco_complemento TEXT NULL, -- Adicionado, não estava no JSONB do doc original
  endereco_bairro TEXT NOT NULL,
  endereco_cidade TEXT NOT NULL,
  endereco_uf TEXT NOT NULL,
  endereco_cep TEXT NOT NULL
);
```
*Nota: `endereco` é um `Owned Entity` no EF Core, resultando em colunas prefixadas na tabela `condominios`.*

### 2. `unidades`

```sql
CREATE TABLE unidades (
  id UUID PRIMARY KEY,
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  identificacao TEXT NOT NULL, -- VARCHAR(30) no doc original
  fracao_ideal NUMERIC NOT NULL, -- NUMERIC(8,5) no doc original. Snapshot usa "TEXT" que mapeia para NUMERIC sem precisão especificada.
  tipo TEXT NOT NULL -- VARCHAR(20) no doc original
  -- Snapshot não mostra UNIQUE(condominio_id, identificacao), mas é uma boa prática.
);
```

### 3. `usuarios`

```sql
CREATE TABLE usuarios (
  id UUID PRIMARY KEY,
  nome TEXT NOT NULL, -- VARCHAR(120) no doc original
  email TEXT NOT NULL UNIQUE, -- CITEXT no doc original, snapshot não especifica CITEXT
  senha_hash TEXT NOT NULL, -- VARCHAR(255) no doc original
  telefone TEXT NULL,
  perfil INTEGER NOT NULL, -- Enum PerfilUsuario (VARCHAR(20) no doc original)
  ativo BOOLEAN NOT NULL,
  two_fa_secret TEXT NULL, -- VARCHAR(32) no doc original
  password_reset_token TEXT NULL,
  password_reset_token_expiry TIMESTAMPTZ NULL,
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  unidade_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE, -- Relacionamento direto
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

### 4. `membros_unidade` (*Removida*)
*Nota: Esta tabela não existe no snapshot. O relacionamento entre `usuarios` e `unidades` é direto (um usuário pertence a uma unidade principal).*

### 5. `regras_cobranca` (*Não Implementada/Encontrada*)
*Nota: Esta tabela não foi encontrada no `ConViverDbContextModelSnapshot.cs`.*

### 6. `boletos`

```sql
CREATE TABLE boletos (
  id UUID PRIMARY KEY,
  unidade_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE, -- Assumindo FK para unidades
  nosso_numero TEXT NOT NULL,
  linha_digitavel TEXT NOT NULL,
  codigo_banco TEXT NOT NULL,
  valor NUMERIC NOT NULL, -- NUMERIC(14,2) no doc original
  data_vencimento TIMESTAMPTZ NOT NULL, -- DATE no doc original
  status INTEGER NOT NULL, -- Enum BoletoStatus (VARCHAR(12) no doc original)
  data_registro TIMESTAMPTZ NULL, -- DATE no doc original
  data_envio TIMESTAMPTZ NULL,    -- DATE no doc original
  data_pagamento TIMESTAMPTZ NULL, -- DATE no doc original
  valor_pago NUMERIC NULL,     -- NUMERIC(14,2) no doc original
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
  -- CONSTRAINT uk_boleto UNIQUE(nosso_numero, codigo_banco) -- Presente no DbContext, verificar snapshot
);
```
*Índice `IX_Boletos_NossoNumero_CodigoBanco` (UNIQUE) está no snapshot.*

### 7. `pagamentos` (*Não Implementada/Encontrada*)
*Nota: Esta tabela não foi encontrada no `ConViverDbContextModelSnapshot.cs`. Existe `LancamentoFinanceiro`.*

### 8. `lancamentos` (LancamentoFinanceiro)
*Nota: Esta tabela existe no snapshot como `Lancamentos` (`LancamentoFinanceiro` entidade).*
```sql
CREATE TABLE lancamentos (
  id UUID PRIMARY KEY,
  unidade_id UUID NOT NULL, -- Provavelmente REFERENCES unidades(id), mas snapshot não detalha FK
  tipo TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data TIMESTAMPTZ NOT NULL,
  descricao TEXT NULL
);
```

### 9. `acordos` & `parcelas_acordo` (*Não Implementadas/Encontradas*)
*Nota: Estas tabelas não foram encontradas no `ConViverDbContextModelSnapshot.cs`.*

### 10. `reservas`

```sql
CREATE TABLE reservas (
  id UUID PRIMARY KEY,
  unidade_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE, -- Assumindo FK
  area TEXT NOT NULL, -- VARCHAR(60) no doc original
  inicio TIMESTAMPTZ NOT NULL,
  fim TIMESTAMPTZ NOT NULL,
  status INTEGER NOT NULL, -- Enum ReservaStatus (VARCHAR(12) no doc original)
  taxa NUMERIC NULL,    -- NUMERIC(14,2) no doc original
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

### 11. `avisos`

```sql
CREATE TABLE avisos (
  id UUID PRIMARY KEY,
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE, -- Assumindo FK
  categoria TEXT NOT NULL, -- VARCHAR(20) no doc original
  titulo TEXT NOT NULL,    -- VARCHAR(140) no doc original
  corpo TEXT NULL,
  publicado_em TIMESTAMPTZ NOT NULL, -- No snapshot, não DEFAULT NOW()
  publicado_por UUID NULL REFERENCES usuarios(id), -- Adicionado
  created_at TIMESTAMPTZ NOT NULL, -- Adicionado
  updated_at TIMESTAMPTZ NOT NULL  -- Adicionado
);
```

### 12. `visitantes`

```sql
CREATE TABLE visitantes (
  id UUID PRIMARY KEY,
  unidade_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE, -- Assumindo FK
  nome TEXT NOT NULL, -- VARCHAR(120) no doc original
  documento TEXT NULL, -- VARCHAR(20) no doc original
  foto_url TEXT NULL,
  data_chegada TIMESTAMPTZ NOT NULL,
  data_saida TIMESTAMPTZ NULL,
  status INTEGER NOT NULL, -- Enum VisitanteStatus
  motivo_visita TEXT NULL, -- Novo
  horario_saida_previsto TIMESTAMPTZ NULL, -- Novo
  observacoes TEXT NULL, -- Novo
  pre_autorizado_por_condomino_id UUID NULL, -- Novo
  qr_code TEXT NULL, -- Novo
  data_validade_pre_autorizacao TIMESTAMPTZ NULL, -- Novo
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

### 13. `encomendas`

```sql
CREATE TABLE encomendas (
  id UUID PRIMARY KEY,
  unidade_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE, -- Assumindo FK
  descricao TEXT NULL, -- VARCHAR(140) no doc original
  foto_url TEXT NULL,
  recebido_por UUID NULL, -- REFERENCES usuarios(id) - Snapshot não detalha FK
  recebido_em TIMESTAMPTZ NOT NULL,
  retirado_em TIMESTAMPTZ NULL,
  retirado_por UUID NULL, -- REFERENCES usuarios(id) - Snapshot não detalha FK
  status INTEGER NOT NULL, -- Enum EncomendaStatus
  codigo_rastreio TEXT NULL, -- Novo
  codigo_retirada TEXT NULL, -- Novo
  data_status TIMESTAMPTZ NOT NULL, -- Novo (Data da última mudança de Status)
  observacoes TEXT NULL, -- Novo
  remetente TEXT NULL, -- Novo
  retirado_por_terceiro_documento TEXT NULL, -- Novo
  retirado_por_terceiro_nome TEXT NULL, -- Novo
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

### 14. `prestadores` (PrestadorServico)

```sql
CREATE TABLE prestadores (
  id UUID PRIMARY KEY,
  nome TEXT NOT NULL, -- VARCHAR(120) no doc original
  telefone TEXT NULL, -- VARCHAR(20) no doc original
  especialidade TEXT NULL, -- VARCHAR(60) no doc original
  rating_medio DOUBLE PRECISION NULL, -- NUMERIC(2,1) no doc original, snapshot "REAL"
  ativo BOOLEAN NOT NULL, -- Novo
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE, -- Novo, assumindo FK
  documento TEXT NULL, -- Novo
  email TEXT NULL, -- Novo
  endereco_completo TEXT NULL, -- Novo
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

### 15. `ordens_servico` (OrdemServico)

```sql
CREATE TABLE ordens_servico (
  id UUID PRIMARY KEY,
  unidade_id UUID NOT NULL, -- REFERENCES unidades(id) - Snapshot não detalha FK
  prestador_id UUID NULL, -- REFERENCES prestadores(id) - Snapshot não detalha FK
  descricao TEXT NULL,
  status INTEGER NOT NULL, -- Enum OrdemServicoStatus (VARCHAR(15) no doc original)
  criado_em TIMESTAMPTZ NOT NULL,
  concluido_em TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL -- Adicionado
);
```

### 16. `logs_auditoria` (*Não Implementada/Encontrada*)
*Nota: Esta tabela não foi encontrada no `ConViverDbContextModelSnapshot.cs`.*

### 17. `documentos`
*Nota: Tabela presente no snapshot, adicionando.*
```sql
CREATE TABLE documentos (
  id UUID PRIMARY KEY,
  titulo_descritivo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  nome_arquivo_original TEXT NOT NULL,
  tipo_arquivo TEXT NOT NULL, -- MIME Type
  tamanho_arquivo_bytes BIGINT NOT NULL, -- INTEGER no snapshot, mas BIGINT é mais seguro para bytes
  url TEXT NOT NULL,
  data_upload TIMESTAMPTZ NOT NULL,
  usuario_upload_id UUID NOT NULL, -- REFERENCES usuarios(id) - Snapshot não detalha FK
  condominio_id UUID NOT NULL -- REFERENCES condominios(id) - Snapshot não detalha FK
);
```

### 18. `chamados`
*Nota: Tabela presente no snapshot, adicionando/atualizando.*
```sql
CREATE TABLE chamados (
  id UUID PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  fotos TEXT NOT NULL, -- Mapeado como TEXT para JSON array de strings
  status TEXT NOT NULL, -- Idealmente um ENUM ou INTEGER referenciando um tipo
  data_abertura TIMESTAMPTZ NOT NULL,
  data_resolucao TIMESTAMPTZ NULL,
  usuario_id UUID NOT NULL, -- REFERENCES usuarios(id) - Snapshot não detalha FK
  unidade_id UUID NULL, -- REFERENCES unidades(id) - Snapshot não detalha FK
  condominio_id UUID NOT NULL, -- REFERENCES condominios(id) - Snapshot não detalha FK
  resposta_do_sindico TEXT NULL,
  avaliacao_nota INTEGER NULL,
  avaliacao_comentario TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

### 19. `avaliacoes_prestadores` (AvaliacaoPrestador)
*Nota: Tabela presente no snapshot, adicionando.*
```sql
CREATE TABLE avaliacoes_prestadores (
  id UUID PRIMARY KEY,
  prestador_servico_id UUID NOT NULL REFERENCES prestadores(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL, -- REFERENCES usuarios(id) - Snapshot não detalha FK
  condominio_id UUID NOT NULL, -- REFERENCES condominios(id) - Snapshot não detalha FK
  ordem_servico_id UUID NULL, -- REFERENCES ordens_servico(id) - Snapshot não detalha FK
  nota INTEGER NOT NULL,
  comentario TEXT NULL,
  data_avaliacao TIMESTAMPTZ NOT NULL
);
```
*Índice `IX_AvaliacoesPrestadores_PrestadorServicoId_UsuarioId_OrdemServicoId` está no snapshot.*

### 20. `votacoes` (Votacao)
*Nota: Tabela presente no snapshot, adicionando.*
```sql
CREATE TABLE votacoes (
  id UUID PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ NULL,
  status TEXT NOT NULL, -- Idealmente um ENUM ou INTEGER
  criado_por UUID NOT NULL, -- REFERENCES usuarios(id) - Snapshot não detalha FK
  condominio_id UUID NOT NULL -- REFERENCES condominios(id) - Snapshot não detalha FK
);
```

### 21. `opcoes_votacao` (OpcaoVotacao)
*Nota: Tabela presente no snapshot, adicionando.*
```sql
CREATE TABLE opcoes_votacao (
  id UUID PRIMARY KEY,
  votacao_id UUID NOT NULL REFERENCES votacoes(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL
);
```

### 22. `votos_registrados` (VotoRegistrado)
*Nota: Tabela presente no snapshot, adicionando.*
```sql
CREATE TABLE votos_registrados (
  id UUID PRIMARY KEY,
  opcao_votacao_id UUID NOT NULL REFERENCES opcoes_votacao(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL, -- REFERENCES usuarios(id) - Snapshot não detalha FK
  data_voto TIMESTAMPTZ NOT NULL
);
```

---
## 🔗 Relacionamentos (Conforme Snapshot e DbContext)

- `condominios` 1 → ∞ `unidades`
- `unidades` 1 → ∞ `usuarios` (Cada usuário tem uma `unidade_id` principal)
- `unidades` 1 → ∞ `boletos` (Implícito, `boletos.unidade_id`)
- `unidades` 1 → ∞ `reservas` (`reservas.unidade_id`)
- `unidades` 1 → ∞ `visitantes` (`visitantes.unidade_id`)
- `unidades` 1 → ∞ `encomendas` (`encomendas.unidade_id`)
- `unidades` 1 → ∞ `ordens_servico` (Implícito, `ordens_servico.unidade_id`)
- `unidades` 1 → ∞ `lancamentos` (Implícito, `lancamentos.unidade_id`)
- `condominios` 1 → ∞ `avisos` (`avisos.condominio_id`)
- `condominios` 1 → ∞ `prestadores` (`prestadores.condominio_id`)
- `condominios` 1 → ∞ `documentos` (`documentos.condominio_id`)
- `condominios` 1 → ∞ `chamados` (`chamados.condominio_id`)
- `condominios` 1 → ∞ `votacoes` (`votacoes.condominio_id`)
- `condominios` 1 → ∞ `avaliacoes_prestadores` (`avaliacoes_prestadores.condominio_id`)
- `usuarios` 1 → ∞ `avisos` (`avisos.publicado_por`, opcional)
- `usuarios` 1 → ∞ `documentos` (`documentos.usuario_upload_id`)
- `usuarios` 1 → ∞ `chamados` (`chamados.usuario_id`)
- `usuarios` 1 → ∞ `votacoes` (`votacoes.criado_por`)
- `usuarios` 1 → ∞ `avaliacoes_prestadores` (`avaliacoes_prestadores.usuario_id`)
- `usuarios` 1 → ∞ `votos_registrados` (`votos_registrados.usuario_id`)
- `prestadores` 1 → ∞ `avaliacoes_prestadores` (`avaliacoes_prestadores.prestador_servico_id`)
- `prestadores` 1 → ∞ `ordens_servico` (Implícito, `ordens_servico.prestador_id`, opcional)
- `votacoes` 1 → ∞ `opcoes_votacao` (`opcoes_votacao.votacao_id`)
- `opcoes_votacao` 1 → ∞ `votos_registrados` (`votos_registrados.opcao_votacao_id`)
- `ordens_servico` 1 → ∞ `avaliacoes_prestadores` (`avaliacoes_prestadores.ordem_servico_id`, opcional)

---
## ⚡ Índices Implementados (Conforme Snapshot)

- `boletos`: `IX_Boletos_NossoNumero_CodigoBanco` (UNIQUE) em (`nosso_numero`, `codigo_banco`)
- `usuarios`: `IX_Usuarios_UnidadeId` em (`unidade_id`)
- `opcoes_votacao`: `IX_OpcoesVotacao_VotacaoId` em (`votacao_id`)
- `votos_registrados`: `IX_VotosRegistrados_OpcaoVotacaoId` em (`opcao_votacao_id`)
- `avaliacoes_prestadores`: `IX_AvaliacoesPrestadores_PrestadorServicoId_UsuarioId_OrdemServicoId` em (`prestador_servico_id`, `usuario_id`, `ordem_servico_id`) (Não unique no DB, regra de negócio na aplicação)

*(Outros índices como os de FKs são geralmente criados por padrão pelo EF Core/PostgreSQL, mas não listados explicitamente no snapshot, a menos que configurados com `HasIndex` no `DbContext`).*

---
## 🔮 Evolução & Particionamento

- **Sharding/Particionamento**: Considerar para `boletos`, `lancamentos`, `visitantes`, `encomendas` por `condominio_id` e/ou período (`created_at`) se o volume por condomínio ou geral se tornar excessivo.
- **Full-Text Search**: GIN em `avisos(corpo, titulo)`, `documentos(titulo_descritivo, conteudo_extraido_ocr)` pode ser útil.
- **Tipos Enum**: Para colunas como `status` e `perfil`, considerar o uso de tipos ENUM do PostgreSQL para melhor integridade de dados, em vez de `INTEGER` ou `TEXT` puros, se o conjunto de valores for estritamente definido e raramente alterado.

---
## ✅ Próximos Passos

- Validar visualmente o esquema (ex: usando dbdiagram.io).
- Garantir que as migrations do EF Core estejam alinhadas com este esquema desejado para PostgreSQL.
- Criar scripts de seed para dados de demonstração.
- Escrever testes de integração para validar FKs, constraints e cascades.

Fim do documento

