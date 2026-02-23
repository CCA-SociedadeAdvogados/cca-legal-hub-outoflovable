import { useRef, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useOrganizations } from '@/hooks/useOrganizations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, BarChart3, AlertCircle, Loader2 } from 'lucide-react';

export default function LegalBi() {
  const { currentOrganization, isLoading } = useOrganizations();
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
      <div className="flex flex-col h-[calc(100vh-6rem)] animate-fade-in -m-6">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">LegalBi</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenInNewTab}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir em novo separador
          </Button>
        </div>

        {/* Iframe area */}
        <div className="relative flex-1 bg-muted/30">
          {!iframeLoaded && !iframeError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {iframeError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="font-semibold text-lg">Não foi possível carregar o LegalBi</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  O site pode estar a bloquear a incorporação. Abre-o diretamente num novo separador.
                </p>
              </div>
              <Button onClick={handleOpenInNewTab} className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Abrir LegalBi
              </Button>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              src={legalbiUrl}
              className="w-full h-full border-0"
              title="LegalBi"
              onLoad={() => setIframeLoaded(true)}
              onError={() => {
                setIframeError(true);
                setIframeLoaded(true);
              }}
              allow="fullscreen"
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
