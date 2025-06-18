
# Modelo de Dados – conViver

**Data:** 16/06/2025  **Timezone:** America/Recife  
**Banco:** PostgreSQL 16 (DDL abaixo)

Este documento descreve o esquema relacional completo, convenções, tabelas, colunas, relacionamentos e índices necessários para implementar o modelo de dados da plataforma conViver.

---

## 📜 Convenções

- **snake_case** para nomes de tabelas e colunas  
- **UUID v4** em `id` como PK  
- Colunas de data/hora: `timestamp with time zone` (`created_at`, `updated_at`)  
- Colunas monetárias: `numeric(14,2)`  
- FK `<tabela>_id`  
- `created_at`/`updated_at` default `now()`  
- JSONB para campos semi-estruturados (ex.: `endereco`)  

---

## 🗄️ Tabelas e DDL

### 1. condominios

```sql
CREATE TABLE condominios (
  id UUID PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  cnpj CHAR(14) UNIQUE,
  endereco JSONB NOT NULL, -- {logradouro,numero,bairro,cidade,uf,cep}
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


2. unidades
CREATE TABLE unidades (
  id UUID PRIMARY KEY,
  condominio_id UUID NOT NULL
    REFERENCES condominios(id) ON DELETE CASCADE,
  identificacao VARCHAR(30) NOT NULL,
  fracao_ideal NUMERIC(8,5) NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'residencial',
  UNIQUE(condominio_id, identificacao)
);


3. usuarios
CREATE TABLE usuarios (
  id UUID PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email CITEXT NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  perfil VARCHAR(20) NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  two_fa_secret VARCHAR(32),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


4. membros_unidade
CREATE TABLE membros_unidade (
  usuario_id UUID
    REFERENCES usuarios(id) ON DELETE CASCADE,
  unidade_id UUID
    REFERENCES unidades(id) ON DELETE CASCADE,
  papel VARCHAR(20) NOT NULL,          -- ex: sindico, proprietario, inquilino
  status VARCHAR(15) NOT NULL DEFAULT 'pendente',
  PRIMARY KEY(usuario_id, unidade_id)
);


5. regras_cobranca
CREATE TABLE regras_cobranca (
  id UUID PRIMARY KEY,
  condominio_id UUID UNIQUE
    REFERENCES condominios(id) ON DELETE CASCADE,
  dia_vencimento SMALLINT NOT NULL DEFAULT 5,
  multa_percent NUMERIC(5,2) NOT NULL DEFAULT 2.00,
  juros_dia_percent NUMERIC(5,3) NOT NULL DEFAULT 0.033,
  dias_tolerancia SMALLINT NOT NULL DEFAULT 0,
  desconto_pontualidade NUMERIC(5,2),
  enviar_email BOOLEAN NOT NULL DEFAULT TRUE,
  enviar_whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


6. boletos
CREATE TABLE boletos (
  id UUID PRIMARY KEY,
  unidade_id UUID NOT NULL
    REFERENCES unidades(id) ON DELETE CASCADE,
  nosso_numero VARCHAR(30) NOT NULL,
  linha_digitavel VARCHAR(60) NOT NULL,
  codigo_banco CHAR(3) NOT NULL,
  valor NUMERIC(14,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'gerado',
  data_registro DATE,
  data_envio DATE,
  data_pagamento DATE,
  valor_pago NUMERIC(14,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uk_boleto UNIQUE(nosso_numero, codigo_banco)
);


7. pagamentos
CREATE TABLE pagamentos (
  id UUID PRIMARY KEY,
  boleto_id UUID
    REFERENCES boletos(id),
  origem VARCHAR(12) NOT NULL,       -- pix, cartao, boleto
  valor_pago NUMERIC(14,2) NOT NULL,
  data_pgto TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(12) NOT NULL DEFAULT 'confirmado',
  trace_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


8. acordos & parcelas_acordo
CREATE TABLE acordos (
  id UUID PRIMARY KEY,
  unidade_id UUID
    REFERENCES unidades(id) ON DELETE CASCADE,
  valor_total NUMERIC(14,2) NOT NULL,
  entrada NUMERIC(14,2) NOT NULL,
  parcelas SMALLINT NOT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'ativo',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE parcelas_acordo (
  id UUID PRIMARY KEY,
  acordo_id UUID
    REFERENCES acordos(id) ON DELETE CASCADE,
  boleto_id UUID
    REFERENCES boletos(id) ON DELETE SET NULL,
  numero SMALLINT NOT NULL,
  valor NUMERIC(14,2) NOT NULL,
  vencimento DATE NOT NULL,
  pago BOOLEAN NOT NULL DEFAULT FALSE
);


9. reservas
CREATE TABLE reservas (
  id UUID PRIMARY KEY,
  unidade_id UUID
    REFERENCES unidades(id) ON DELETE CASCADE,
  area VARCHAR(60) NOT NULL,
  inicio TIMESTAMPTZ NOT NULL,
  fim TIMESTAMPTZ NOT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'pendente',
  taxa NUMERIC(14,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


10. avisos
CREATE TABLE avisos (
  id UUID PRIMARY KEY,
  condominio_id UUID
    REFERENCES condominios(id) ON DELETE CASCADE,
  categoria VARCHAR(20) NOT NULL,
  titulo VARCHAR(140) NOT NULL,
  corpo TEXT,
  publicado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  publicado_por UUID
    REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


11. visitantes
CREATE TABLE visitantes (
  id UUID PRIMARY KEY,
  unidade_id UUID
    REFERENCES unidades(id) ON DELETE CASCADE,
  nome VARCHAR(120) NOT NULL,
  documento VARCHAR(20),
  foto_url TEXT,
  data_chegada TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_saida TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


12. encomendas
CREATE TABLE encomendas (
  id UUID PRIMARY KEY,
  unidade_id UUID
    REFERENCES unidades(id) ON DELETE CASCADE,
  descricao VARCHAR(140),
  foto_url TEXT,
  recebido_por UUID
    REFERENCES usuarios(id),
  recebido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retirado_em TIMESTAMPTZ,
  retirado_por UUID
    REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


13. prestadores & ordens_servico
CREATE TABLE prestadores (
  id UUID PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  telefone VARCHAR(20),
  especialidade VARCHAR(60),
  rating NUMERIC(2,1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ordens_servico (
  id UUID PRIMARY KEY,
  unidade_id UUID
    REFERENCES unidades(id) ON DELETE CASCADE,
  prestador_id UUID
    REFERENCES prestadores(id),
  descricao TEXT,
  status VARCHAR(15) NOT NULL DEFAULT 'aberta',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  concluido_em TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


14. logs_auditoria
CREATE TABLE logs_auditoria (
  id UUID PRIMARY KEY,
  usuario_id UUID
    REFERENCES usuarios(id),
  acao VARCHAR(40) NOT NULL,
  entidade VARCHAR(40) NOT NULL,
  entity_id UUID,
  detalhes JSONB,
  trace_id UUID,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


🔗 Relacionamentos

condominios 1 → ∞ unidades  
unidades 1 → ∞ boletos, reservas, visitantes, encomendas, acordos  
acordos 1 → ∞ parcelas_acordo  
usuarios ∞ ↔ ∞ unidades (via membros_unidade)  
boletos 1 → ∞ pagamentos  
prestadores 1 → ∞ ordens_servico  

⚡ Índices Recomendados
CREATE INDEX idx_boletos_status ON boletos(status);
CREATE INDEX idx_boletos_vencimento ON boletos(data_vencimento);
CREATE INDEX idx_pagamentos_trace ON pagamentos(trace_id);
CREATE INDEX idx_reservas_area_inicio ON reservas(area, inicio);
CREATE INDEX idx_ordens_status ON ordens_servico(status);


🔮 Evolução & Particionamento

Sharding: particionar boletos e pagamentos por <condominio_id, ano_mes> se volume alto.  
Full-Text Search: GIN em avisos(corpo) para mural grande.  
Event Sourcing: aproveitar logs_auditoria para reconstruir eventos de domínio.  

✅ Próximos Passos

Importar este DDL no dbdiagram.io para validação visual.  
Gerar migrations via EF Core (usar esta fonte como autoridade).  
Criar scripts de seed para dados de demo (condomínios e unidades).  
Escrever testes de integração validando FKs, constraints e cascades.  

Fim do documento

