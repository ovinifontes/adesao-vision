import * as XLSX from 'xlsx';
import type { VendaRow, ParcelaRow, AtividadeRow, ParseResult, ValidationError } from './types';

function readFile(file: File): Promise<XLSX.WorkBook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        resolve(wb);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function getAllRows(wb: XLSX.WorkBook): Record<string, unknown>[] {
  const allRows: Record<string, unknown>[] = [];
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
    allRows.push(...json);
  }
  return allRows;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '_');
}

function normalizeRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(row => {
    const norm: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      norm[normalizeHeader(k)] = v;
    }
    return norm;
  }).filter(row => Object.values(row).some(v => v !== null && v !== '' && v !== undefined));
}

function toDate(v: unknown): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return new Date(d.y, d.m - 1, d.d);
  }
  if (typeof v === 'string') {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const clean = v.replace(/[R$\s.]/g, '').replace(',', '.');
    const n = parseFloat(clean);
    return isNaN(n) ? null : n;
  }
  return null;
}

function toBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.toLowerCase() === 'true';
  if (typeof v === 'number') return v === 1;
  return false;
}

function checkRequired(rows: Record<string, unknown>[], required: string[]): ValidationError[] {
  if (rows.length === 0) return [{ type: 'missing_column', message: 'Planilha vazia ou sem dados válidos.' }];
  const found = Object.keys(rows[0]);
  const missing = required.filter(c => !found.includes(c));
  if (missing.length > 0) {
    return [{
      type: 'missing_column',
      message: `Colunas obrigatórias faltando: ${missing.join(', ')}`,
      details: [`Colunas encontradas: ${found.join(', ')}`]
    }];
  }
  return [];
}

export async function parseVendas(file: File): Promise<ParseResult<VendaRow>> {
  const wb = await readFile(file);
  const raw = normalizeRows(getAllRows(wb));
  const required = ['data_venda', 'vendedor', 'closer', 'cliente_telefone', 'representacao', 'valor_vgv', 'percentual_comissao', 'comissao_prevista', 'etapa'];
  const errors = checkRequired(raw, required);
  if (errors.length > 0) return { data: [], errors, preview: raw.slice(0, 10), columnsFound: raw.length > 0 ? Object.keys(raw[0]) : [] };

  const data: VendaRow[] = raw.map(r => {
    let pct = toNumber(r.percentual_comissao) ?? 0;
    if (pct > 1) pct = pct / 100;
    return {
      data_venda: toDate(r.data_venda) ?? new Date(),
      vendedor: String(r.vendedor ?? ''),
      closer: String(r.closer ?? ''),
      cliente_telefone: String(r.cliente_telefone ?? ''),
      representacao: String(r.representacao ?? ''),
      valor_vgv: toNumber(r.valor_vgv) ?? 0,
      percentual_comissao: pct,
      comissao_prevista: toNumber(r.comissao_prevista) ?? 0,
      etapa: String(r.etapa ?? ''),
      pac: r.pac ? String(r.pac) : undefined,
    };
  });

  return { data, errors: [], preview: raw.slice(0, 10), columnsFound: Object.keys(raw[0]) };
}

export async function parseParcelas(file: File): Promise<ParseResult<ParcelaRow>> {
  const wb = await readFile(file);
  const raw = normalizeRows(getAllRows(wb));
  const required = ['data_repasse', 'vendedor', 'cliente_telefone', 'representacao', 'numero_parcela', 'comissao_recebida', 'pago'];
  const errors = checkRequired(raw, required);
  if (errors.length > 0) return { data: [], errors, preview: raw.slice(0, 10), columnsFound: raw.length > 0 ? Object.keys(raw[0]) : [] };

  const data: ParcelaRow[] = raw.map(r => ({
    data_repasse: toDate(r.data_repasse) ?? new Date(),
    vendedor: String(r.vendedor ?? ''),
    cliente_telefone: String(r.cliente_telefone ?? ''),
    representacao: String(r.representacao ?? ''),
    numero_parcela: toNumber(r.numero_parcela) ?? 0,
    comissao_recebida: toNumber(r.comissao_recebida) ?? 0,
    pago: toBool(r.pago),
  }));

  return { data, errors: [], preview: raw.slice(0, 10), columnsFound: Object.keys(raw[0]) };
}

export async function parseAtividade(file: File): Promise<ParseResult<AtividadeRow>> {
  const wb = await readFile(file);
  const raw = normalizeRows(getAllRows(wb));
  const required = ['periodo_inicio', 'periodo_fim', 'vendedor', 'anuncios', 'ligacoes', 'agendamentos', 'visitas'];
  const errors = checkRequired(raw, required);
  if (errors.length > 0) return { data: [], errors, preview: raw.slice(0, 10), columnsFound: raw.length > 0 ? Object.keys(raw[0]) : [] };

  const data: AtividadeRow[] = raw.map(r => ({
    periodo_inicio: toDate(r.periodo_inicio) ?? new Date(),
    periodo_fim: toDate(r.periodo_fim) ?? new Date(),
    vendedor: String(r.vendedor ?? ''),
    anuncios: toNumber(r.anuncios) ?? 0,
    ligacoes: toNumber(r.ligacoes) ?? 0,
    agendamentos: toNumber(r.agendamentos) ?? 0,
    visitas: toNumber(r.visitas) ?? 0,
  }));

  return { data, errors: [], preview: raw.slice(0, 10), columnsFound: Object.keys(raw[0]) };
}

export function formatCurrency(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatPercent(v: number): string {
  return (v * 100).toFixed(1) + '%';
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('pt-BR');
}

export function getYearMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
