import { Link } from "@tanstack/react-router";
import { FileText, Settings, ClipboardList, LayoutDashboard } from "lucide-react";

type Page = "painel" | "servicos" | "templates";

const tabs: { id: Page; label: string; to: string }[] = [
  { id: "painel", label: "Painel", to: "/" },
  { id: "servicos", label: "Serviços", to: "/servicos" },
  { id: "templates", label: "Templates", to: "/templates" },
];

export function AppHeader({
  current,
  title,
  subtitle,
  eyebrow,
  icon,
}: {
  current: Page;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: React.ReactNode;
}) {
  return (
    <header className="relative overflow-hidden bg-gradient-hero text-sidebar-foreground">
      <div className="absolute inset-0 bg-mesh opacity-80" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-sidebar-primary/50 to-transparent" />
      <div className="relative mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-5 sm:gap-4 sm:px-6 sm:py-7">
        <div className="flex items-start justify-between gap-3 sm:items-center">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground shadow-accent-glow sm:h-12 sm:w-12">
              {icon ?? <FileText className="h-4 w-4 sm:h-5 sm:w-5" />}
            </div>
            <div className="min-w-0">
              {eyebrow && (
                <p className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/60">
                  {eyebrow}
                </p>
              )}
              <h1 className="truncate font-display text-lg font-bold tracking-tight sm:text-2xl">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-0.5 line-clamp-2 text-xs text-sidebar-foreground/70 sm:line-clamp-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <Link
            to="/configuracoes"
            className="glass inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium text-sidebar-foreground transition-all hover:bg-white/15 sm:px-3.5"
            aria-label="Configurações"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configurações</span>
          </Link>
        </div>

        <nav className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="glass inline-flex w-fit gap-1 rounded-xl p-1">
            {tabs.map((t) => {
              const active = t.id === current;
              const Icon =
                t.id === "painel" ? LayoutDashboard : t.id === "servicos" ? ClipboardList : FileText;
              return (
                <Link
                  key={t.id}
                  to={t.to}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:px-3.5 ${
                    active
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
}
