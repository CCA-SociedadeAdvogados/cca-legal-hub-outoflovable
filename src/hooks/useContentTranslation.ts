import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { translationService } from '@/lib/TranslationService';
import { useEffectiveOrganization } from '@/hooks/useEffectiveOrganization';

export function useContentTranslation() {
  const { i18n } = useTranslation();
  const { effectiveOrganizationId } = useEffectiveOrganization();
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Keep stable reference to avoid useEffect re-runs
  const orgIdRef = useRef(effectiveOrganizationId);
  orgIdRef.current = effectiveOrganizationId;

  const translate = useCallback(async (
    texts: string[],
    context?: string
  ): Promise<string[]> => {
    // If Portuguese, return originals (content is already in PT)
    if (i18n.language === 'pt') {
      return texts;
    }

    setIsTranslating(true);
    
    try {
      const result = await translationService.translate(
        texts,
        context,
        orgIdRef.current || undefined
      );
      return result;
    } catch (error) {
      // If aborted, just return originals silently
      if ((error as Error).name === 'AbortError') {
        return texts;
      }
      console.error('Translation error:', error);
      return texts;
    } finally {
      setIsTranslating(false);
    }
  }, [i18n.language]);

  const translateSingle = useCallback(async (
    text: string,
    context?: string
  ): Promise<string> => {
    const [result] = await translate([text], context);
    return result;
  }, [translate]);

  return { 
    translate, 
    translateSingle, 
    isTranslating,
    needsTranslation: i18n.language !== 'pt'
  };
}
