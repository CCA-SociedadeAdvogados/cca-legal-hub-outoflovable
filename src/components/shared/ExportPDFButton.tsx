import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

interface ExportPDFButtonProps {
  contentId: string;
  filename?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ExportPDFButton({ contentId, filename, variant = 'outline', size = 'sm' }: ExportPDFButtonProps) {
  const { t } = useTranslation();

  const handleExport = () => {
    const content = document.getElementById(contentId);
    if (!content) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=1024,height=768');
    if (!printWindow) return;

    // Get all stylesheets from the current page
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => el.outerHTML)
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${filename || 'Relatório CCA Legal Hub'}</title>
          ${styles}
          <style>
            @media print {
              body {
                padding: 20px;
                font-size: 12px;
                color: #000 !important;
                background: #fff !important;
              }
              .no-print { display: none !important; }
              * {
                color-adjust: exact !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
            body {
              padding: 20px;
              max-width: 1024px;
              margin: 0 auto;
              background: #fff;
              color: #000;
            }
            .print-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 24px;
              padding-bottom: 16px;
              border-bottom: 2px solid #FF7F41;
            }
            .print-header h1 {
              font-size: 20px;
              font-weight: bold;
              color: #333;
            }
            .print-header .date {
              font-size: 12px;
              color: #666;
            }
            .print-footer {
              margin-top: 32px;
              padding-top: 16px;
              border-top: 1px solid #ddd;
              font-size: 10px;
              color: #999;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>CCA Legal Hub — ${filename || 'Relatório'}</h1>
            <span class="date">${new Date().toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          ${content.innerHTML}
          <div class="print-footer">
            Gerado automaticamente por CCA Legal Hub · ${new Date().toLocaleString('pt-PT')} · Documento para uso interno
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    // Wait for styles to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  };

  return (
    <Button variant={variant} size={size} onClick={handleExport}>
      <FileDown className="mr-2 h-4 w-4" />
      {t('export.pdf', 'Exportar PDF')}
    </Button>
  );
}
