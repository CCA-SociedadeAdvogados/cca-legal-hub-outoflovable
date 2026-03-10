import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useCliente } from "@/contexts/ClienteContext";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Search, X, Building2, Hash, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinancialClient {
  id: string;
  organization_id: string;
  jvris_id: string;
  client_name: string | null;
  client_code: string | null;
}

export function ClienteSelectorJvris() {
  const { t } = useTranslation();
  const { cliente, setCliente, clearCliente } = useCliente();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const { data: resultados = [], isLoading } = useQuery({
    queryKey: ["cliente-selector-jvris", debouncedSearch],
    queryFn: async (): Promise<FinancialClient[]> => {
      const cleanSearch = debouncedSearch.trim();

      let query = supabase
        .from("financial_clients")
        .select("id, organization_id, jvris_id, client_name, client_code")
        .order("jvris_id");

      if (cleanSearch) {
        const term = `%${cleanSearch}%`;
        query = query.or(
          `jvris_id.ilike.${term},client_name.ilike.${term},client_code.ilike.${term}`
        );
      }

      const { data, error } = await query.limit(200);

      if (error) throw error;

      return (data || []) as FinancialClient[];
    },
    enabled: open,
    staleTime: 30 * 1000,
  });

  const handleSelect = useCallback(
    (item: FinancialClient) => {
      const nomeApresentacao =
        item.client_name?.trim() ||
        item.client_code?.trim() ||
        item.jvris_id;

      setCliente({
        organizationId: item.organization_id,
        nome: nomeApresentacao,
        jvrisId: item.jvris_id,
      });

      setOpen(false);
      setSearch("");
    },
    [setCliente]
  );

  const handleClear = useCallback(() => {
    clearCliente();
    setSearch("");
  }, [clearCliente]);

  return (
    <div className="flex items-center gap-2">
      {cliente && (
        <Badge variant="secondary" className="flex items-center gap-1.5 py-1 px-2.5">
          <Hash className="h-3 w-3" />
          <span className="font-mono text-xs">{cliente.jvrisId}</span>
          <span className="text-xs text-muted-foreground">— {cliente.nome}</span>
          <button
            onClick={handleClear}
            className="ml-1 hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            {t("financial.searchByJvrisId")}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-96 p-0" align="end">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t("financial.searchClientId")}
                className="h-8 pl-8 pr-8 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              {search && (
                <button
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  onClick={() => setSearch("")}
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : resultados.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {debouncedSearch
                  ? t("financial.noMatchingClients")
                  : t("financial.noClientsWithJvrisId")}
              </div>
            ) : (
              resultados.map((item) => {
                const nomeApresentacao =
                  item.client_name?.trim() ||
                  item.client_code?.trim() ||
                  item.jvris_id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b last:border-b-0 hover:bg-muted/50",
                      cliente?.jvrisId === item.jvris_id && "bg-primary/5"
                    )}
                  >
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {nomeApresentacao}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {t("financial.jvrisId")}: {item.jvris_id}
                      </p>
                      {item.client_code && (
                        <p className="text-[11px] text-muted-foreground">
                          client_code: {item.client_code}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
