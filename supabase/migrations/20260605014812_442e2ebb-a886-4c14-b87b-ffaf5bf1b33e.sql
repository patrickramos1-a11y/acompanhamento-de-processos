ALTER TABLE public.servicos ADD COLUMN IF NOT EXISTS processo_id uuid NULL;
CREATE INDEX IF NOT EXISTS idx_servicos_processo_id ON public.servicos(processo_id);