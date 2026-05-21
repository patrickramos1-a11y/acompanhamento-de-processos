
-- Enums
CREATE TYPE public.processo_status AS ENUM ('ativo', 'concluido', 'cancelado', 'suspenso');

-- Grupos empresariais
CREATE TABLE public.grupos_empresariais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Empresas
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  segmento TEXT,
  grupo_id UUID REFERENCES public.grupos_empresariais(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_empresas_grupo ON public.empresas(grupo_id);

-- Tipos de processo
CREATE TABLE public.tipos_processo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Etapas
CREATE TABLE public.etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_processo_id UUID NOT NULL REFERENCES public.tipos_processo(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT NOT NULL DEFAULT '#16a34a',
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_etapas_tipo ON public.etapas(tipo_processo_id, ordem);

-- Processos
CREATE TABLE public.processos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  tipo_processo_id UUID NOT NULL REFERENCES public.tipos_processo(id) ON DELETE RESTRICT,
  nome TEXT NOT NULL,
  numero_protocolo TEXT,
  data_protocolo DATE,
  etapa_atual_id UUID REFERENCES public.etapas(id) ON DELETE RESTRICT,
  status public.processo_status NOT NULL DEFAULT 'ativo',
  responsavel TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_processos_empresa ON public.processos(empresa_id);
CREATE INDEX idx_processos_tipo ON public.processos(tipo_processo_id);
CREATE INDEX idx_processos_status ON public.processos(status);
CREATE INDEX idx_processos_etapa ON public.processos(etapa_atual_id);

-- Tramitações
CREATE TABLE public.tramitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  data_evento DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao TEXT NOT NULL,
  status_no_momento public.processo_status,
  etapa_id UUID REFERENCES public.etapas(id) ON DELETE SET NULL,
  responsavel TEXT,
  setor_orgao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tramitacoes_processo ON public.tramitacoes(processo_id, data_evento DESC);
CREATE INDEX idx_tramitacoes_data ON public.tramitacoes(data_evento DESC);

-- Trigger to update atualizado_em on processos
CREATE OR REPLACE FUNCTION public.set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER processos_set_atualizado
  BEFORE UPDATE ON public.processos
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

-- Enable RLS with permissive public access (sem autenticação per produto)
ALTER TABLE public.grupos_empresariais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_processo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tramitacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all_grupos" ON public.grupos_empresariais FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_empresas" ON public.empresas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_tipos" ON public.tipos_processo FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_etapas" ON public.etapas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_processos" ON public.processos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_tramitacoes" ON public.tramitacoes FOR ALL USING (true) WITH CHECK (true);
