import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { WidgetConfig } from '@/lib/defaultHomeLayout';
import { ImageUploader } from '@/components/shared/ImageUploader';
import { useUpdateOrganization } from '@/hooks/useUpdateOrganization';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useContentBlocks } from '@/hooks/useContentBlocks';

interface WidgetConfigEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widget: WidgetConfig;
  organizationId: string | null;
  onSave: (updates: Partial<WidgetConfig>) => void;
}

export function WidgetConfigEditor({
  open,
  onOpenChange,
  widget,
  organizationId,
  onSave,
}: WidgetConfigEditorProps) {
  const [title, setTitle] = useState(widget.title);
  const [config, setConfig] = useState(widget.config);

  // Organization data
  const { organizations } = useOrganizations();
  const organization = organizations?.find(org => org.id === organizationId);
  
  // Update organization hook
  const { 
    updateLawyer, 
    updateOrganization, 
    uploadLawyerPhoto, 
    uploadLogo,
    isUpdatingLawyer,
    isUpdatingOrganization 
  } = useUpdateOrganization(organizationId);

  // Content blocks for welcome message
  const { getBlock, upsertBlock, isUpserting } = useContentBlocks(organizationId || '');
  const welcomeBlock = getBlock('welcome_message');

  // Local state for content editing
  const [lawyerName, setLawyerName] = useState('');
  const [lawyerPhotoUrl, setLawyerPhotoUrl] = useState('');
  const [orgLogoUrl, setOrgLogoUrl] = useState('');
  const [welcomeTitle, setWelcomeTitle] = useState('');
  const [welcomeContent, setWelcomeContent] = useState('');

  // Sync organization data when it changes
  useEffect(() => {
    if (organization) {
      setLawyerName(organization.lawyer_name || '');
      setLawyerPhotoUrl(organization.lawyer_photo_url || '');
      setOrgLogoUrl(organization.logo_url || '');
    }
  }, [organization]);

  // Sync welcome block data
  useEffect(() => {
    if (welcomeBlock) {
      setWelcomeTitle(welcomeBlock.title || '');
      setWelcomeContent(welcomeBlock.content || '');
    }
  }, [welcomeBlock]);

  // Reset widget config state when widget changes
  useEffect(() => {
    setTitle(widget.title);
    setConfig(widget.config);
  }, [widget]);

  const handleSave = () => {
    onSave({ title, config });
    onOpenChange(false);
  };

  const handleSaveLawyer = () => {
    updateLawyer({
      lawyerName: lawyerName || undefined,
      lawyerPhotoUrl: lawyerPhotoUrl || undefined,
    });
  };

  const handleSaveOrganization = () => {
    updateOrganization({
      logoUrl: orgLogoUrl || undefined,
    });
  };

  const handleSaveWelcome = () => {
    upsertBlock({
      content_key: 'welcome_message',
      title: welcomeTitle,
      content: welcomeContent,
      content_type: 'text',
    });
  };

  const updateConfig = (key: string, value: unknown) => {
    setConfig({ ...config, [key]: value });
  };

  const isContentWidget = ['LAWYER_CARD', 'ORGANIZATION_CARD', 'WELCOME_MESSAGE'].includes(widget.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Widget</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Common: Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título do Widget</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do widget"
            />
          </div>

          {/* LAWYER_CARD content editing */}
          {widget.type === 'LAWYER_CARD' && organizationId && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Dados do Advogado</h4>
                
                <ImageUploader
                  currentImageUrl={lawyerPhotoUrl}
                  onUpload={uploadLawyerPhoto}
                  onUrlChange={setLawyerPhotoUrl}
                  placeholder="Carregar Foto"
                  shape="circle"
                  size="lg"
                />

                <div className="space-y-2">
                  <Label htmlFor="lawyerName">Nome do Advogado</Label>
                  <Input
                    id="lawyerName"
                    value={lawyerName}
                    onChange={(e) => setLawyerName(e.target.value)}
                    placeholder="Dr. Nome Completo"
                  />
                </div>

                <Button 
                  onClick={handleSaveLawyer} 
                  disabled={isUpdatingLawyer}
                  variant="secondary"
                  className="w-full"
                >
                  {isUpdatingLawyer ? 'A guardar...' : 'Guardar Dados do Advogado'}
                </Button>
              </div>
            </>
          )}

          {/* ORGANIZATION_CARD content editing */}
          {widget.type === 'ORGANIZATION_CARD' && organizationId && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Dados da Organização</h4>
                
                <ImageUploader
                  currentImageUrl={orgLogoUrl}
                  onUpload={uploadLogo}
                  onUrlChange={setOrgLogoUrl}
                  placeholder="Carregar Logo"
                  shape="square"
                  size="lg"
                />

                <Button 
                  onClick={handleSaveOrganization} 
                  disabled={isUpdatingOrganization}
                  variant="secondary"
                  className="w-full"
                >
                  {isUpdatingOrganization ? 'A guardar...' : 'Guardar Logo'}
                </Button>
              </div>

              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Opções de Exibição</h4>
                <div className="flex items-center justify-between">
                  <Label htmlFor="showLogo">Mostrar logo</Label>
                  <Switch
                    id="showLogo"
                    checked={config.showLogo !== false}
                    onCheckedChange={(checked) => updateConfig('showLogo', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="showLawyer">Mostrar advogado</Label>
                  <Switch
                    id="showLawyer"
                    checked={config.showLawyer !== false}
                    onCheckedChange={(checked) => updateConfig('showLawyer', checked)}
                  />
                </div>
              </div>
            </>
          )}

          {/* WELCOME_MESSAGE content editing */}
          {widget.type === 'WELCOME_MESSAGE' && organizationId && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Mensagem de Boas-Vindas</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="welcomeTitle">Título da Mensagem</Label>
                  <Input
                    id="welcomeTitle"
                    value={welcomeTitle}
                    onChange={(e) => setWelcomeTitle(e.target.value)}
                    placeholder="Bem-vindo!"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="welcomeContent">Conteúdo</Label>
                  <Textarea
                    id="welcomeContent"
                    value={welcomeContent}
                    onChange={(e) => setWelcomeContent(e.target.value)}
                    placeholder="Esta é a sua área de gestão jurídica..."
                    rows={4}
                  />
                </div>

                <Button 
                  onClick={handleSaveWelcome} 
                  disabled={isUpserting}
                  variant="secondary"
                  className="w-full"
                >
                  {isUpserting ? 'A guardar...' : 'Guardar Mensagem'}
                </Button>
              </div>
            </>
          )}

          {/* Type-specific display configs */}
          {(widget.type === 'CCA_NEWS' || 
            widget.type === 'RECENT_CONTRACTS' || 
            widget.type === 'RECENT_DOCUMENTS') && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Opções de Exibição</h4>
                <div className="space-y-2">
                  <Label htmlFor="limit">Número de itens</Label>
                  <Input
                    id="limit"
                    type="number"
                    min={1}
                    max={20}
                    value={(config.limit as number) || 5}
                    onChange={(e) => updateConfig('limit', parseInt(e.target.value) || 5)}
                  />
                </div>
              </div>
            </>
          )}

          {(widget.type === 'CCA_NEWS' || widget.type === 'RECENT_DOCUMENTS') && (
            <div className="flex items-center justify-between">
              <Label htmlFor="showDate">Mostrar data</Label>
              <Switch
                id="showDate"
                checked={config.showDate !== false}
                onCheckedChange={(checked) => updateConfig('showDate', checked)}
              />
            </div>
          )}

          {widget.type === 'RECENT_CONTRACTS' && (
            <div className="flex items-center justify-between">
              <Label htmlFor="showStatus">Mostrar estado</Label>
              <Switch
                id="showStatus"
                checked={config.showStatus !== false}
                onCheckedChange={(checked) => updateConfig('showStatus', checked)}
              />
            </div>
          )}

          {widget.type === 'EXPIRING_CONTRACTS' && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Opções de Exibição</h4>
                <div className="space-y-2">
                  <Label htmlFor="daysAhead">Dias de antecedência</Label>
                  <Input
                    id="daysAhead"
                    type="number"
                    min={7}
                    max={365}
                    value={(config.daysAhead as number) || 30}
                    onChange={(e) => updateConfig('daysAhead', parseInt(e.target.value) || 30)}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar Configuração</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
