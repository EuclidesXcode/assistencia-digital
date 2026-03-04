BEGIN;

CREATE TABLE IF NOT EXISTS public.product_reference_suggestions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_reference_suggestions_unique
  ON public.product_reference_suggestions (lower(category), lower(value));

INSERT INTO public.product_reference_suggestions (category, value)
VALUES
  ('linhas', 'TV'),
  ('linhas', 'SOUNDBAR'),
  ('linhas', 'AUDIO'),
  ('linhas', 'AR CONDICIONADO'),
  ('linhas', 'REFRIGERADOR'),
  ('linhas', 'GELADEIRA'),
  ('linhas', 'LAVADORA'),
  ('linhas', 'SECADORA'),
  ('linhas', 'FOGAO'),
  ('linhas', 'COOKTOP'),
  ('linhas', 'MICRO-ONDAS'),
  ('linhas', 'ASPIRADOR'),
  ('linhas', 'PURIFICADOR'),
  ('linhas', 'CERVEJEIRA'),
  ('linhas', 'FREEZER'),
  ('funcionalidades', 'TELA'),
  ('funcionalidades', 'AUDIO'),
  ('funcionalidades', 'HDMI'),
  ('funcionalidades', 'WI-FI'),
  ('funcionalidades', 'BLUETOOTH'),
  ('funcionalidades', 'USB'),
  ('funcionalidades', 'SINTONIZADOR'),
  ('esteticas', 'TELA'),
  ('esteticas', 'GABINETE FRONTAL'),
  ('esteticas', 'TAMPA TRASEIRA'),
  ('embalagens', 'EMBALAGEM'),
  ('embalagens', 'FUNDO'),
  ('embalagens', 'CALCO SUPERIOR'),
  ('embalagens', 'CALCO INFERIOR'),
  ('acessorios', 'Controle remoto'),
  ('acessorios', 'Cabo de energia'),
  ('acessorios', 'Base/Pedestal'),
  ('acessorios', 'Manual'),
  ('acessorios', 'Parafusos'),
  ('pecas_funcionais', 'Placa principal'),
  ('pecas_funcionais', 'Fonte'),
  ('pecas_funcionais', 'PCI WI-FI'),
  ('pecas_funcionais', 'Display')
ON CONFLICT DO NOTHING;

COMMIT;
