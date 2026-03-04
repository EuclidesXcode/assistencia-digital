BEGIN;

CREATE TABLE IF NOT EXISTS public.recebimento_nf_referencias (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  codigo_nf TEXT NOT NULL,
  modelo_referencia TEXT NOT NULL,
  ean TEXT,
  marca TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recebimento_nf_referencias_codigo_nf
  ON public.recebimento_nf_referencias (codigo_nf);

CREATE INDEX IF NOT EXISTS idx_recebimento_nf_referencias_modelo
  ON public.recebimento_nf_referencias (modelo_referencia);

COMMENT ON TABLE public.recebimento_nf_referencias IS
  'Catalogo de referencias de NF para fallback no wizard de recebimento.';

COMMENT ON COLUMN public.recebimento_nf_referencias.codigo_nf IS
  'Codigo NF usado no recebimento com NF (3 a 20 digitos).';

COMMIT;

