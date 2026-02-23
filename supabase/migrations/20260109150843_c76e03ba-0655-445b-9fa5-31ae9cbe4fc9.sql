-- Function to create contract expiry notifications
CREATE OR REPLACE FUNCTION public.create_contract_expiry_notifications()
RETURNS void AS $$
DECLARE
  contract RECORD;
  days_to_expiry INTEGER;
  notification_type TEXT;
  existing_notification BOOLEAN;
BEGIN
  FOR contract IN
    SELECT 
      c.id,
      c.titulo_contrato,
      c.data_termo,
      c.responsavel_interno_id,
      c.organization_id
    FROM public.contratos c
    WHERE c.estado_contrato = 'activo'
      AND c.arquivado IS NOT TRUE
      AND c.data_termo IS NOT NULL
      AND c.data_termo >= CURRENT_DATE
      AND c.data_termo <= CURRENT_DATE + INTERVAL '90 days'
      AND c.responsavel_interno_id IS NOT NULL
  LOOP
    days_to_expiry := contract.data_termo - CURRENT_DATE;
    
    -- Determine notification type based on days remaining
    IF days_to_expiry <= 30 THEN
      notification_type := 'contract_expiry_30';
    ELSIF days_to_expiry <= 60 THEN
      notification_type := 'contract_expiry_60';
    ELSE
      notification_type := 'contract_expiry_90';
    END IF;
    
    -- Check if notification already exists for this contract/type
    SELECT EXISTS(
      SELECT 1 FROM public.notifications 
      WHERE reference_id = contract.id 
        AND type = notification_type
    ) INTO existing_notification;
    
    -- Create notification if it doesn't exist
    IF NOT existing_notification THEN
      INSERT INTO public.notifications (
        user_id, organization_id, type, title, message, 
        reference_type, reference_id, metadata
      ) VALUES (
        contract.responsavel_interno_id,
        contract.organization_id,
        notification_type,
        CASE 
          WHEN days_to_expiry <= 30 THEN 'Contrato expira em ' || days_to_expiry || ' dias'
          WHEN days_to_expiry <= 60 THEN 'Contrato expira em ' || days_to_expiry || ' dias'
          ELSE 'Contrato expira em ' || days_to_expiry || ' dias'
        END,
        contract.titulo_contrato,
        'contratos',
        contract.id,
        jsonb_build_object('days_to_expiry', days_to_expiry, 'data_termo', contract.data_termo)
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;