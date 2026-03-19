import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle } from 'lucide-react';

interface FAQItem {
  q: string;
  a: string;
}

const FAQ_BY_TYPE: Record<string, { pt: FAQItem[]; en: FAQItem[] }> = {
  nda: {
    pt: [
      { q: 'O que acontece se a informação confidencial for divulgada?', a: 'A parte que divulgar informação confidencial pode ser responsabilizada por danos. Verifique as cláusulas de indemnização e os limites de responsabilidade do contrato.' },
      { q: 'O NDA tem prazo de validade?', a: 'Sim, verifique a data de termo. Muitos NDAs têm obrigações de confidencialidade que se estendem além do prazo do contrato.' },
    ],
    en: [
      { q: 'What happens if confidential information is disclosed?', a: 'The disclosing party may be held liable for damages. Check the indemnification clauses and liability limits.' },
      { q: 'Does the NDA have an expiration date?', a: 'Yes, check the term date. Many NDAs have confidentiality obligations that extend beyond the contract term.' },
    ],
  },
  prestacao_servicos: {
    pt: [
      { q: 'O que acontece se os SLAs não forem cumpridos?', a: 'Verifique as cláusulas de penalização e os mecanismos de resolução previstos no contrato. Pode haver direito a créditos ou rescisão.' },
      { q: 'Como funciona a renovação deste contrato?', a: 'Depende do tipo de renovação configurado. Se automática, renova-se salvo denúncia dentro do prazo de aviso prévio.' },
      { q: 'Posso subcontratar parte dos serviços?', a: 'Verifique a cláusula de subcontratação do contrato. Alguns contratos proíbem expressamente esta possibilidade.' },
    ],
    en: [
      { q: 'What happens if SLAs are not met?', a: 'Check the penalty clauses and resolution mechanisms. There may be credit rights or termination options.' },
      { q: 'How does the renewal of this contract work?', a: 'Depends on the renewal type. If automatic, it renews unless notice is given within the notice period.' },
      { q: 'Can I subcontract part of the services?', a: 'Check the subcontracting clause. Some contracts expressly prohibit this.' },
    ],
  },
  saas: {
    pt: [
      { q: 'Os meus dados estão protegidos?', a: 'Verifique se existe DPA (Acordo de Processamento de Dados) anexo ao contrato e se estão definidas as categorias de dados tratados.' },
      { q: 'O que acontece se o fornecedor cessar actividade?', a: 'Verifique as cláusulas de continuidade e portabilidade de dados. É recomendável ter um plano de saída.' },
      { q: 'Posso cancelar a qualquer momento?', a: 'Depende do tipo de duração e renovação. Contratos de prazo determinado normalmente exigem cumprimento até ao final.' },
    ],
    en: [
      { q: 'Is my data protected?', a: 'Check if there is a DPA (Data Processing Agreement) attached and if data categories are defined.' },
      { q: 'What happens if the provider ceases operations?', a: 'Check continuity and data portability clauses. Having an exit plan is recommended.' },
      { q: 'Can I cancel at any time?', a: 'Depends on duration and renewal type. Fixed-term contracts typically require fulfilment until the end.' },
    ],
  },
  arrendamento: {
    pt: [
      { q: 'Qual o prazo de aviso para não renovar?', a: 'Verifique o campo "Aviso Prévio" nas datas do contrato. A legislação portuguesa define mínimos legais que podem prevalecer.' },
      { q: 'Quem é responsável pelas obras?', a: 'Verifique as obrigações de cada parte no contrato. Normalmente, obras estruturais são do senhorio e não estruturais do arrendatário.' },
    ],
    en: [
      { q: 'What is the notice period for non-renewal?', a: 'Check the "Notice Period" field. Portuguese law defines legal minimums that may prevail.' },
      { q: 'Who is responsible for renovations?', a: 'Check each party\'s obligations. Typically structural works are the landlord\'s and non-structural the tenant\'s.' },
    ],
  },
  trabalho: {
    pt: [
      { q: 'Qual o período experimental?', a: 'O período experimental varia conforme o tipo de contrato e funções. Consulte o contrato e a legislação laboral vigente.' },
      { q: 'Como funciona a denúncia do contrato?', a: 'A denúncia segue regras específicas do Código do Trabalho, com prazos mínimos de aviso prévio conforme a antiguidade.' },
    ],
    en: [
      { q: 'What is the probation period?', a: 'The probation period varies by contract type and role. Check the contract and current labor legislation.' },
      { q: 'How does contract termination work?', a: 'Termination follows specific Labor Code rules, with minimum notice periods based on seniority.' },
    ],
  },
};

const DEFAULT_FAQ = {
  pt: [
    { q: 'Como posso renovar este contrato?', a: 'Verifique o tipo de renovação configurado no contrato. Se for renovação automática, o contrato renova-se automaticamente salvo denúncia dentro do prazo.' },
    { q: 'Onde encontro os documentos anexos?', a: 'Os documentos estão disponíveis no separador "Histórico" > "Anexos" na página do contrato.' },
  ],
  en: [
    { q: 'How can I renew this contract?', a: 'Check the renewal type. If automatic, the contract renews automatically unless notice is given within the deadline.' },
    { q: 'Where can I find attached documents?', a: 'Documents are available in the "History" > "Attachments" tab on the contract page.' },
  ],
};

export function ContractFAQ({ tipoContrato }: { tipoContrato: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'pt';

  const typeFaq = FAQ_BY_TYPE[tipoContrato]?.[lang] ?? [];
  const defaultFaq = DEFAULT_FAQ[lang];
  const allFaq = [...typeFaq, ...defaultFaq];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          {t('faq.title', 'Perguntas Frequentes')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {allFaq.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-sm text-left">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {item.a}
                <p className="mt-2 text-xs italic text-muted-foreground/70">
                  {t('faq.disclaimer', 'Informação genérica. Consulte sempre o seu advogado para decisões legais.')}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
