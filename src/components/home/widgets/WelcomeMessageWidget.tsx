import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { useContentBlock } from '@/hooks/useContentBlocks';
import { Eyebrow } from '@/components/cca';

interface WelcomeMessageWidgetProps {
  title: string;
  config: Record<string, unknown>;
  organizationId: string | null;
}

/** Concentric SVG ornament with "CCA" centred — opacity 0.08 over the hero. */
function CCAOrnament() {
  return (
    <svg
      viewBox="0 0 220 220"
      aria-hidden
      className="pointer-events-none absolute right-6 top-1/2 hidden h-[200px] w-[200px] -translate-y-1/2 select-none text-ink opacity-[0.08] md:block"
    >
      <circle cx="110" cy="110" r="100" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="110" cy="110" r="76" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="110" cy="110" r="52" fill="none" stroke="currentColor" strokeWidth="1" />
      <text
        x="110"
        y="118"
        textAnchor="middle"
        fontFamily="Fraunces, Georgia, serif"
        fontSize="28"
        fontWeight="500"
        letterSpacing="0.06em"
        fill="currentColor"
      >
        CCA
      </text>
    </svg>
  );
}

const WelcomeMessageWidget = forwardRef<HTMLDivElement, WelcomeMessageWidgetProps>(
  function WelcomeMessageWidget({ title, config, organizationId }, ref) {
    const { t } = useTranslation();
    const contentKey = (config.contentBlockKey as string) || 'welcome_message';
    const { block, isLoading } = useContentBlock(organizationId, contentKey);

    const displayTitle = block?.title || t('home.welcomeTitle');
    const displayContent = block?.content || t('home.welcomeDescription');

    return (
      <Card
        ref={ref}
        className="relative overflow-hidden border-line bg-gradient-hero md:col-span-2 lg:col-span-3"
      >
        <CCAOrnament />
        <div className="relative grid gap-6 px-7 py-8 md:grid-cols-[1fr_auto] md:items-center md:px-9 md:py-10">
          <div className="min-w-0 space-y-3">
            <Eyebrow>✦ {title}</Eyebrow>
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-7 w-3/4 animate-pulse rounded bg-bg-alt" />
                <div className="h-5 w-1/2 animate-pulse rounded bg-bg-alt" />
              </div>
            ) : (
              <>
                <h2 className="font-display text-[26px] font-medium leading-[1.15] tracking-[-0.005em] text-ink md:text-[28px]">
                  {displayTitle}
                </h2>
                <p className="max-w-prose text-[13.5px] leading-[1.65] text-ink-soft">
                  {displayContent}
                </p>
              </>
            )}
          </div>
        </div>
      </Card>
    );
  },
);

export default WelcomeMessageWidget;
