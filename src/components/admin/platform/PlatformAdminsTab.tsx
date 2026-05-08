import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import type { PlatformAdmin } from '@/hooks/usePlatformAdmin';

interface PlatformAdminsTabProps {
  searchEmail: string;
  onSearchEmailChange: (value: string) => void;
  onAdd: () => void;
  isAdding: boolean;
  isLoading: boolean;
  admins: PlatformAdmin[] | undefined;
  onRemove: (id: string) => void;
  isRemoving: boolean;
}

export function PlatformAdminsTab({
  searchEmail,
  onSearchEmailChange,
  onAdd,
  isAdding,
  isLoading,
  admins,
  onRemove,
  isRemoving,
}: PlatformAdminsTabProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('admin.platformAdmins', 'Platform Admins')}</CardTitle>
          <div className="flex gap-2">
            <Input
              placeholder="Email do utilizador..."
              value={searchEmail}
              onChange={(e) => onSearchEmailChange(e.target.value)}
              className="w-64"
            />
            <Button onClick={onAdd} disabled={isAdding}>
              <Plus className="h-4 w-4 mr-2" />
              {t('admin.addAdmin', 'Adicionar')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.email', 'Email')}</TableHead>
                <TableHead>{t('common.name', 'Nome')}</TableHead>
                <TableHead>{t('common.notes', 'Notas')}</TableHead>
                <TableHead>{t('common.createdAt', 'Adicionado em')}</TableHead>
                <TableHead className="w-[100px]">{t('common.actions', 'Ações')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins?.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">
                    {admin.profile?.email || admin.user_id}
                  </TableCell>
                  <TableCell>{admin.profile?.nome_completo || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{admin.notes || '-'}</TableCell>
                  <TableCell>
                    {format(new Date(admin.created_at), 'dd MMM yyyy', { locale: pt })}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemove(admin.id)}
                      disabled={isRemoving}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!admins || admins.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum platform admin encontrado
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
