import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useOrganizations } from '@/hooks/useOrganizations';
import { Skeleton } from '@/components/ui/skeleton';
import { Scale } from 'lucide-react';

interface LawyerCardProps {
  title: string;
  config: Record<string, unknown>;
  organizationId: string | null;
}

const LawyerCard = forwardRef<HTMLDivElement, LawyerCardProps>(
  function LawyerCard({ title, organizationId }, ref) {
    const { t } = useTranslation();
    const { organizations, isLoading } = useOrganizations();
    
    const organization = organizations?.find(org => org.id === organizationId);

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

    if (!organization?.lawyer_name) {
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
              <p className="text-sm text-muted-foreground">
                {t('home.noLawyerAssociated')}
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    const initials = organization.lawyer_name
      .split(' ')
      .map(n => n[0])
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
              <AvatarImage src={organization.lawyer_photo_url || undefined} alt={organization.lawyer_name} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">{organization.lawyer_name}</p>
              <p className="text-sm text-muted-foreground">{t('home.responsibleLawyer')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

export default LawyerCard;
