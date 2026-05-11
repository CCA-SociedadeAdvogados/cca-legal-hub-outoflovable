import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLawyerProfile } from '@/hooks/useLawyerProfile';
import { Scale, Mail } from 'lucide-react';
import { CCACardHeader } from '@/components/cca';

interface LawyerCardProps {
  title: string;
  config: Record<string, unknown>;
  organizationId: string | null;
}

const LawyerCard = forwardRef<HTMLDivElement, LawyerCardProps>(function LawyerCard(
  { title, organizationId },
  ref,
) {
  const { t } = useTranslation();
  const { data: lawyer, isLoading } = useLawyerProfile(organizationId);

  if (isLoading) {
    return (
      <Card ref={ref}>
        <CCACardHeader eyebrow="Advogado associado" title={title} />
        <div className="flex items-center gap-4 px-5 py-5">
          <div className="h-14 w-14 animate-pulse rounded-full bg-bg-alt" />
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-bg-alt" />
            <div className="h-3 w-24 animate-pulse rounded bg-bg-alt" />
          </div>
        </div>
      </Card>
    );
  }

  if (!lawyer?.nome_completo) {
    return (
      <Card ref={ref}>
        <CCACardHeader eyebrow="Advogado associado" title={title} />
        <div className="flex flex-col items-center justify-center px-5 py-8 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-bg-alt">
            <Scale className="h-6 w-6 text-ink-mute" strokeWidth={1.5} />
          </div>
          <p className="text-[13px] text-ink-mute">{t('home.noLawyerAssociated')}</p>
        </div>
      </Card>
    );
  }

  const displayInitials = lawyer.nome_completo
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card ref={ref}>
      <CCACardHeader eyebrow="Advogado associado" title={title} />
      <div className="flex items-center gap-4 px-5 py-5">
        <Avatar className="h-14 w-14">
          <AvatarImage src={lawyer.avatar_url || undefined} alt={lawyer.nome_completo} />
          <AvatarFallback className="bg-brand/10 font-display text-[15px] font-medium text-brand">
            {displayInitials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-display text-[15.5px] font-medium leading-tight text-ink">
            {lawyer.nome_completo}
          </p>
          <p className="mt-0.5 text-[11.5px] text-ink-mute">{t('home.responsibleLawyer')}</p>
          {lawyer.email && (
            <p className="mt-1 flex items-center gap-1 font-mono text-[11px] text-ink-mute">
              <Mail className="h-3 w-3" strokeWidth={1.5} />
              {lawyer.email}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
});

export default LawyerCard;
