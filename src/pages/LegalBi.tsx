import { AppLayout } from '@/components/layout/AppLayout';
import { useOrganizations } from '@/hooks/useOrganizations';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, BarChart3, AlertCircle, Loader2, Monitor } from 'lucide-react';

export default function LegalBi() {
  const { currentOrganization, isLoading } = useOrganizations();

  const legalbiUrl = (currentOrganization as any)?.legalbi_url as string | null | undefined;

  const handleOpenInNewTab = () => {
    if (legalbiUrl) {
      window.open(legalbiUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!legalbiUrl) {
    return (
      <AppLayout>
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold font-serif flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              LegalBi
            </h1>
            <p className="text-muted-foreground mt-1">
              Plataforma de Business Intelligence jurídico
            </p>
          </div>
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle>LegalBi não configurado</CardTitle>
              <CardDescription>
                O URL do LegalBi ainda não foi configurado para esta organização. Por favor contacte o administrador da plataforma.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold font-serif flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            LegalBi
          </h1>
          <p className="text-muted-foreground mt-1">
            Plataforma de Business Intelligence jurídico
          </p>
        </div>

        <Card className="max-w-lg mx-auto">
          <CardHeader className="text-center">
            <Monitor className="h-12 w-12 mx-auto text-primary mb-4" />
            <CardTitle>Aceder ao LegalBi</CardTitle>
            <CardDescription className="mt-2">
              O LegalBi abre numa janela separada do browser. Certifique-se de que está ligado à rede ou VPN da empresa para que a autenticação funcione correctamente.
            </CardDescription>
            <Button
              onClick={handleOpenInNewTab}
              className="mt-6 flex items-center gap-2 w-full"
              size="lg"
            >
              <ExternalLink className="h-5 w-5" />
              Abrir LegalBi
            </Button>
          </CardHeader>
        </Card>
      </div>
    </AppLayout>
  );
}
