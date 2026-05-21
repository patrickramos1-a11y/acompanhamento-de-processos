import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const [empresas, grupos, tipos, etapas, processos, tramitacoes] = await Promise.all([
    supabaseAdmin.from("empresas").select("*"),
    supabaseAdmin.from("grupos_empresariais").select("*"),
    supabaseAdmin.from("tipos_processo").select("*"),
    supabaseAdmin.from("etapas").select("*").order("ordem"),
    supabaseAdmin.from("processos").select("*").order("atualizado_em", { ascending: false }),
    supabaseAdmin
      .from("tramitacoes")
      .select("*")
      .order("data_evento", { ascending: false })
      .limit(500),
  ]);

  return {
    empresas: empresas.data ?? [],
    grupos: grupos.data ?? [],
    tipos: tipos.data ?? [],
    etapas: etapas.data ?? [],
    processos: processos.data ?? [],
    tramitacoes: tramitacoes.data ?? [],
  };
});
