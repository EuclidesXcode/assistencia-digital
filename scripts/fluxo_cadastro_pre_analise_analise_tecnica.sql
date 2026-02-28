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
