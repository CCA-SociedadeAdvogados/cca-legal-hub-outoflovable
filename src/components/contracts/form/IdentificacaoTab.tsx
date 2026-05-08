import type { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Upload } from 'lucide-react';
import { TIPO_CONTRATO_LABELS, DEPARTAMENTO_LABELS } from '@/types/contracts';
import { ContractMainUpload } from '@/components/contracts/ContractMainUpload';
import type { ContratoFormValues } from './schema';

interface IdentificacaoTabProps {
  form: UseFormReturn<ContratoFormValues>;
  isEditing: boolean;
  contratoId?: string;
}

export function IdentificacaoTab({ form, isEditing, contratoId }: IdentificacaoTabProps) {
  return (
    <div className="space-y-6 mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Identificação do Contrato</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="tipo_contrato"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Contrato *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(TIPO_CONTRATO_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {form.watch('tipo_contrato') === 'outro' && (
            <FormField
              control={form.control}
              name="tipo_contrato_personalizado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo Personalizado</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Shareholder Agreement, Joint Venture..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="titulo_contrato"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Título do Contrato *</FormLabel>
                <FormControl>
                  <Input placeholder="Título descritivo do contrato" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="departamento_responsavel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departamento Responsável *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(DEPARTAMENTO_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="objeto_resumido"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Objecto (Resumo)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descrição resumida do objecto do contrato"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Upload do Contrato - só disponível após guardar */}
      {isEditing && contratoId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload do Contrato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ContractMainUpload contratoId={contratoId} />
          </CardContent>
        </Card>
      )}

      {!isEditing && (
        <Card className="border-dashed border-muted-foreground/50">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Upload className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>Guarde o contrato primeiro para poder fazer upload do ficheiro.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
