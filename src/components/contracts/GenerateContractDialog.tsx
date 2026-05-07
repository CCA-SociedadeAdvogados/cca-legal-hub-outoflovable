import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useGenerateContract, type GenerateContractFields } from '@/hooks/useGenerateContract';
import { Wand2, Copy, Check, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const TEMPLATES = [
  { value: 'nda', label: 'NDA — Acordo de Confidencialidade' },
  { value: 'prestacao_servicos', label: 'Prestação de Serviços' },
  { value: 'saas', label: 'SaaS' },
  { value: 'fornecimento', label: 'Fornecimento de Bens' },
  { value: 'trabalho', label: 'Contrato de Trabalho' },
  { value: 'consultoria', label: 'Consultoria' },
  { value: 'parceria', label: 'Parceria Comercial' },
  { value: 'arrendamento', label: 'Arrendamento (NRAU)' },
  { value: 'licenciamento', label: 'Licenciamento de PI' },
];

const EMPTY_FIELDS = {
  parte_a_nome: '',
  parte_a_nif: '',
  parte_b_nome: '',
  parte_b_nif: '',
  objeto: '',
  valor: '',
  moeda: 'EUR',
  data_inicio: '',
  duracao_meses: '',
  notas_adicionais: '',
};

export function GenerateContractDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [templateType, setTemplateType] = useState('');
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [copied, setCopied] = useState(false);
  const { generate } = useGenerateContract();

  const reset = () => {
    setStep(1);
    setTemplateType('');
    setFields(EMPTY_FIELDS);
    setCopied(false);
  };

  const handleGenerate = () => {
    const payload: GenerateContractFields = {
      parte_a_nome: fields.parte_a_nome,
      parte_b_nome: fields.parte_b_nome,
      objeto: fields.objeto,
    };
    if (fields.parte_a_nif) payload.parte_a_nif = fields.parte_a_nif;
    if (fields.parte_b_nif) payload.parte_b_nif = fields.parte_b_nif;
    if (fields.valor) payload.valor = Number(fields.valor);
    if (fields.moeda) payload.moeda = fields.moeda;
    if (fields.data_inicio) payload.data_inicio = fields.data_inicio;
    if (fields.duracao_meses) payload.duracao_meses = Number(fields.duracao_meses);
    if (fields.notas_adicionais) payload.notas_adicionais = fields.notas_adicionais;

    generate.mutate({ templateType, fields: payload }, { onSuccess: () => setStep(3) });
  };

  const handleCopy = () => {
    if (generate.data?.contractText) {
      navigator.clipboard.writeText(generate.data.contractText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const canProceedStep1 = !!templateType;
  const canProceedStep2 =
    fields.parte_a_nome.trim() && fields.parte_b_nome.trim() && fields.objeto.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Wand2 className="mr-2 h-4 w-4" />
          Gerar com IA
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Gerar Rascunho de Contrato
            <Badge variant="outline" className="text-xs font-normal">
              Claude Sonnet
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-sm">
          {[
            { n: 1, label: 'Tipo' },
            { n: 2, label: 'Partes & Dados' },
            { n: 3, label: 'Rascunho' },
          ].map(({ n, label }) => (
            <div key={n} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  step === n
                    ? 'bg-primary text-primary-foreground'
                    : step > n
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {n}
              </div>
              <span
                className={cn(
                  'text-xs',
                  step === n ? 'text-foreground font-medium' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
              {n < 3 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 1: Template selector */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Seleccione o tipo de contrato. O Claude irá gerar um rascunho completo em português
              jurídico.
            </p>
            <div className="grid gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTemplateType(t.value)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm text-left transition-colors',
                    templateType === t.value
                      ? 'border-primary bg-primary/5 font-medium'
                      : 'hover:bg-muted',
                  )}
                >
                  <div
                    className={cn(
                      'h-3 w-3 rounded-full border-2',
                      templateType === t.value
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground',
                    )}
                  />
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Seguinte <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Fields */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Preencha os dados essenciais. Campos opcionais podem ser deixados em branco.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  Parte A — Nome Legal <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={fields.parte_a_nome}
                  onChange={(e) => setFields((f) => ({ ...f, parte_a_nome: e.target.value }))}
                  placeholder="Ex: CCA — Sociedade de Advogados"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Parte A — NIF</Label>
                <Input
                  value={fields.parte_a_nif}
                  onChange={(e) => setFields((f) => ({ ...f, parte_a_nif: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Parte B — Nome Legal <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={fields.parte_b_nome}
                  onChange={(e) => setFields((f) => ({ ...f, parte_b_nome: e.target.value }))}
                  placeholder="Ex: Empresa XYZ, S.A."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Parte B — NIF</Label>
                <Input
                  value={fields.parte_b_nif}
                  onChange={(e) => setFields((f) => ({ ...f, parte_b_nif: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Objecto do Contrato <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={fields.objeto}
                onChange={(e) => setFields((f) => ({ ...f, objeto: e.target.value }))}
                placeholder="Descreva de forma clara o objecto e âmbito do contrato..."
                className="min-h-[80px]"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Valor (opcional)</Label>
                <Input
                  type="number"
                  value={fields.valor}
                  onChange={(e) => setFields((f) => ({ ...f, valor: e.target.value }))}
                  placeholder="Ex: 50000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Moeda</Label>
                <Select
                  value={fields.moeda}
                  onValueChange={(v) => setFields((f) => ({ ...f, moeda: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Duração (meses)</Label>
                <Input
                  type="number"
                  value={fields.duracao_meses}
                  onChange={(e) => setFields((f) => ({ ...f, duracao_meses: e.target.value }))}
                  placeholder="Ex: 12"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Data de Início</Label>
                <Input
                  type="date"
                  value={fields.data_inicio}
                  onChange={(e) => setFields((f) => ({ ...f, data_inicio: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notas adicionais para o Claude (opcional)</Label>
              <Textarea
                value={fields.notas_adicionais}
                onChange={(e) => setFields((f) => ({ ...f, notas_adicionais: e.target.value }))}
                placeholder="Ex: incluir cláusula de não concorrência de 2 anos, jurisdição de Lisboa..."
                className="min-h-[60px]"
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
              </Button>
              <Button onClick={handleGenerate} disabled={!canProceedStep2 || generate.isPending}>
                {generate.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />A gerar...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Gerar Rascunho
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 3 && generate.data && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Rascunho gerado. Reveja, copie e use como base — não substitui revisão jurídica.
              </p>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-600" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
            <Textarea
              value={generate.data.contractText}
              readOnly
              className="min-h-[400px] font-mono text-xs leading-relaxed"
            />
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Ajustar dados
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  reset();
                  setOpen(false);
                }}
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
