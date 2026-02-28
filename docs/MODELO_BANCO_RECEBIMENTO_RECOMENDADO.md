# Modelo de banco recomendado para recebimento

## Objetivo

Ajustar a tabela `public.recebimentos` que voce ja usa hoje, sem criar uma tabela separada para lotes.

A ideia aqui e:

1. manter a tabela atual
2. adicionar somente as colunas que faltam
3. permitir que `com_nf` e `sem_nf` usem a mesma tabela
4. guardar fotos e pendencias na propria `recebimentos`

## Decisao adotada

Usar apenas a tabela `public.recebimentos`.

Sem criar tabela nova de lote.

E guardar no proprio registro:

- dados do lote
- dados do item recebido
- fotos das etiquetas
- pendencias do wizard

## Tabela `recebimentos`

### Colunas atuais mantidas

- `id`
- `data`
- `analisado_por`
- `codigo_nf`
- `modelo_fabricante`
- `ean`
- `nf`
- `status`
- `data_recebimento`
- `created_at`
- `updated_at`

### Colunas novas recomendadas

- `tipo_recebimento text`
- `lote_numero bigint`
- `lote_status text`
- `lote_criado_por text`
- `lote_iniciado_em timestamptz`
- `lote_finalizado_em timestamptz`
- `numero_item integer`
- `recebido_por text`
- `codigo_unico text`
- `numero_serie text`
- `modelo_referencia text`
- `fornecedor text`
- `finalizado_em timestamptz`
- `observacoes text`
- `fotos_etiquetas jsonb`
- `etiquetas_missing jsonb`
- `pendencias jsonb`

## Motivo de usar JSONB nas fotos

Como voce pediu para ajustar a tabela atual e nao abrir outra estrutura, o melhor equilibrio agora e:

- `fotos_etiquetas jsonb`
- `etiquetas_missing jsonb`
- `pendencias jsonb`

Assim a tabela continua unica e ainda consegue guardar o que o wizard precisa.

## Estrutura sugerida dos JSONB

### `fotos_etiquetas`

Exemplo:

```json
{
  "codigo_unico": {
    "file_name": "codigo_unico_1.jpg",
    "preview_url": "https://...",
    "storage_path": "recebimentos/abc/codigo_unico.jpg"
  },
  "vistoria_revenda": {
    "file_name": "vistoria.jpg",
    "preview_url": "https://...",
    "storage_path": "recebimentos/abc/vistoria.jpg"
  },
  "sat": {
    "file_name": "sat.jpg",
    "preview_url": "https://...",
    "storage_path": "recebimentos/abc/sat.jpg"
  }
}
```

### `etiquetas_missing`

Exemplo:

```json
{
  "codigo_unico": false,
  "vistoria_revenda": true,
  "sat": false
}
```

### `pendencias`

Exemplo:

```json
[
  "Coletar foto Vistoria Revenda"
]
```

## Mapeamento da tela atual para a tabela

### Dados do lote

Tela:

- `loteId`
- `loteStatus`
- `usuarioLogado`

Banco:

- `lote_numero`
- `lote_status`
- `lote_criado_por`

### Dados do item recebido

Tela:

- `numero`
- `recebidoPor`
- `codigoUnico`
- `codigoNf`
- `ns`

Banco:

- `numero_item`
- `recebido_por`
- `codigo_unico`
- `codigo_nf`
- `numero_serie`

### Variacao com NF / sem NF

Tela:

- `withNf`

Banco:

- `tipo_recebimento = 'com_nf'`
- `tipo_recebimento = 'sem_nf'`

### Fotos e pendencias

Tela:

- fotos das 3 etiquetas
- marcacao de indisponivel
- pendencias

Banco:

- `fotos_etiquetas`
- `etiquetas_missing`
- `pendencias`

## Regras de negocio recomendadas

### Recebimento com NF

- `tipo_recebimento = 'com_nf'`
- `codigo_nf` obrigatorio

### Recebimento sem NF

- `tipo_recebimento = 'sem_nf'`
- `codigo_nf` pode ser nulo

### Regras adicionais

- `codigo_unico` deve ser indexado
- `lote_numero` deve ser indexado
- `numero_item` deve ser controlado por lote
- `fotos_etiquetas` deve iniciar como objeto vazio
- `pendencias` deve iniciar como array vazio

## Vantagens dessa abordagem

1. reaproveita sua tabela atual
2. exige menos migracao no banco
3. simplifica a integracao inicial da UI
4. atende o que a tela atual precisa

## Desvantagens dessa abordagem

1. mistura dados do lote com dados do item
2. pode haver repeticao do mesmo lote em varias linhas
3. fotos em JSONB funcionam, mas nao sao o modelo mais normalizado

Mesmo assim, para o que voce pediu agora, essa abordagem e a mais direta.

## O que a migracao SQL entregue faz

O arquivo `scripts/update_recebimentos_schema_for_wizard.sql`:

1. altera a tabela `public.recebimentos`
2. adiciona colunas faltantes
3. cria constraints e indices
4. faz backfill basico dos dados legados
5. nao cria tabela nova de lote

## Limite importante

Essa migracao prepara o banco para o recebimento.

Ela ainda nao faz sozinha:

- a tela salvar no banco
- a tela ler do banco
- upload real de fotos
- integracao da NF com produtos

Esses pontos continuam dependendo de ajuste no codigo da aplicacao.
