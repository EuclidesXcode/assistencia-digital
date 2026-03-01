# Fluxo Cadastro -> Pre-Analise -> Analise Tecnica

## O que foi implementado

### Cadastro
- O `SALVAR` do cadastro de produto agora cria ou sincroniza automaticamente a linha correspondente em `pre_analise`.
- A Pre-Analise recebe:
  - `produto_id`
  - `codigo_nf`
  - `modelo_ref`
  - `ean` / `gtin`
  - `recebido_por`
  - `respostas` com snapshot real de:
    - `embalagem`
    - `acessorios`
    - `estetica`
    - `funcional`
    - `funcionalidade`
    - `modelos`
    - `nfs`
    - `fotos`
    - `manualUrl`

### Pre-Analise
- A tela foi ligada a leitura real de `pre_analise`.
- A fila agora usa `status in ('pendente', 'em_analise')`.
- O historico usa `status in ('aprovado', 'reprovado')`.
- A etapa agora executa:
  - iniciar pre-analise -> `UPDATE pre_analise SET status = 'em_analise'`
  - finalizar pre-analise -> `UPDATE pre_analise SET status, analisado_por, data_analise, respostas`
- Ao aprovar a Pre-Analise, o sistema cria automaticamente a Analise Tecnica vinculada ao mesmo:
  - `produto_id`
  - `pre_analise_id`

### Analise Tecnica
- A tela foi ligada a leitura real de `analise_tecnica`.
- A fila usa `status in ('aguardando', 'em_analise')`.
- O historico usa `status = 'concluido'`.
- A etapa agora executa:
  - iniciar analise tecnica -> `UPDATE analise_tecnica SET status = 'em_analise'`
  - concluir analise tecnica -> `UPDATE analise_tecnica SET status = 'concluido', laudo_tecnico, observacoes, analisado_por`
- A Analise Tecnica exibe dados herdados da Pre-Analise pelo vinculo `pre_analise_id`.

## Arquivos alterados

- `app/home/produtos/page.tsx`
- `app/home/pre-analise/page.tsx`
- `app/home/analise-tecnica/page.tsx`
- `backend/services/preAnaliseService.ts`
- `backend/services/analiseTecnicaService.ts`
- `backend/models/PreAnalise.ts`
- `backend/models/AnaliseTecnica.ts`
- `backend/models/index.ts`
- `backend/database/schema.sql`
- `scripts/fluxo_cadastro_pre_analise_analise_tecnica.sql`

## Banco de dados

### Script para rodar no banco atual

Rodar o conteudo de:

- `scripts/fluxo_cadastro_pre_analise_analise_tecnica.sql`

Esse script faz:
- adiciona `produto_id` e `respostas` em `pre_analise`
- tenta backfill de `produto_id` por `ean + modelo_ref`
- remove duplicidade de `pre_analise` por `produto_id`
- cria FK `pre_analise -> produtos`
- aplica `NOT NULL` em `pre_analise.produto_id`
- cria unicidade em `pre_analise(produto_id)`
- cria trigger de `updated_at` em `pre_analise`
- cria ou ajusta `analise_tecnica`
- cria FK `analise_tecnica -> produtos`
- cria FK `analise_tecnica -> pre_analise`
- aplica `NOT NULL` em `analise_tecnica.produto_id`
- aplica `NOT NULL` em `analise_tecnica.pre_analise_id`
- cria unicidade em `analise_tecnica(pre_analise_id)`
- cria trigger de `updated_at` em `analise_tecnica`

### SQL principal

