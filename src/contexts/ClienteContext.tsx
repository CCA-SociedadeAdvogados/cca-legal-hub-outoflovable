import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

/**
 * Contexto global para o cliente em visualização.
 *
 * No novo modelo:
 * - organizationId é a chave principal do cliente aberto no frontend;
 * - nome é o nome do cliente a apresentar;
 * - jvrisId passa a funcionar como código funcional / client_code.
 */

export interface ClienteJvris {
  /** ID da organização no Supabase */
  organizationId: string;
  /** Nome do cliente */
  nome: string;
  /** Código funcional do cliente (mantido por compatibilidade com o nome antigo) */
  jvrisId: string;
  /** Código de grupo económico (ex: "ABC"), se aplicável */
  groupCode?: string | null;
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
