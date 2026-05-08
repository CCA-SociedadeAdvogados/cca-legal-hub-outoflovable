import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LogIn, Search, AlertTriangle, Building2, History, Clock } from 'lucide-react';

interface OrgSummary {
  id: string;
  name: string;
  slug: string | null;
}

interface ImpersonationSession {
  id: string;
  status: string;
  reason: string;
  started_at: string;
  ended_at: string | null;
  organizations: { name: string } | null;
}

interface ImpersonationTabProps {
  isImpersonating: boolean;
  orgSearch: string;
  onOrgSearchChange: (value: string) => void;
  isLoadingOrgs: boolean;
  filteredOrganizations: OrgSummary[] | undefined;
  onImpersonate: (org: OrgSummary) => void;
  isLoadingHistory: boolean;
  impersonationHistory: ImpersonationSession[] | undefined;
}

export function ImpersonationTab({
  isImpersonating,
  orgSearch,
  onOrgSearchChange,
  isLoadingOrgs,
  filteredOrganizations,
  onImpersonate,
  isLoadingHistory,
  impersonationHistory,
}: ImpersonationTabProps) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Selecionar Organização */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            Entrar no Contexto
          </CardTitle>
          <CardDescription>
            Selecione uma organização para visualizar e configurar como se fosse um utilizador dela.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isImpersonating && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Já está em modo impersonation. Saia primeiro para selecionar outra organização.
              </p>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar organização..."
              value={orgSearch}
              onChange={(e) => onOrgSearchChange(e.target.value)}
              className="pl-9"
              disabled={isImpersonating}
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {isLoadingOrgs ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : filteredOrganizations?.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhuma organização encontrada
              </p>
            ) : (
              filteredOrganizations?.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-sm text-muted-foreground">{org.slug}</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => onImpersonate(org)} disabled={isImpersonating}>
                    <LogIn className="h-4 w-4 mr-2" />
                    Entrar
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Impersonation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Sessões
          </CardTitle>
          <CardDescription>Últimas sessões de impersonation realizadas.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : !impersonationHistory || impersonationHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma sessão registada</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {impersonationHistory.map((session) => (
                <div key={session.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {session.organizations?.name || 'Organização removida'}
                      </span>
                    </div>
                    <Badge
                      variant={
                        session.status === 'active'
                          ? 'default'
                          : session.status === 'expired'
                            ? 'outline'
                            : 'secondary'
                      }
                      className={
                        session.status === 'expired' ? 'border-yellow-500 text-yellow-600' : ''
                      }
                    >
                      {session.status === 'active'
                        ? t('platformAdmin.impersonation.statusActive', 'Ativa')
                        : session.status === 'expired'
                          ? t('platformAdmin.impersonation.statusExpired', 'Expirada')
                          : t('platformAdmin.impersonation.statusEnded', 'Terminada')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{session.reason}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(session.started_at), 'dd/MM/yyyy HH:mm', { locale: pt })}
                    </span>
                    {session.ended_at && (
                      <span>→ {format(new Date(session.ended_at), 'HH:mm', { locale: pt })}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
