import { AlertTriangle, X, User, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useEffectiveIndustrySectors } from '@/hooks/useEffectiveIndustrySectors';
import { getSectorLabel } from '@/lib/industrySectors';

export function ImpersonationBanner() {
  const {
    isImpersonating,
    impersonatedOrgName,
    impersonatedUserName,
    impersonationType,
    stopImpersonation,
    reason,
  } = useImpersonation();
  const { primarySector } = useEffectiveIndustrySectors();

  if (!isImpersonating) return null;

  const isUserImpersonation = impersonationType === 'user';

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-amber-950 py-2.5 px-4 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-600/20">
          {isUserImpersonation ? (
            <User className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">
              {isUserImpersonation ? 'Modo Impersonation — Utilizador' : 'Modo Impersonation — Organização'}
            </span>
            {!isUserImpersonation && primarySector && (
              <Badge
                variant="outline"
                className="text-xs bg-amber-100/50 border-amber-700 text-amber-900"
              >
                {getSectorLabel(primarySector)}
              </Badge>
            )}
          </div>
          <span className="text-xs opacity-80">
            {isUserImpersonation ? (
              <>
                Está a impersonar: <strong>{impersonatedUserName}</strong>
                {reason && <span className="ml-2">• Motivo: {reason}</span>}
              </>
            ) : (
              <>
                A atuar no contexto de: <strong>{impersonatedOrgName}</strong>
                {reason && <span className="ml-2">• Motivo: {reason}</span>}
              </>
            )}
          </span>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={stopImpersonation}
        className="bg-amber-100 border-amber-600 text-amber-900 hover:bg-amber-200 hover:text-amber-950"
      >
        <X className="h-4 w-4 mr-1" />
        Sair da impersonação
      </Button>
    </div>
  );
}
