import { useTranslation } from 'react-i18next';
import { Eyebrow } from '@/components/cca';
import { PortalDocumentsBrowser } from '@/portal/components/PortalDocumentsBrowser';

export default function PortalDocumentos() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <Eyebrow>{t('portal.pages.documents.eyebrow')}</Eyebrow>
        <h1 className="font-display text-2xl font-medium tracking-[-0.01em] text-ink">
          {t('portal.pages.documents.title')}
        </h1>
        <p className="max-w-2xl text-[13.5px] leading-relaxed text-ink-mute">
          {t('portal.pages.documents.description')}
        </p>
      </header>

      <PortalDocumentsBrowser />
    </div>
  );
}
