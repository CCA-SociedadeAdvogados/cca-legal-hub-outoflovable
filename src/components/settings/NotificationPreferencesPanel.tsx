import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Bell, Loader2, X, Plus } from 'lucide-react';

export function NotificationPreferencesPanel() {
  const { t } = useTranslation();
  const { prefs, isLoading, updatePrefs } = useNotificationPreferences();

  const [localPrefs, setLocalPrefs] = useState(prefs);
  const [newDays, setNewDays] = useState('');

  useEffect(() => {
    setLocalPrefs(prefs);
  }, [prefs]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const handleSave = () => {
    updatePrefs.mutate({
      expiry_alert_days: localPrefs.expiry_alert_days,
      enable_contract_expiry: localPrefs.enable_contract_expiry,
      enable_financial_due: localPrefs.enable_financial_due,
      enable_legislative_events: localPrefs.enable_legislative_events,
      enable_cca_news: localPrefs.enable_cca_news,
      enable_document_checklist: localPrefs.enable_document_checklist,
      channel_in_app: localPrefs.channel_in_app,
      channel_email: localPrefs.channel_email,
    });
  };

  const addDays = () => {
    const val = parseInt(newDays);
    if (val > 0 && !localPrefs.expiry_alert_days.includes(val)) {
      setLocalPrefs(p => ({
        ...p,
        expiry_alert_days: [...p.expiry_alert_days, val].sort((a, b) => b - a),
      }));
      setNewDays('');
    }
  };

  const removeDays = (val: number) => {
    setLocalPrefs(p => ({
      ...p,
      expiry_alert_days: p.expiry_alert_days.filter(d => d !== val),
    }));
  };

  const togglePref = (key: keyof typeof localPrefs) => {
    setLocalPrefs(p => ({ ...p, [key]: !p[key] }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t('notifPrefs.title', 'Preferências de Notificação')}
        </CardTitle>
        <CardDescription>
          {t('notifPrefs.subtitle', 'Configure quais alertas pretende receber e quando')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Expiry alert days */}
        <div>
          <Label className="text-sm font-medium">
            {t('notifPrefs.expiryDays', 'Alertar X dias antes da expiração')}
          </Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {localPrefs.expiry_alert_days.map(d => (
              <Badge key={d} variant="secondary" className="gap-1 pr-1">
                {d} {t('notifPrefs.days', 'dias')}
                <button onClick={() => removeDays(d)} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Input
              type="number"
              min={1}
              max={365}
              value={newDays}
              onChange={(e) => setNewDays(e.target.value)}
              placeholder={t('notifPrefs.addDays', 'Adicionar dias...')}
              className="w-32"
              onKeyDown={(e) => e.key === 'Enter' && addDays()}
            />
            <Button variant="outline" size="sm" onClick={addDays}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Type toggles */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">{t('notifPrefs.types', 'Tipos de Alerta')}</Label>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('notifPrefs.contractExpiry', 'Expiração de Contratos')}</p>
              <p className="text-xs text-muted-foreground">{t('notifPrefs.contractExpiryDesc', 'Alertas quando contratos se aproximam do termo')}</p>
            </div>
            <Switch checked={localPrefs.enable_contract_expiry} onCheckedChange={() => togglePref('enable_contract_expiry')} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('notifPrefs.financialDue', 'Vencimentos Financeiros')}</p>
              <p className="text-xs text-muted-foreground">{t('notifPrefs.financialDueDesc', 'Alertas de faturas próximas do vencimento')}</p>
            </div>
            <Switch checked={localPrefs.enable_financial_due} onCheckedChange={() => togglePref('enable_financial_due')} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('notifPrefs.legislativeEvents', 'Eventos Legislativos')}</p>
              <p className="text-xs text-muted-foreground">{t('notifPrefs.legislativeEventsDesc', 'Novos eventos legislativos relevantes')}</p>
            </div>
            <Switch checked={localPrefs.enable_legislative_events} onCheckedChange={() => togglePref('enable_legislative_events')} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('notifPrefs.ccaNews', 'Novidades CCA')}</p>
              <p className="text-xs text-muted-foreground">{t('notifPrefs.ccaNewsDesc', 'Comunicações publicadas pela CCA')}</p>
            </div>
            <Switch checked={localPrefs.enable_cca_news} onCheckedChange={() => togglePref('enable_cca_news')} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('notifPrefs.documentChecklist', 'Documentos Expirados')}</p>
              <p className="text-xs text-muted-foreground">{t('notifPrefs.documentChecklistDesc', 'Alertas quando documentos da checklist expiram')}</p>
            </div>
            <Switch checked={localPrefs.enable_document_checklist} onCheckedChange={() => togglePref('enable_document_checklist')} />
          </div>
        </div>

        {/* Channel preferences */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">{t('notifPrefs.channels', 'Canais')}</Label>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('notifPrefs.inApp', 'Na Plataforma')}</p>
            </div>
            <Switch checked={localPrefs.channel_in_app} onCheckedChange={() => togglePref('channel_in_app')} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('notifPrefs.email', 'Email')}</p>
              <p className="text-xs text-muted-foreground">{t('notifPrefs.emailDesc', 'Em breve')}</p>
            </div>
            <Switch checked={localPrefs.channel_email} onCheckedChange={() => togglePref('channel_email')} disabled />
          </div>
        </div>

        <Button onClick={handleSave} disabled={updatePrefs.isPending}>
          {updatePrefs.isPending ? t('common.saving', 'A guardar...') : t('common.save', 'Guardar')}
        </Button>
      </CardContent>
    </Card>
  );
}
