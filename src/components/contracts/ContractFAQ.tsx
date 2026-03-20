import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle } from 'lucide-react';

interface FAQItem {
  q: string;
  a: string;
}

export function ContractFAQ({ tipoContrato }: { tipoContrato: string }) {
  const { t } = useTranslation();

  const typeItems = t(`faq.${tipoContrato}`, { returnObjects: true, defaultValue: [] }) as FAQItem[];
  const defaultItems = t('faq.default', { returnObjects: true, defaultValue: [] }) as FAQItem[];

  // Use type-specific items; append default only if type has none
  const typeHasItems = Array.isArray(typeItems) && typeItems.length > 0;
  const allFaq: FAQItem[] = typeHasItems
    ? [...typeItems, ...defaultItems]
    : defaultItems;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          {t('faq.title')}
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
                  {t('faq.disclaimer')}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
