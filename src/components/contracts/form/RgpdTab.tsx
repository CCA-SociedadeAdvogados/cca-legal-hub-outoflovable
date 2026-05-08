import type { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { CheckCircle2, XCircle, Globe } from 'lucide-react';
import { PAPEL_ENTIDADE_LABELS } from '@/types/contracts';
import type { ContratoFormValues } from './schema';

interface RgpdTabProps {
  form: UseFormReturn<ContratoFormValues>;
  isLocal: boolean;
}

function ReadOnlyIndicators({ form }: { form: UseFormReturn<ContratoFormValues> }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Indicadores detectados automaticamente pelo Agente CCA após análise do documento.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex items-center gap-3 rounded-lg border p-4">
          {form.watch('tratamento_dados_pessoais') ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
          <div>
            <p className="font-medium text-sm">Dados pessoais detectados</p>
            <p className="text-xs text-muted-foreground">
              {form.watch('tratamento_dados_pessoais') ? 'Sim' : 'Não'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border p-4">
          {form.watch('existe_dpa_anexo_rgpd') ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
          <div>
            <p className="font-medium text-sm">DPA detectado</p>
            <p className="text-xs text-muted-foreground">
              {form.watch('existe_dpa_anexo_rgpd') ? 'Sim' : 'Não'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border p-4">
          {form.watch('transferencia_internacional') ? (
            <Globe className="h-5 w-5 text-amber-500 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
          <div>
            <p className="font-medium text-sm">Transferência internacional detectada</p>
            <p className="text-xs text-muted-foreground">
              {form.watch('transferencia_internacional') ? 'Sim' : 'Não'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FullRgpdForm({ form }: { form: UseFormReturn<ContratoFormValues> }) {
  return (
    <>
      <FormField
        control={form.control}
        name="tratamento_dados_pessoais"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-lg border p-4">
            <FormLabel>Envolve Tratamento de Dados Pessoais</FormLabel>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
      {form.watch('tratamento_dados_pessoais') && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="papel_entidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Papel da Entidade</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PAPEL_ENTIDADE_LABELS).map(([value, label]) => (
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
              name="categorias_dados_pessoais"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categorias de Dados</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Nome, email, morada" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categorias_titulares"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categorias de Titulares</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Clientes, colaboradores" />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="transferencia_internacional"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <FormLabel>Transferência Internacional</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          {form.watch('transferencia_internacional') && (
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="paises_transferencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Países de Transferência</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="base_legal_transferencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Legal</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="existe_dpa_anexo_rgpd"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <FormLabel>Existe DPA/Anexo RGPD</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dpia_realizada"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <FormLabel>DPIA Realizada</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          {form.watch('existe_dpa_anexo_rgpd') && (
            <FormField
              control={form.control}
              name="referencia_dpa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referência DPA</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          )}
          {form.watch('dpia_realizada') && (
            <FormField
              control={form.control}
              name="referencia_dpia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referência DPIA</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          )}
        </>
      )}
    </>
  );
}

export function RgpdTab({ form, isLocal }: RgpdTabProps) {
  return (
    <div className="space-y-6 mt-6">
      <Card>
        <CardHeader>
          <CardTitle>RGPD e Protecção de Dados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLocal ? <ReadOnlyIndicators form={form} /> : <FullRgpdForm form={form} />}
        </CardContent>
      </Card>
    </div>
  );
}
