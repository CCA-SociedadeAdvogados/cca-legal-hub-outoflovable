import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  ExternalLink, 
  Download, 
  Calendar, 
  Clock,
  FileText,
  Link as LinkIcon
} from 'lucide-react';
import { useLegalDocument, getStorageUrl } from '@/hooks/useLegalMirror';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const sourceColors: Record<string, string> = {
  dre: 'bg-blue-500/10 text-blue-700 border-blue-200',
  'eur-lex': 'bg-indigo-500/10 text-indigo-700 border-indigo-200',
  bdp: 'bg-green-500/10 text-green-700 border-green-200',
  asf: 'bg-purple-500/10 text-purple-700 border-purple-200',
  cmvm: 'bg-orange-500/10 text-orange-700 border-orange-200'
};

const sourceNames: Record<string, string> = {
  dre: 'Diário da República',
  'eur-lex': 'EUR-Lex (União Europeia)',
  bdp: 'Banco de Portugal',
  asf: 'ASF',
  cmvm: 'CMVM'
};

export default function NormativoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { data: doc, isLoading, error } = useLegalDocument(id);

  const storageUrl = doc ? getStorageUrl(doc.storage_path) : null;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  if (error || !doc) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold mb-2">Documento não encontrado</h2>
          <p className="text-muted-foreground mb-4">
            O documento solicitado não existe ou foi removido.
          </p>
          <Button asChild>
            <Link to="/normativos">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar aos Normativos
            </Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" asChild>
          <Link to="/normativos">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>

        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={sourceColors[doc.source_key] || ''}>
                    {doc.source_key.toUpperCase()}
                  </Badge>
                  <Badge variant="secondary">
                    {doc.doc_type.toUpperCase()}
                  </Badge>
                </div>
                
                <CardTitle className="text-2xl">
                  {doc.title || 'Documento sem título'}
                </CardTitle>
                
                <p className="text-sm text-muted-foreground">
                  Fonte: {sourceNames[doc.source_key] || doc.source_key}
                </p>
              </div>
              
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" asChild>
                  <a href={doc.canonical_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver Original
                  </a>
                </Button>
                
                {storageUrl && (
                  <Button asChild>
                    <a href={storageUrl} target="_blank" rel="noopener noreferrer" download>
                      <Download className="h-4 w-4 mr-2" />
                      Descarregar Cópia
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {doc.published_at && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Publicado</p>
                    <p className="font-medium">
                      {format(new Date(doc.published_at), 'dd MMMM yyyy', { locale: pt })}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Indexado</p>
                  <p className="font-medium">
                    {format(new Date(doc.fetched_at), 'dd/MM/yyyy HH:mm', { locale: pt })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Tipo</p>
                  <p className="font-medium">{doc.mime_type || doc.doc_type}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Última verificação</p>
                  <p className="font-medium">
                    {format(new Date(doc.last_seen_at), 'dd/MM/yyyy HH:mm', { locale: pt })}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* URL Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              URL Original
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a 
              href={doc.canonical_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all"
            >
              {doc.canonical_url}
            </a>
          </CardContent>
        </Card>

        {/* PDF Preview or Content */}
        {doc.doc_type === 'pdf' && storageUrl ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pré-visualização</CardTitle>
            </CardHeader>
            <CardContent>
              <iframe 
                src={storageUrl}
                className="w-full h-[800px] rounded-lg border"
                title={doc.title || 'PDF Preview'}
              />
            </CardContent>
          </Card>
        ) : doc.content_text ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conteúdo Extraído</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <pre className="whitespace-pre-wrap text-sm font-sans bg-muted/50 p-4 rounded-lg overflow-auto max-h-[600px]">
                  {doc.content_text}
                </pre>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Metadata */}
        {doc.meta && Object.keys(doc.meta).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Metadados</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-auto">
                {JSON.stringify(doc.meta, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
