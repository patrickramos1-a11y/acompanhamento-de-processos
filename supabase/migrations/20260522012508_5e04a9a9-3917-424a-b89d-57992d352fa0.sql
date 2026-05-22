
-- Enums
CREATE TYPE public.tipo_prazo AS ENUM ('RELATIVO_AO_INICIO', 'RELATIVO_A_CONCLUSAO_DE_TAREFA');
CREATE TYPE public.status_servico AS ENUM ('em_andamento', 'concluido', 'cancelado');
CREATE TYPE public.status_tarefa AS ENUM ('pendente', 'concluida', 'bloqueada');

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.set_atualizado_em_trg()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- templates
CREATE TABLE public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  prazo_base_dias integer NOT NULL DEFAULT 30,
  descricao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_templates" ON public.templates FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_templates_upd BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em_trg();

-- template_fases
CREATE TABLE public.template_fases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.template_fases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_template_fases" ON public.template_fases FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_template_fases_template ON public.template_fases(template_id);

-- template_tarefas
CREATE TABLE public.template_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fase_id uuid NOT NULL REFERENCES public.template_fases(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  duracao_dias integer NOT NULL DEFAULT 1,
  tipo_prazo public.tipo_prazo NOT NULL DEFAULT 'RELATIVO_AO_INICIO',
  impacta_prazo boolean NOT NULL DEFAULT true,
  depende_de_template_tarefa_id uuid REFERENCES public.template_tarefas(id) ON DELETE SET NULL,
  gerar_apos_conclusao boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.template_tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_template_tarefas" ON public.template_tarefas FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_template_tarefas_fase ON public.template_tarefas(fase_id);

-- servicos
CREATE TABLE public.servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.templates(id) ON DELETE SET NULL,
  nome text NOT NULL,
  data_inicial date NOT NULL,
  prazo_base_dias integer NOT NULL DEFAULT 30,
  data_prevista_base date NOT NULL,
  data_prevista_atual date NOT NULL,
  status public.status_servico NOT NULL DEFAULT 'em_andamento',
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_servicos" ON public.servicos FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_servicos_empresa ON public.servicos(empresa_id);
CREATE TRIGGER trg_servicos_upd BEFORE UPDATE ON public.servicos FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em_trg();

-- servico_tarefas
CREATE TABLE public.servico_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id uuid NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  fase_nome text NOT NULL DEFAULT '',
  duracao_dias integer NOT NULL DEFAULT 1,
  tipo_prazo public.tipo_prazo NOT NULL DEFAULT 'RELATIVO_AO_INICIO',
  impacta_prazo boolean NOT NULL DEFAULT true,
  depende_de_servico_tarefa_id uuid REFERENCES public.servico_tarefas(id) ON DELETE SET NULL,
  gerar_apos_conclusao boolean NOT NULL DEFAULT false,
  status public.status_tarefa NOT NULL DEFAULT 'pendente',
  data_prevista date,
  data_conclusao date,
  template_tarefa_id uuid,
  ordem integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.servico_tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_servico_tarefas" ON public.servico_tarefas FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_servico_tarefas_servico ON public.servico_tarefas(servico_id);
