import type { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { TIPO_DURACAO_LABELS, TIPO_RENOVACAO_LABELS } from '@/types/contracts';
import { DatePickerField } from './DatePickerField';
import type { ContratoFormValues } from './schema';

interface DatasTabProps {
  form: UseFormReturn<ContratoFormValues>;
  isLocal: boolean;
}

export function DatasTab({ form, isLocal }: DatasTabProps) {
  return (
    <div className="space-y-6 mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Datas e Duração</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          {!isLocal && (
            <FormField
              control={form.control}
              name="data_assinatura_parte_a"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Assinatura Parte A</FormLabel>
                  <DatePickerField value={field.value} onChange={field.onChange} />
                </FormItem>
              )}
            />
          )}
          {!isLocal && (
            <FormField
              control={form.control}
              name="data_assinatura_parte_b"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Assinatura Parte B</FormLabel>
                  <DatePickerField value={field.value} onChange={field.onChange} />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="data_inicio_vigencia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Início de Vigência</FormLabel>
                <DatePickerField value={field.value} onChange={field.onChange} />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="data_termo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Termo</FormLabel>
                <DatePickerField value={field.value} onChange={field.onChange} />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tipo_duracao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Duração</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(TIPO_DURACAO_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tipo_renovacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Renovação</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(TIPO_RENOVACAO_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="renovacao_periodo_meses"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Período de Renovação (meses)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    value={field.value ?? ''}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="aviso_previo_nao_renovacao_dias"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Aviso Prévio (dias)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Alertas */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração de Alertas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Os alertas são configurados automaticamente com base nas datas definidas. Receberá
            notificações 90, 60 e 30 dias antes da expiração do contrato.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
