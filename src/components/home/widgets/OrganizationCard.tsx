import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, User } from 'lucide-react';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useAzureProfile } from '@/hooks/useAzureProfile';

interface OrganizationCardProps {
  title: string;
  config: Record<string, unknown>;
  organizationId: string | null;
}

const OrganizationCard = forwardRef<HTMLDivElement, OrganizationCardProps>(
  function OrganizationCard({ title, config, organizationId }, ref) {
    const { t } = useTranslation();
    const { currentOrganization } = useOrganizations();
    const { nomeCompleto, photoUrl, iniciais, isSSO } = useAzureProfile();

    const organization = currentOrganization?.id === organizationId ? currentOrganization : null;

    if (!organization) {
      return (
        <Card ref={ref}>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('home.organizationNotFound')}
            </p>
          </CardContent>
        </Card>
      );
    }

    const showLogo = config.showLogo !== false;
    const showLawyer = config.showLawyer !== false;

    // Para CCA SSO users, mostrar dados do utilizador autenticado como advogado
    const lawyerName = isSSO
      ? nomeCompleto
      : (organization as unknown as { lawyer_name?: string }).lawyer_name;
    const lawyerPhoto = isSSO
      ? photoUrl
      : (organization as unknown as { lawyer_photo_url?: string }).lawyer_photo_url;

    return (
      <Card ref={ref}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {showLogo && (
              <Avatar className="h-16 w-16">
                <AvatarImage src={organization.logo_url || undefined} alt={organization.name} />
                <AvatarFallback className="text-lg">
                  {organization.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              <h3 className="font-semibold text-lg">{organization.name}</h3>
              <p className="text-sm text-muted-foreground">
                {t('home.organization')}
              </p>
            </div>
          </div>

          {showLawyer && lawyerName && (
            <div className="flex items-center gap-3 pt-2 border-t">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={lawyerPhoto || undefined}
                  alt={lawyerName}
                />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {isSSO ? iniciais : <User className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-muted-foreground">{t('home.responsibleLawyer')}</p>
                <p className="text-sm font-medium">{lawyerName}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

export default OrganizationCard;
