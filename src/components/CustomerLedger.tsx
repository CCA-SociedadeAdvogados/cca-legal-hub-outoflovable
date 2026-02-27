import { useState } from "react";
import { useCustomers, useLedgerEntries, useBCDashboard } from "@/hooks/useBC";
import { BCCustomer, BCLedgerEntry } from "../../supabase/functions/_shared/types";

// ─── Utilitários de formatação ────────────────────────────────────────────────

function formatCurrency(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(amount);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-PT");
}

function isOverdue(entry: BCLedgerEntry): boolean {
  if (!entry.open || !entry.dueDate) return false;
  return entry.dueDate < new Date().toISOString().split("T")[0];
}

// ─── Cards de resumo do dashboard ────────────────────────────────────────────

function DashboardCards() {
  const { data: stats, isLoading, error } = useBCDashboard();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  if (error || !stats) return null;

  const cards = [
    { label: "Total Clientes", value: stats.totalCustomers.toString(), color: "text-foreground" },
    { label: "Com Dívida", value: stats.customersWithDebt.toString(), color: "text-amber-600" },
    { label: "Dívida Total", value: formatCurrency(stats.totalDebt), color: "text-amber-600" },
    { label: "Em Atraso", value: formatCurrency(stats.totalOverdue), color: "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
          <p className={`text-xl font-semibold ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Tabela de movimentos ─────────────────────────────────────────────────────

interface LedgerTableProps {
  customerNo?: string;
  onlyOpen?: boolean;
}

function LedgerTable({ customerNo, onlyOpen }: LedgerTableProps) {
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const filter = onlyOpen ? "open eq true" : undefined;

  const { data: entries = [], isLoading, error } = useLedgerEntries({
    customerNo,
    filter,
    top: PAGE_SIZE,
    skip: page * PAGE_SIZE,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 rounded bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Erro ao carregar movimentos: {error.message}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
        Sem movimentos{onlyOpen ? " em aberto" : ""} para apresentar.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Documento</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tipo</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Data</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Vencimento</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Valor</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Por Liquidar</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.map((entry) => {
              const overdue = isOverdue(entry);
              return (
                <tr key={entry.entryNo} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 font-mono text-xs">{entry.documentNo}</td>
                  <td className="px-3 py-2">{entry.documentType || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(entry.postingDate)}</td>
                  <td className={`px-3 py-2 ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {formatDate(entry.dueDate)}
                  </td>
                  <td className="px-3 py-2 text-right">{formatCurrency(entry.amount, entry.currency)}</td>
                  <td className={`px-3 py-2 text-right font-medium ${entry.remainingAmount > 0 ? (overdue ? "text-destructive" : "text-amber-600") : "text-muted-foreground"}`}>
                    {formatCurrency(entry.remainingAmount, entry.currency)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {entry.open ? (
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${overdue ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-700"}`}>
                        {overdue ? "Vencido" : "Em aberto"}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                        Liquidado
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginação simples */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground">
          Página {page + 1} · {entries.length} registos
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded border px-3 py-1 text-xs disabled:opacity-40 hover:bg-muted transition-colors"
          >
            ← Anterior
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={entries.length < PAGE_SIZE}
            className="rounded border px-3 py-1 text-xs disabled:opacity-40 hover:bg-muted transition-colors"
          >
            Próxima →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

type Tab = "all" | "open" | "overdue";

export function CustomerLedger() {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<BCCustomer | null>(null);
  const [tab, setTab] = useState<Tab>("all");

  const { data: customers = [], isLoading: loadingCustomers, error: custError } = useCustomers();

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.no.toLowerCase().includes(search.toLowerCase())
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "open", label: "Em aberto" },
    { key: "overdue", label: "Vencidos" },
  ];

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <DashboardCards />

      {/* Cabeçalho e filtro */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Conta Corrente BC</h2>
        <input
          type="search"
          placeholder="Pesquisar cliente…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedCustomer(null);
          }}
          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:w-64"
        />
      </div>

      {/* Lista de clientes */}
      {!selectedCustomer && (
        <div>
          {loadingCustomers && (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 rounded bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {custError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              Erro ao carregar clientes: {custError.message}
            </div>
          )}

          {!loadingCustomers && !custError && (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nº</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nome</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Saldo</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Vencido</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((c) => (
                    <tr
                      key={c.no}
                      onClick={() => setSelectedCustomer(c)}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{c.no}</td>
                      <td className="px-3 py-2 font-medium">{c.name}</td>
                      <td className={`px-3 py-2 text-right ${c.balance > 0 ? "text-amber-600" : ""}`}>
                        {formatCurrency(c.balance, c.currency)}
                      </td>
                      <td className={`px-3 py-2 text-right ${c.balanceDue > 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {formatCurrency(c.balanceDue, c.currency)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {c.blocked && c.blocked !== "" ? (
                          <span className="inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                            Bloqueado
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            Activo
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                        Nenhum cliente encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detalhe do cliente */}
      {selectedCustomer && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedCustomer(null)}
              className="rounded border px-3 py-1 text-xs hover:bg-muted transition-colors"
            >
              ← Voltar
            </button>
            <div>
              <h3 className="font-semibold">{selectedCustomer.name}</h3>
              <p className="text-xs text-muted-foreground">Nº {selectedCustomer.no}</p>
            </div>
            <div className="ml-auto flex gap-6 text-sm">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className={`font-semibold ${selectedCustomer.balance > 0 ? "text-amber-600" : ""}`}>
                  {formatCurrency(selectedCustomer.balance, selectedCustomer.currency)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Vencido</p>
                <p className={`font-semibold ${selectedCustomer.balanceDue > 0 ? "text-destructive" : ""}`}>
                  {formatCurrency(selectedCustomer.balanceDue, selectedCustomer.currency)}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm transition-colors ${
                  tab === t.key
                    ? "border-b-2 border-primary font-medium text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <LedgerTable
            customerNo={selectedCustomer.no}
            onlyOpen={tab === "open" || tab === "overdue"}
          />
        </div>
      )}
    </div>
  );
}
