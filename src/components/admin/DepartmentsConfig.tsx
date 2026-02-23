import { useState } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ShieldCheck, Loader2, Folders } from "lucide-react";
import { useDepartments } from "@/hooks/useDepartments";

interface DepartmentsConfigProps {
  organizationId: string;
}

export function DepartmentsConfig({ organizationId }: DepartmentsConfigProps) {
  const { departments, isLoading, createDepartment, updateDepartment, deleteDepartment } =
    useDepartments(organizationId);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createDepartment.mutateAsync({ name: newName.trim(), orgId: organizationId });
    setNewName("");
    setIsCreateOpen(false);
  };

  const handleEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await updateDepartment.mutateAsync({ id: editingId, name: editName.trim() });
    setEditingId(null);
    setEditName("");
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await deleteDepartment.mutateAsync(deletingId);
    setDeletingId(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Folders className="h-5 w-5" />
              Departamentos
            </CardTitle>
            <CardDescription>
              Gerir departamentos desta organização. O departamento "Geral" é de sistema e não pode ser editado ou eliminado.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Departamento
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !departments || departments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum departamento encontrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Predefinição</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell>
                    {dept.is_system ? (
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                        <ShieldCheck className="h-3 w-3" />
                        Sistema
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="w-fit">Normal</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {dept.is_default ? (
                      <Badge className="bg-primary/20 text-primary border-0 w-fit">Padrão</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={dept.is_system}
                        title={dept.is_system ? "Departamento de sistema — não editável" : "Editar"}
                        onClick={() => {
                          setEditingId(dept.id);
                          setEditName(dept.name);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={dept.is_system}
                        title={dept.is_system ? "Departamento de sistema — não eliminável" : "Eliminar"}
                        onClick={() => setDeletingId(dept.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Dialog — Criar */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Departamento</DialogTitle>
            <DialogDescription>Introduza o nome do novo departamento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="dept-name">Nome</Label>
            <Input
              id="dept-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Jurídico, Comercial..."
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createDepartment.isPending || !newName.trim()}>
              {createDepartment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — Editar */}
      <Dialog open={!!editingId} onOpenChange={(open) => { if (!open) setEditingId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Departamento</DialogTitle>
            <DialogDescription>Altere o nome do departamento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="edit-dept-name">Nome</Label>
            <Input
              id="edit-dept-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEdit()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={updateDepartment.isPending || !editName.trim()}>
              {updateDepartment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog — Eliminar */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Departamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar este departamento? Esta ação não pode ser revertida.
              Os utilizadores associados exclusivamente a este departamento serão removidos do mesmo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteDepartment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
