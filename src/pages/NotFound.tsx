import { useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/cca';
import { Compass, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-6">
      {/* Decorative oversized numeral */}
      <span
        aria-hidden
        className="pointer-events-none absolute select-none font-display font-semibold leading-none tracking-[-0.05em] text-brand/[0.06] text-[clamp(16rem,40vw,32rem)] [font-variant-numeric:tabular-nums]"
      >
        404
      </span>

      <div className="relative z-10 mx-auto max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-card border border-line bg-surface text-brand shadow-card">
            <Compass className="h-7 w-7" />
          </div>
        </div>

        <div className="mb-4 flex justify-center">
          <Eyebrow>{t('notFound.eyebrow', 'Erro 404')}</Eyebrow>
        </div>

        <h1 className="font-display text-[clamp(2.75rem,8vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.03em] text-ink [font-variant-numeric:tabular-nums]">
          {t('notFound.title', 'Página não encontrada')}
        </h1>

        <p className="mt-5 font-serif text-[17px] italic leading-[1.55] text-ink-soft">
          {t(
            'notFound.description',
            'A página que procura pode ter sido movida, arquivada ou nunca existiu.',
          )}
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('notFound.backHome', 'Voltar ao início')}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
