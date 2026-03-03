export interface VendaRow {
  data_venda: Date;
  vendedor: string;
  closer: string;
  cliente_telefone: string;
  representacao: string;
  valor_vgv: number;
  percentual_comissao: number;
  comissao_prevista: number;
  etapa: string;
  pac?: string;
}

export interface ParcelaRow {
  data_repasse: Date;
  vendedor: string;
  cliente_telefone: string;
  representacao: string;
  numero_parcela: number;
  comissao_recebida: number;
  pago: boolean;
}

export interface AtividadeRow {
  periodo_inicio: Date;
  periodo_fim: Date;
  vendedor: string;
  anuncios: number;
  ligacoes: number;
  agendamentos: number;
  visitas: number;
}

export interface ValidationError {
  type: 'missing_column' | 'invalid_data';
  message: string;
  details?: string[];
}

export interface ParseResult<T> {
  data: T[];
  errors: ValidationError[];
  preview: Record<string, unknown>[];
  columnsFound: string[];
}
