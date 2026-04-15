import { toast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';

/** Standard mutation error handler for hooks using @/hooks/use-toast */
export function handleMutationError(error: Error, context: string) {
  console.error(`[${context}]`, error);
  toast({
    title: `Erro: ${context}`,
    description: error.message,
    variant: 'destructive',
  });
}

/** Standard mutation error handler for hooks using sonner */
export function handleSonnerMutationError(error: Error, context: string) {
  console.error(`[${context}]`, error);
  sonnerToast.error(error.message || `Erro em ${context}`);
}
