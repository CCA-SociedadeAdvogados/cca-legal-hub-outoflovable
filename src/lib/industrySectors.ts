// Industry sectors constant for organization classification
// Used for personalized dashboards per sector

export const INDUSTRY_SECTORS = [
  { value: "agricultura_pecuaria_pescas", label: "Agricultura, Pecuária & Pescas" },
  { value: "ambiente_energia_residuos", label: "Ambiente, Energia & Resíduos" },
  { value: "ciencia_educacao", label: "Ciência & Educação" },
  { value: "comunicacoes", label: "Comunicações" },
  { value: "cultura", label: "Cultura" },
  { value: "desporto", label: "Desporto" },
  { value: "economia", label: "Economia" },
  { value: "entretenimento", label: "Entretenimento" },
  { value: "fornecedores", label: "Fornecedores" },
  { value: "imobiliario", label: "Imobiliário" },
  { value: "industria", label: "Indústria" },
  { value: "legal", label: "Legal" },
  { value: "media_publicidade", label: "Media & Publicidade" },
  { value: "outros_servicos", label: "Outros Serviços" },
  { value: "restauracao", label: "Restauração" },
  { value: "retalho_distribuicao_logistica", label: "Retalho, Distribuição & Logística" },
  { value: "saude_farmaceutica", label: "Saúde & Farmacêutica" },
  { value: "seguros_resseguros", label: "Seguros & Resseguros" },
  { value: "servicos_financeiros", label: "Serviços Financeiros" },
  { value: "setor_publico", label: "Setor Público" },
  { value: "social", label: "Social" },
  { value: "tecnologias_informacao", label: "Tecnologias de Informação" },
  { value: "transportes_mobilidade", label: "Transportes & Mobilidade" },
  { value: "turismo", label: "Turismo" },
] as const;

export type IndustrySectorValue = typeof INDUSTRY_SECTORS[number]["value"];

export function getSectorLabel(value: string): string {
  const sector = INDUSTRY_SECTORS.find(s => s.value === value);
  return sector?.label ?? value;
}

export function getSectorLabels(values: string[]): string[] {
  return values.map(getSectorLabel);
}
