import { Contract } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, FileCheck, AlertCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ContractsListProps {
  contracts: Contract[];
  maxItems?: number;
  title?: string;
}

export function ContractsList({ contracts, maxItems = 5, title = "Contratos" }: ContractsListProps) {
  const now = new Date();
  
  const displayedContracts = contracts
    .filter(c => c.estadoContrato === 'VIGENTE')
    .sort((a, b) => {
      const daysA = a.dataFimPrevista ? differenceInDays(new Date(a.dataFimPrevista), now) : Infinity;
      const daysB = b.dataFimPrevista ? differenceInDays(new Date(b.dataFimPrevista), now) : Infinity;
      return daysA - daysB;
    })
    .slice(0, maxItems);

  const getStatusVariant = (contract: Contract) => {
    if (!contract.dataFimPrevista) return 'active';
    const daysUntilExpiry = differenceInDays(new Date(contract.dataFimPrevista), now);
    if (daysUntilExpiry <= 30) return 'expired';
    if (daysUntilExpiry <= 60) return 'pending';
    return 'active';
  };

  const formatValue = (value: number, currency: string) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        <Button variant="ghost" size="sm" className="text-accent">
          Ver todos
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayedContracts.map((contract) => {
          const daysUntilExpiry = contract.dataFimPrevista 
            ? differenceInDays(new Date(contract.dataFimPrevista), now)
            : null;
          const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 60;
          
          return (
            <div
              key={contract.id}
              className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer group"
            >
              <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                isExpiringSoon ? "bg-risk-medium/10" : "bg-muted"
              )}>
                {isExpiringSoon ? (
                  <AlertCircle className="h-5 w-5 text-risk-medium" />
                ) : (
                  <FileCheck className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={getStatusVariant(contract)} className="text-[10px]">
                    {daysUntilExpiry !== null 
                      ? daysUntilExpiry <= 0 
                        ? 'Expirado'
                        : `${daysUntilExpiry} dias`
                      : 'Sem prazo'}
                  </Badge>
                  {contract.renovacaoAutomatica && (
                    <Badge variant="subtle" className="text-[10px]">
                      Renov. Auto
                    </Badge>
                  )}
                </div>
                <p className="font-medium text-sm truncate">{contract.titulo}</p>
                <p className="text-xs text-muted-foreground">{contract.tipoContrato}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-medium text-sm">
                  {formatValue(contract.valorContrato, contract.moeda)}
                </p>
                {contract.dataFimPrevista && (
                  <p className="text-xs text-muted-foreground">
                    até {format(new Date(contract.dataFimPrevista), "dd/MM/yyyy")}
                  </p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
