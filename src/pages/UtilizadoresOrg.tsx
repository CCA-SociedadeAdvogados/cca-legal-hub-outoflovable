import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Users, Search, Edit3, Save, X } from 'lucide-react';
import { Eyebrow } from '@/components/cca';
import {
  useOrganizations,
  useOrganizationMembers,
  type OrganizationMember,
} from '@/hooks/useOrganizations';
import { useLegalHubProfile } from '@/hooks/useLegalHubProfile';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function UtilizadoresOrg() {
  const { currentOrganization } = useOrganizations();
  const { members, isLoading } = useOrganizationMembers(currentOrganization?.id);
  const { legalHubProfile, isLoading: profileLoading } = useLegalHubProfile();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  if (profileLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      </AppLayout>
    );
  }

  // Only accessible to org_manager
  if (legalHubProfile !== 'org_manager') {
    return <Navigate to="/" replace />;
  }

  const roleLabels: Record<string, string> = {
    owner: 'Proprietário',
    admin: 'Administrador',
    editor: 'Editor',
    viewer: 'Visualizador',
  };

  const filteredMembers = (members || []).filter((m) => {
    const term = searchTerm.toLowerCase();
    return (
      m.profiles?.nome_completo?.toLowerCase().includes(term) ||
      m.profiles?.email?.toLowerCase().includes(term)
    );
  });

  const handleEdit = (member: OrganizationMember) => {
    setSelectedMember(member);
    setEditName(member.profiles?.nome_completo || '');
  };

  const handleSave = async () => {
    if (!selectedMember || !editName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nome_completo: editName.trim() })
        .eq('id', selectedMember.user_id);
      if (error) throw error;
      queryClient.invalidateQueries({
        queryKey: ['organization-members', currentOrganization?.id],
      });
      toast.success('Utilizador atualizado');
      setSelectedMember(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar utilizador');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-7 animate-fade-in">
        <header className="space-y-3">
          <Eyebrow>Organização</Eyebrow>
          <h1 className="font-display text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-ink">
            Utilizadores
          </h1>
          <p className="max-w-2xl font-serif text-[17px] italic leading-[1.55] text-ink-soft">
            Membros da sua organização. Pode editar mas não criar nem eliminar utilizadores.
          </p>
        </header>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute" />
          <Input
            placeholder="Pesquisar utilizador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <section className="rounded-card border border-line bg-surface">
          <div className="border-b border-line px-5 py-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-ink-mute" />
              <h2 className="font-display text-[19px] font-medium leading-tight tracking-[-0.005em] text-ink">
                Lista de Utilizadores
              </h2>
              <span className="font-display text-[15px] font-semibold tracking-[-0.03em] text-ink-mute [font-variant-numeric:tabular-nums]">
                {filteredMembers.length}
              </span>
            </div>
            <p className="mt-1.5 text-[13px] text-ink-mute">
              Pode editar o nome dos utilizadores da sua organização.
            </p>
          </div>
          <div className="p-5">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-brand" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-control border border-dashed border-line bg-bg-alt/50 py-16 text-center">
                <Users className="mb-3 h-10 w-10 text-ink-mute" strokeWidth={1.5} />
                <p className="text-[13px] text-ink-mute">Sem utilizadores encontrados.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-control border border-line bg-bg-alt/40 p-4"
                  >
                    <Avatar>
                      <AvatarImage src={member.profiles?.avatar_url || undefined} />
                      <AvatarFallback>{member.profiles?.nome_completo?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-ink">
                        {member.profiles?.nome_completo || 'Sem nome'}
                      </p>
                      <p className="truncate text-[11.5px] text-ink-mute">
                        {member.profiles?.email}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 border-line bg-surface text-ink-soft"
                    >
                      {roleLabels[member.role] || member.role}
                    </Badge>
                    {/* Can edit but not delete */}
                    {member.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handleEdit(member)}
                        title="Editar nome"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Utilizador</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-control border border-line bg-bg-alt/50 p-3">
                <Avatar>
                  <AvatarImage src={selectedMember.profiles?.avatar_url} />
                  <AvatarFallback>
                    {selectedMember.profiles?.nome_completo?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[13px] text-ink-mute">{selectedMember.profiles?.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editName">Nome completo</Label>
                <Input
                  id="editName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedMember(null)} disabled={saving}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving || !editName.trim()}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Guardar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
