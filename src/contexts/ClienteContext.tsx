import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

/**
 * Contexto global para o cliente em visualização.
 *
 * Mantém compatibilidade com o modelo anterior baseado em Jvris,
 * mas passa a tratar o organizationId como chave principal do
 * cliente actualmente aberto no frontend.
 */

export interface ClienteJvris {
  /** ID da organização no Supabase */
  organizationId: string;
  /** Nome da organização */
  nome: string;
  /** Código funcional / Jvris */
  jvrisId: string;
}

interface ClienteContextType {
  /** Cliente actualmente seleccionado */
  cliente: ClienteJvris | null;
  /** Seleccionar cliente */
  setCliente: (cliente: ClienteJvris | null) => void;
  /** Limpar selecção */
  clearCliente: () => void;
  /** Alias explícito para organização em visualização */
  viewingOrganizationId: string | null;
}

const ClienteContext = createContext<ClienteContextType | undefined>(undefined);

const STORAGE_KEY = 'cca_viewing_client';

export const ClienteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cliente, setClienteState] = useState<ClienteJvris | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as ClienteJvris;
      if (!parsed?.organizationId) return;

      setClienteState(parsed);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const setCliente = useCallback((c: ClienteJvris | null) => {
    setClienteState(c);

    if (c) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearCliente = useCallback(() => {
    setClienteState(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ClienteContext.Provider
      value={{
        cliente,
        setCliente,
        clearCliente,
        viewingOrganizationId: cliente?.organizationId ?? null,
      }}
    >
      {children}
    </ClienteContext.Provider>
  );
};

export const useCliente = () => {
  const context = useContext(ClienteContext);
  if (context === undefined) {
    throw new Error('useCliente must be used within a ClienteProvider');
  }
  return context;
};
