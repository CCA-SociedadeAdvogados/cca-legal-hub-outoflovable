import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useLawyerProfile } from '@/hooks/useLawyerProfile';
import { CCACardHeader, Eyebrow } from '@/components/cca';

interface OrganizationCardProps {
  title: string;
  config: Record<string, unknown>;
  organizationId: string | null;
}

const OrganizationCard = forwardRef<HTMLDivElement, OrganizationCardProps>(
  function OrganizationCard({ title, config, organizationId }, ref) {
    const { t } = useTranslation();
    const { organizations } = useOrganizations();
    const { data: lawyer } = useLawyerProfile(organizationId);

    const organization = organizations?.find((org) => org.id === organizationId);

    if (!organization) {
      return (
        <Card ref={ref}>
          <CCACardHeader eyebrow="Organização" title={title} />
          <p className="px-5 py-5 text-[13px] text-ink-mute">{t('home.organizationNotFound')}</p>
        </Card>
      );
    }

    const showLogo = config.showLogo !== false;
    const showLawyer = config.showLawyer !== false;

    const lawyerName = lawyer?.nome_completo;
    const lawyerPhoto = lawyer?.avatar_url;

    const displayInitials = lawyerName
      ? lawyerName
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
      : null;

    const orgInitials = organization.name.substring(0, 2).toUpperCase();

    return (
      <Card ref={ref}>
        <CCACardHeader eyebrow="Organização" title={title} />
        <div className="space-y-5 px-5 py-5">
          <div className="flex items-center gap-4">
            {showLogo && (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-control border border-line bg-bg-alt">
                {organization.logo_url ? (
                  <img
                    src={organization.logo_url}
                    alt={organization.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="font-display text-[16px] font-medium text-ink">
                    {orgInitials}
                  </span>
                )}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="truncate font-display text-[18px] font-medium leading-tight tracking-[-0.005em] text-ink">
                {organization.name}
              </h3>
              <p className="mt-0.5 text-[11.5px] text-ink-mute">{t('home.organization')}</p>
            </div>
          </div>

          {showLawyer && lawyerName && (
            <div className="space-y-2 border-t border-line-soft pt-4">
              <Eyebrow>{t('home.responsibleLawyer')}</Eyebrow>
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={lawyerPhoto || undefined} alt={lawyerName} />
                  <AvatarFallback className="bg-brand/10 text-[11px] font-medium text-brand">
                    {displayInitials || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <p className="text-[13px] font-medium text-ink">{lawyerName}</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  },
);

export default OrganizationCard;
