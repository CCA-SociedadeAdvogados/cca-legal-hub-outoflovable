import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLawyerProfile } from '@/hooks/useLawyerProfile';
import { Skeleton } from '@/components/ui/skeleton';
import { Scale, Mail } from 'lucide-react';

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
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!lawyer?.nome_completo) {
    return (
      <Card ref={ref}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold font-serif">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-3">
              <Scale className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{t('home.noLawyerAssociated')}</p>
          </div>
        </CardContent>
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
      <CardHeader>
        <CardTitle className="text-lg font-semibold font-serif">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={lawyer.avatar_url || undefined} alt={lawyer.nome_completo} />
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {displayInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{lawyer.nome_completo}</p>
            <p className="text-sm text-muted-foreground">{t('home.responsibleLawyer')}</p>
            {lawyer.email && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Mail className="h-3 w-3" />
                {lawyer.email}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default LawyerCard;
