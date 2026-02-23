import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { 
  FileText, 
  Scale, 
  AlertTriangle, 
  FileCheck, 
  ClipboardList, 
  FileCode,
  File,
  Search,
  Filter,
  Download,
  Eye
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuditLogs, translateAction, translateTableName, type AuditLog } from "@/hooks/useAuditLogs";
import { Skeleton } from "@/components/ui/skeleton";

const TABLE_ICONS: Record<string, React.ReactNode> = {
  contratos: <FileText className="h-4 w-4" />,
  eventos_legislativos: <Scale className="h-4 w-4" />,
  impactos: <AlertTriangle className="h-4 w-4" />,
  politicas: <FileCheck className="h-4 w-4" />,
  requisitos: <ClipboardList className="h-4 w-4" />,
  templates: <FileCode className="h-4 w-4" />,
  documentos_gerados: <File className="h-4 w-4" />,
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-risk-low/20 text-risk-low dark:bg-risk-low/30",
  UPDATE: "bg-primary/20 text-primary dark:bg-primary/30",
  DELETE: "bg-destructive/20 text-destructive dark:bg-destructive/30",
  VIEW: "bg-muted text-muted-foreground",
  EXPORT: "bg-primary/20 text-primary dark:bg-primary/30",
};

function AuditLogDetail({ log }: { log: AuditLog }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium text-muted-foreground">Utilizador:</span>
          <p>{log.user_email || "Sistema"}</p>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Data/Hora:</span>
          <p>{format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: pt })}</p>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Tabela:</span>
          <p>{translateTableName(log.table_name)}</p>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Ação:</span>
          <Badge className={ACTION_COLORS[log.action] || ""}>{translateAction(log.action)}</Badge>
        </div>
        {log.record_id && (
          <div className="col-span-2">
            <span className="font-medium text-muted-foreground">ID do Registo:</span>
            <p className="font-mono text-xs">{log.record_id}</p>
          </div>
        )}
      </div>

      {log.action === "UPDATE" && log.old_data && log.new_data && (
        <div className="space-y-2">
          <h4 className="font-medium">Alterações:</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-xs font-medium text-muted-foreground">Antes:</span>
              <ScrollArea className="h-40 rounded border p-2">
                <pre className="text-xs">{JSON.stringify(log.old_data, null, 2)}</pre>
              </ScrollArea>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Depois:</span>
              <ScrollArea className="h-40 rounded border p-2">
                <pre className="text-xs">{JSON.stringify(log.new_data, null, 2)}</pre>
              </ScrollArea>
            </div>
          </div>
        </div>
      )}

      {log.action === "CREATE" && log.new_data && (
        <div className="space-y-2">
          <h4 className="font-medium">Dados Criados:</h4>
          <ScrollArea className="h-40 rounded border p-2">
            <pre className="text-xs">{JSON.stringify(log.new_data, null, 2)}</pre>
          </ScrollArea>
        </div>
      )}

      {log.action === "DELETE" && log.old_data && (
        <div className="space-y-2">
          <h4 className="font-medium">Dados Eliminados:</h4>
          <ScrollArea className="h-40 rounded border p-2">
            <pre className="text-xs">{JSON.stringify(log.old_data, null, 2)}</pre>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

export default function Auditoria() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { logs, isLoading } = useAuditLogs({
    tableName: tableFilter !== "all" ? tableFilter : undefined,
    action: actionFilter !== "all" ? actionFilter : undefined,
    limit: 200,
  });

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.user_email?.toLowerCase().includes(search) ||
      log.table_name.toLowerCase().includes(search) ||
      log.action.toLowerCase().includes(search) ||
      log.record_id?.toLowerCase().includes(search)
    );
  });

  const exportLogs = () => {
    const csvContent = [
      ["Data", "Utilizador", "Ação", "Tabela", "ID Registo"].join(","),
      ...filteredLogs.map((log) =>
        [
          format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
          log.user_email || "Sistema",
          translateAction(log.action),
          translateTableName(log.table_name),
          log.record_id || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Registos de Auditoria</h1>
          <p className="text-muted-foreground">
            Histórico completo de todas as ações realizadas no sistema para fins de compliance e rastreabilidade.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            <CardDescription>Filtre os registos por tabela, ação ou pesquise por termos específicos.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por email, tabela, ação..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Tabela" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as tabelas</SelectItem>
                  <SelectItem value="contratos">Contratos</SelectItem>
                  <SelectItem value="eventos_legislativos">Eventos Legislativos</SelectItem>
                  <SelectItem value="impactos">Impactos</SelectItem>
                  <SelectItem value="politicas">Políticas</SelectItem>
                  <SelectItem value="requisitos">Requisitos</SelectItem>
                  <SelectItem value="templates">Templates</SelectItem>
                  <SelectItem value="documentos_gerados">Documentos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  <SelectItem value="CREATE">Criação</SelectItem>
                  <SelectItem value="UPDATE">Atualização</SelectItem>
                  <SelectItem value="DELETE">Eliminação</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportLogs}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Ações ({filteredLogs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nenhum registo de auditoria encontrado.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Utilizador</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Tabela</TableHead>
                      <TableHead>ID Registo</TableHead>
                      <TableHead className="text-right">Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                        </TableCell>
                        <TableCell>{log.user_email || "Sistema"}</TableCell>
                        <TableCell>
                          <Badge className={ACTION_COLORS[log.action] || ""}>
                            {translateAction(log.action)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {TABLE_ICONS[log.table_name] || <File className="h-4 w-4" />}
                            {translateTableName(log.table_name)}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.record_id ? log.record_id.slice(0, 8) + "..." : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Detalhes do Registo de Auditoria</DialogTitle>
                                <DialogDescription>
                                  Informação completa sobre a ação realizada.
                                </DialogDescription>
                              </DialogHeader>
                              <AuditLogDetail log={log} />
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
