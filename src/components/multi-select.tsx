import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type Option = { value: string; label: string };

type Props = {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchPlaceholder?: string;
  className?: string;
};

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  searchPlaceholder,
  className,
}: Props) {
  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };

  const triggerText = (() => {
    if (selected.length === 0) return label;
    if (selected.length === 1) {
      return options.find((o) => o.value === selected[0])?.label ?? label;
    }
    return `${selected.length} selecionados`;
  })();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 w-full justify-between gap-2 rounded-lg border-input/60 bg-background/70 px-3 text-xs font-medium transition-all hover:bg-background sm:w-auto",
            selected.length > 0 && "border-primary/50 bg-primary/8 text-primary hover:bg-primary/10",
            className,
          )}
        >
          <span className="truncate">{triggerText}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[min(calc(100vw-2rem),18rem)] p-0 sm:w-56" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder ?? "Buscar..."} className="h-9" />
          <CommandList>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const checked = selected.includes(opt.value);
                return (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => toggle(opt.value)}
                    className="gap-2"
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-sm border",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input",
                      )}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </div>
                    <span className="truncate">{opt.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          <div className="border-t p-1">
            {selected.length < options.length && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-full justify-center text-xs"
                onClick={() => onChange(options.map((opt) => opt.value))}
              >
                <Check className="mr-1 h-3 w-3" />
                Selecionar todos
              </Button>
            )}
            {selected.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-full justify-center text-xs"
                onClick={() => onChange([])}
              >
                <X className="mr-1 h-3 w-3" />
                Limpar
              </Button>
            )}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