```sql
ALTER TABLE public.pre_analise
  ADD COLUMN IF NOT EXISTS produto_id UUID,
  ADD COLUMN IF NOT EXISTS respostas JSONB DEFAULT '{}'::jsonb;

UPDATE public.pre_analise pa
SET produto_id = p.id
FROM public.produtos p
WHERE pa.produto_id IS NULL
  AND COALESCE(pa.ean, '') = COALESCE(p.ean, '')
  AND COALESCE(pa.modelo_ref, '') = COALESCE(p.modelo_ref, '');

DELETE FROM public.pre_analise a
USING public.pre_analise b
WHERE a.id < b.id
  AND a.produto_id IS NOT NULL
  AND a.produto_id = b.produto_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pre_analise_produto_id_fkey'
  ) THEN
    ALTER TABLE public.pre_analise
      ADD CONSTRAINT pre_analise_produto_id_fkey
      FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.pre_analise
  ALTER COLUMN produto_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_pre_analise_produto
  ON public.pre_analise(produto_id);

DROP TRIGGER IF EXISTS set_pre_analise_updated_at ON public.pre_analise;
CREATE TRIGGER set_pre_analise_updated_at
  BEFORE UPDATE ON public.pre_analise
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.analise_tecnica (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id      UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  pre_analise_id  UUID NOT NULL REFERENCES public.pre_analise(id) ON DELETE CASCADE,
  data_entrada    TIMESTAMPTZ NOT NULL DEFAULT now(),
  origem          TEXT DEFAULT 'pre_analise',
  codigo_nf       TEXT,
  modelo_ref      TEXT,
  ean             TEXT,
  recebido_por    TEXT,
  analisado_por   TEXT,
  status          TEXT CHECK (status IN ('aguardando', 'em_analise', 'concluido')) DEFAULT 'aguardando',
  laudo_tecnico   TEXT,
  observacoes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analise_tecnica
  ADD COLUMN IF NOT EXISTS produto_id UUID,
  ADD COLUMN IF NOT EXISTS pre_analise_id UUID,
  ADD COLUMN IF NOT EXISTS data_entrada TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'pre_analise',
  ADD COLUMN IF NOT EXISTS codigo_nf TEXT,
  ADD COLUMN IF NOT EXISTS modelo_ref TEXT,
  ADD COLUMN IF NOT EXISTS ean TEXT,
  ADD COLUMN IF NOT EXISTS recebido_por TEXT,
  ADD COLUMN IF NOT EXISTS analisado_por TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aguardando',
  ADD COLUMN IF NOT EXISTS laudo_tecnico TEXT,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'analise_tecnica_produto_id_fkey'
  ) THEN
    ALTER TABLE public.analise_tecnica
      ADD CONSTRAINT analise_tecnica_produto_id_fkey
      FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'analise_tecnica_pre_analise_id_fkey'
  ) THEN
    ALTER TABLE public.analise_tecnica
      ADD CONSTRAINT analise_tecnica_pre_analise_id_fkey
      FOREIGN KEY (pre_analise_id) REFERENCES public.pre_analise(id) ON DELETE CASCADE;
  END IF;
END $$;

DELETE FROM public.analise_tecnica a
USING public.analise_tecnica b
WHERE a.id < b.id
  AND a.pre_analise_id IS NOT NULL
  AND a.pre_analise_id = b.pre_analise_id;

ALTER TABLE public.analise_tecnica
  ALTER COLUMN produto_id SET NOT NULL,
  ALTER COLUMN pre_analise_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analise_tecnica_status_created_at
  ON public.analise_tecnica (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analise_tecnica_produto_id
  ON public.analise_tecnica (produto_id);

CREATE INDEX IF NOT EXISTS idx_analise_tecnica_pre_analise_id
  ON public.analise_tecnica (pre_analise_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_analise_tecnica_pre
  ON public.analise_tecnica(pre_analise_id);

DROP TRIGGER IF EXISTS set_analise_tecnica_updated_at ON public.analise_tecnica;
CREATE TRIGGER set_analise_tecnica_updated_at
  BEFORE UPDATE ON public.analise_tecnica
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.pre_analise ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analise_tecnica ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow All" ON public.pre_analise;
CREATE POLICY "Allow All"
  ON public.pre_analise FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All" ON public.analise_tecnica;
CREATE POLICY "Allow All"
  ON public.analise_tecnica FOR ALL TO public USING (true) WITH CHECK (true);
```

## Como o fluxo ficou

```text
Cadastro (produtos)
  -> cria/sincroniza Pre-Analise por produto_id

Pre-Analise
  -> iniciar: status = em_analise
  -> aprovar: status = aprovado, salva respostas e cria Analise Tecnica
  -> reprovar: status = reprovado, salva respostas

Analise Tecnica
  -> iniciar: status = em_analise
  -> concluir: status = concluido, salva laudo_tecnico e observacoes
```

## Validacao recomendada

### 1. Cadastro
- criar um produto novo
- confirmar no banco:

```sql
select id, produto_id, codigo_nf, modelo_ref, status
from public.pre_analise
order by created_at desc
limit 10;
```

### 2. Pre-Analise
- abrir `/home/pre-analise`
- clicar em `INICIAR`
- confirmar no banco:

```sql
select id, produto_id, status, analisado_por, updated_at
from public.pre_analise
order by updated_at desc
limit 10;
```

- clicar em `APROVAR`
- confirmar criacao da Analise Tecnica:

```sql
select id, produto_id, pre_analise_id, status, data_entrada
from public.analise_tecnica
order by created_at desc
limit 10;
```

### 3. Analise Tecnica
- abrir `/home/analise-tecnica`
- clicar em `INICIAR`
- clicar em `CONCLUIR`
- confirmar no banco:

```sql
select id, produto_id, pre_analise_id, status, laudo_tecnico, observacoes, updated_at
from public.analise_tecnica
order by updated_at desc
limit 10;
```

## Observacao importante

Se o script falhar em `ALTER COLUMN ... SET NOT NULL` para `pre_analise.produto_id`, isso significa que existem linhas antigas sem correspondencia com `produtos`.

Nesse caso, antes de reaplicar o `SET NOT NULL`, rode:

```sql
select id, ean, modelo_ref, produto_id
from public.pre_analise
where produto_id is null;
```

e corrija ou exclua os registros antigos sem vinculo.
