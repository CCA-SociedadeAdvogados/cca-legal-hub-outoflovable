import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useCliente } from "@/contexts/ClienteContext";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, X, Building2, Hash, Loader2, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface OrganizationWithJvris {
  id: string;
  client_code: string | null;
  name: string;
  jvris_id: string | null;
  logo_url?: string | null;
}

interface OrganizationOption {
  id: string;
  name: string;
  client_code: string | null;
  jvris_id: string | null;
}

interface JvrisSearchResult {
  id: string;
  client_code: string | null;
  name: string;
  jvris_id: string;
  isLinked: boolean;
}

export function ClienteSelectorJvris() {
  const { t } = useTranslation();
  const { cliente, setCliente, clearCliente } = useCliente();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [associationDialogOpen, setAssociationDialogOpen] = useState(false);
  const [associationSearch, setAssociationSearch] = useState("");
  const [selectedUnlinkedJvrisId, setSelectedUnlinkedJvrisId] = useState<string | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);

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
    queryFn: async (): Promise<JvrisSearchResult[]> => {
      const cleanSearch = debouncedSearch.trim();
      const normalizedSearch = cleanSearch.toLowerCase();

      let orgQuery = supabase
        .from("organizations")
        .select("id, client_code, name, jvris_id")
        .not("jvris_id", "is", null)
        .order("name");

      if (cleanSearch) {
        const term = `%${cleanSearch}%`;
        orgQuery = orgQuery.or(`jvris_id.ilike.${term},name.ilike.${term}`);
      }

      const { data: orgData, error: orgError } = await orgQuery.limit(20);
      if (orgError) throw orgError;

      const linkedResults: JvrisSearchResult[] = ((orgData || []) as OrganizationWithJvris[])
        .filter((org) => !!org.jvris_id)
        .map((org) => ({
          id: org.id,
          client_code: org.client_code,
          name: org.name,
          jvris_id: org.jvris_id!.trim(),
          isLinked: true,
        }));

      const linkedIds = new Set(linkedResults.map((item) => item.jvris_id));

      let cacheQuery = supabase
        .from("financeiro_nav_cache")
        .select("jvris_id")
        .not("jvris_id", "is", null);

      if (cleanSearch) {
        cacheQuery = cacheQuery.ilike("jvris_id", `%${cleanSearch}%`);
      }

      const { data: cacheData, error: cacheError } = await cacheQuery.limit(50);
      if (cacheError) throw cacheError;

      const unlinkedResults: JvrisSearchResult[] = Array.from(
        new Set(
          (cacheData || [])
            .map((row: { jvris_id: string | null }) => row.jvris_id?.trim())
            .filter((value): value is string => Boolean(value) && !linkedIds.has(value))
        )
      )
        .filter((jvrisId) => {
          if (!normalizedSearch) return true;
          return jvrisId.toLowerCase().includes(normalizedSearch);
        })
        .sort()
        .slice(0, 20)
        .map((jvrisId) => ({
          id: `nav-${jvrisId}`,
          client_code: null,
          name: "ID disponível na Base NAV",
          jvris_id: jvrisId,
          isLinked: false,
        }));

      return [...linkedResults, ...unlinkedResults];
    },
    enabled: open,
    staleTime: 30 * 1000,
  });

  const { data: organizationOptions = [], isLoading: isLoadingOrganizations } = useQuery({
    queryKey: ["organizations-without-jvris-for-association"],
    queryFn: async (): Promise<OrganizationOption[]> => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, client_code, jvris_id")
        .is("jvris_id", null)
        .order("name");

      if (error) throw error;

      return (data || []) as OrganizationOption[];
    },
    enabled: associationDialogOpen,
    staleTime: 60 * 1000,
  });

  const filteredOrganizations = useMemo(() => {
    const q = associationSearch.trim().toLowerCase();

    if (!q) return organizationOptions;

    return organizationOptions.filter((org) => {
      const name = org.name?.toLowerCase() ?? "";
      const clientCode = org.client_code?.toLowerCase() ?? "";
      return name.includes(q) || clientCode.includes(q);
    });
  }, [organizationOptions, associationSearch]);

  const associateJvrisId = useMutation({
    mutationFn: async ({
      organizationId,
      jvrisId,
    }: {
      organizationId: string;
      jvrisId: string;
    }) => {
      const normalizedId = jvrisId.trim();

      const { data, error } = await supabase
        .from("organizations")
        .update({ jvris_id: normalizedId })
        .eq("id", organizationId)
        .select("id, name, jvris_id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cliente-selector-jvris"] });
      queryClient.invalidateQueries({ queryKey: ["organizations-without-jvris-for-association"] });
      queryClient.invalidateQueries({ queryKey: ["organization-financial-info", variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ["org-ficha", variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ["available-jvris-ids"] });

      toast.success(`ID Jvris ${variables.jvrisId} associado com sucesso a ${data.name}.`);

      setAssociationDialogOpen(false);
      setAssociationSearch("");
      setSelectedOrganizationId(null);

      if (selectedUnlinkedJvrisId === variables.jvrisId) {
        setCliente({
          organizationId: data.id,
          nome: data.name,
          jvrisId: variables.jvrisId,
        });
        setOpen(false);
        setSearch("");
        setSelectedUnlinkedJvrisId(null);
      }
    },
    onError: (error) => {
      toast.error("Erro ao associar ID Jvris: " + error.message);
    },
  });

  const handleSelect = useCallback(
    (item: JvrisSearchResult) => {
      if (!item.jvris_id) return;

      if (!item.isLinked) {
        setSelectedUnlinkedJvrisId(item.jvris_id);
        setSelectedOrganizationId(null);
        setAssociationSearch("");
        setAssociationDialogOpen(true);
        return;
      }

      setCliente({
        organizationId: item.id,
        nome: item.name,
        jvrisId: item.jvris_id,
      });

      setOpen(false);
      setSearch("");
    },
    [setCliente]
  );

  const handleStartAssociation = useCallback((jvrisId: string) => {
    setSelectedUnlinkedJvrisId(jvrisId);
    setSelectedOrganizationId(null);
    setAssociationSearch("");
    setAssociationDialogOpen(true);
  }, []);

  const handleConfirmAssociation = useCallback(async () => {
    if (!selectedUnlinkedJvrisId || !selectedOrganizationId) return;

    await associateJvrisId.mutateAsync({
      organizationId: selectedOrganizationId,
      jvrisId: selectedUnlinkedJvrisId,
    });
  }, [associateJvrisId, selectedOrganizationId, selectedUnlinkedJvrisId]);

  const handleClear = useCallback(() => {
    clearCliente();
    setSearch("");
  }, [clearCliente]);

  return (
    <>
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

            <ScrollArea className="max-h-[320px]">
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
                resultados.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b last:border-b-0",
                      item.isLinked ? "hover:bg-muted/50" : "bg-muted/20"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={cn(
                        "flex items-center gap-3 flex-1 min-w-0 text-left",
                        item.isLinked ? "cursor-pointer" : "cursor-default"
                      )}
                    >
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {t("financial.jvrisId")}: {item.jvris_id}
                        </p>
                        {!item.isLinked && (
                          <p className="text-[11px] text-muted-foreground">
                            ID encontrado na Base NAV e ainda por associar a uma organização.
                          </p>
                        )}
                      </div>
                    </button>

                    {!item.isLinked && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => handleStartAssociation(item.jvris_id)}
                      >
                        <Link2 className="h-3.5 w-3.5 mr-1.5" />
                        Associar
                      </Button>
                    )}
                  </div>
                ))
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      <Dialog
        open={associationDialogOpen}
        onOpenChange={(open) => {
          if (associateJvrisId.isPending) return;
          setAssociationDialogOpen(open);
          if (!open) {
            setAssociationSearch("");
            setSelectedOrganizationId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Associar ID Jvris</DialogTitle>
            <DialogDescription>
              {selectedUnlinkedJvrisId ? (
                <>
                  Seleccione a organização a que deve ficar associado o ID{" "}
                  <span className="font-mono font-medium">{selectedUnlinkedJvrisId}</span>.
                </>
              ) : (
                "Seleccione a organização a associar."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar organização por nome ou client_code"
                value={associationSearch}
                onChange={(e) => setAssociationSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-72 overflow-y-auto border rounded-md">
              {isLoadingOrganizations ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredOrganizations.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">
                  Nenhuma organização disponível para associação.
                </p>
              ) : (
                filteredOrganizations.map((org) => {
                  const isSelected = selectedOrganizationId === org.id;

                  return (
                    <button
                      key={org.id}
                      type="button"
                      className={cn(
                        "w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors border-b last:border-b-0",
                        isSelected && "bg-primary/10 text-primary"
                      )}
                      onClick={() => setSelectedOrganizationId(org.id)}
                    >
                      <div className="font-medium">{org.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {org.client_code ? `client_code: ${org.client_code}` : "Sem client_code"}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <div>ID Jvris: {selectedUnlinkedJvrisId ?? "nenhum"}</div>
              <div>Organização seleccionada: {selectedOrganizationId ?? "nenhuma"}</div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (associateJvrisId.isPending) return;
                setAssociationDialogOpen(false);
                setAssociationSearch("");
                setSelectedOrganizationId(null);
              }}
            >
              Cancelar
            </Button>

            <Button
              onClick={handleConfirmAssociation}
              disabled={!selectedUnlinkedJvrisId || !selectedOrganizationId || associateJvrisId.isPending}
            >
              {associateJvrisId.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A associar...
                </>
              ) : (
                "Confirmar associação"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
