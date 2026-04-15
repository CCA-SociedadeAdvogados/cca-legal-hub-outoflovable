import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface PageErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function PageError({
  message = 'Ocorreu um erro ao carregar os dados.',
  onRetry,
}: PageErrorProps) {
  return (
    <Alert variant="destructive" className="max-w-lg mx-auto mt-8">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Erro</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="ml-4">
            Tentar novamente
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
