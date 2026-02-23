import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { 
  Users, Shield, Pencil, Eye, KeyRound, Lock, AlertTriangle 
} from "lucide-react";

export interface UserMetricsData {
  total: number;
  admins: number;
  editors: number;
  viewers: number;
  ssoUsers: number;
  localUsers: number;
  lockedUsers: number;
}

interface AdminUserMetricsProps {
  metrics: UserMetricsData | null | undefined;
  isLoading?: boolean;
}

export function AdminUserMetrics({ metrics, isLoading }: AdminUserMetricsProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
        {[...Array(7)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                  <div className="h-8 w-12 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-8 w-8 bg-muted animate-pulse rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const data = metrics || {
    total: 0,
    admins: 0,
    editors: 0,
    viewers: 0,
    ssoUsers: 0,
    localUsers: 0,
    lockedUsers: 0,
  };

  return (
    <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('common.total', 'Total')}</p>
              <p className="text-2xl font-bold">{data.total}</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('users.roles.admin', 'Administradores')}</p>
              <p className="text-2xl font-bold text-primary">{data.admins}</p>
            </div>
            <Shield className="h-8 w-8 text-primary" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('users.roles.editor', 'Editores')}</p>
              <p className="text-2xl font-bold text-primary">{data.editors}</p>
            </div>
            <Pencil className="h-8 w-8 text-primary" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('users.roles.viewer', 'Visualizadores')}</p>
              <p className="text-2xl font-bold">{data.viewers}</p>
            </div>
            <Eye className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('users.stats.sso', 'SSO CCA')}</p>
              <p className="text-2xl font-bold text-risk-low">{data.ssoUsers}</p>
            </div>
            <KeyRound className="h-8 w-8 text-risk-low" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('users.stats.emailPassword', 'E-mail/Pass')}</p>
              <p className="text-2xl font-bold text-primary">{data.localUsers}</p>
            </div>
            <Lock className="h-8 w-8 text-primary" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('users.stats.lockedUsers', 'Bloqueados')}</p>
              <p className="text-2xl font-bold text-destructive">{data.lockedUsers}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
