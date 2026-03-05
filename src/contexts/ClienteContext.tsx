import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Contexto global para o cliente selecionado via ID Jvris.
 *
 * Guarda o cliente escolhido no seletor Jvris (módulo Financeiro),
 * permitindo que outros componentes (SharePoint, faturas) acedam
 * aos dados do cliente selecionado.
 */

export interface ClienteJvris {
  /** ID da organização no Supabase */
  organizationId: string;
  /** Nome da organização */
  nome: string;
  /** ID do cliente no sistema Jvris */
  jvrisId: string;
}

interface ClienteContextType {
  /** Cliente atualmente selecionado */
  cliente: ClienteJvris | null;
  /** Selecionar um cliente */
  setCliente: (cliente: ClienteJvris | null) => void;
  /** Limpar a seleção */
  clearCliente: () => void;
}

const ClienteContext = createContext<ClienteContextType | undefined>(undefined);

export const ClienteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cliente, setClienteState] = useState<ClienteJvris | null>(null);

  const setCliente = useCallback((c: ClienteJvris | null) => {
    setClienteState(c);
  }, []);

  const clearCliente = useCallback(() => {
    setClienteState(null);
  }, []);

  return (
    <ClienteContext.Provider value={{ cliente, setCliente, clearCliente }}>
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
