import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { KeyRound, Plus, Trash2, Shield, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

type SSOAdminEmail = {
  id: string;
  email: string;
  role: "admin" | "editor";
  notes: string | null;
  created_at: string;
};

export function SSOAdminEmailsConfig() {
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "editor">("admin");
  const [newNotes, setNewNotes] = useState("");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["sso-admin-emails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sso_admin_emails")
        .select("id, email, role, notes, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as SSOAdminEmail[];
    },
  });

  const addEntry = useMutation({
    mutationFn: async () => {
      const trimmed = newEmail.trim().toLowerCase();
      if (!trimmed) throw new Error("Email obrigatório");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        throw new Error("Email inválido");
      }
      const { error } = await supabase
        .from("sso_admin_emails")
        .insert({ email: trimmed, role: newRole, notes: newNotes.trim() || null });
      if (error) {
        if (error.code === "23505") throw new Error("Este email já existe na lista");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sso-admin-emails"] });
      setNewEmail("");
      setNewNotes("");
      setNewRole("admin");
      toast.success("Email SSO adicionado com sucesso");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao adicionar email");
    },
  });

  const removeEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sso_admin_emails")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sso-admin-emails"] });
      toast.success("Email removido");
    },
    onError: () => {
      toast.error("Erro ao remover email");
    },
  });

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base">Administradores SSO CCA</CardTitle>
            <CardDescription className="mt-1">
              Emails com acesso de administrador ou editor ao fazer login por SSO.
              Esta lista tem prioridade sobre os grupos do Azure AD.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new entry */}
        <div className="flex gap-3 items-end p-4 rounded-lg border border-dashed bg-muted/30">
          <div className="flex-1 space-y-1">
            <Label htmlFor="sso-email">Email</Label>
            <Input
              id="sso-email"
              type="email"
              placeholder="utilizador@cca.pt"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEntry.mutate()}
            />
          </div>
          <div className="w-36 space-y-1">
            <Label>Função</Label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as "admin" | "editor")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="sso-notes">Notas (opcional)</Label>
            <Input
              id="sso-notes"
              placeholder="Ex: Sócio / IT"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            />
          </div>
          <Button
            onClick={() => addEntry.mutate()}
            disabled={addEntry.isPending || !newEmail.trim()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead className="w-[100px]">Função</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead className="w-[130px]">Adicionado em</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        entry.role === "admin"
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {entry.role === "admin" ? (
                        <Shield className="h-3 w-3 mr-1" />
                      ) : (
                        <Pencil className="h-3 w-3 mr-1" />
                      )}
                      {entry.role === "admin" ? "Admin" : "Editor"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {entry.notes || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(entry.created_at), "dd MMM yyyy", { locale: pt })}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={removeEntry.isPending}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover email SSO</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem a certeza que deseja remover <strong>{entry.email}</strong> da lista de admins SSO?
                            O utilizador passará a ter o papel atribuído pelos grupos do Azure AD (ou editor por defeito).
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeEntry.mutate(entry.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum email SSO configurado. Adicione emails acima para atribuir papéis específicos no login SSO.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
