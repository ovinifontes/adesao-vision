import React, { useState, useMemo } from 'react';
import AppHeader from '@/components/AppHeader';
import FileUpload from '@/components/FileUpload';
import KPICard from '@/components/KPICard';
import DashboardFilters from '@/components/DashboardFilters';
import { parseVendas, parseParcelas, parseAtividade, formatCurrency, getYearMonth } from '@/lib/parseUtils';
import type { VendaRow, ParcelaRow, AtividadeRow, ValidationError } from '@/lib/types';
import { DollarSign, TrendingUp, TrendingDown, Zap, Target, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const VisaoGeralPage: React.FC = () => {
  const [vendas, setVendas] = useState<VendaRow[]>([]);
  const [parcelas, setParcelas] = useState<ParcelaRow[]>([]);
  const [atividade, setAtividade] = useState<AtividadeRow[]>([]);

  const [vendasFile, setVendasFile] = useState<File | null>(null);
  const [parcelasFile, setParcelasFile] = useState<File | null>(null);
  const [atividadeFile, setAtividadeFile] = useState<File | null>(null);

  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleGenerate = async () => {
    const errs: string[] = [];
    if (!vendasFile) errs.push('Planilha de Vendas não enviada.');
    if (!parcelasFile) errs.push('Planilha de Parcelas não enviada.');
    if (!atividadeFile) errs.push('Planilha de Atividade não enviada.');
    if (errs.length > 0) { setErrors(errs); return; }

    setLoading(true);
    setErrors([]);
    try {
      const [vRes, pRes, aRes] = await Promise.all([
        parseVendas(vendasFile!),
        parseParcelas(parcelasFile!),
        parseAtividade(atividadeFile!),
      ]);

      const allErrors: string[] = [];
      if (vRes.errors.length) allErrors.push(`Vendas: ${vRes.errors.map(e => e.message).join('; ')}`);
      if (pRes.errors.length) allErrors.push(`Parcelas: ${pRes.errors.map(e => e.message).join('; ')}`);
      if (aRes.errors.length) allErrors.push(`Atividade: ${aRes.errors.map(e => e.message).join('; ')}`);

      if (allErrors.length > 0) {
        setErrors(allErrors);
        setLoading(false);
        return;
      }

      setVendas(vRes.data);
      setParcelas(pRes.data);
      setAtividade(aRes.data);
      setGenerated(true);
    } catch {
      setErrors(['Erro ao processar arquivos.']);
    }
    setLoading(false);
  };

  // Filtered data
  const fVendas = useMemo(() => {
    let d = vendas;
    if (filters.vendedor && filters.vendedor !== 'all') d = d.filter(r => r.vendedor === filters.vendedor);
    if (filters.representacao && filters.representacao !== 'all') d = d.filter(r => r.representacao === filters.representacao);
    if (dateFrom) d = d.filter(r => r.data_venda >= new Date(dateFrom));
    if (dateTo) d = d.filter(r => r.data_venda <= new Date(dateTo + 'T23:59:59'));
    return d;
  }, [vendas, filters, dateFrom, dateTo]);

  const fParcelas = useMemo(() => {
    let d = parcelas;
    if (filters.vendedor && filters.vendedor !== 'all') d = d.filter(r => r.vendedor === filters.vendedor);
    if (filters.representacao && filters.representacao !== 'all') d = d.filter(r => r.representacao === filters.representacao);
    if (dateFrom) d = d.filter(r => r.data_repasse >= new Date(dateFrom));
    if (dateTo) d = d.filter(r => r.data_repasse <= new Date(dateTo + 'T23:59:59'));
    return d;
  }, [parcelas, filters, dateFrom, dateTo]);

  const fAtividade = useMemo(() => {
    let d = atividade;
    if (filters.vendedor && filters.vendedor !== 'all') d = d.filter(r => r.vendedor === filters.vendedor);
    if (dateFrom) d = d.filter(r => r.periodo_inicio >= new Date(dateFrom));
    if (dateTo) d = d.filter(r => r.periodo_inicio <= new Date(dateTo + 'T23:59:59'));
    return d;
  }, [atividade, filters, dateFrom, dateTo]);

  const allVendedores = useMemo(() => {
    const s = new Set([...vendas.map(r => r.vendedor), ...parcelas.map(r => r.vendedor), ...atividade.map(r => r.vendedor)]);
    return [...s].sort();
  }, [vendas, parcelas, atividade]);

  const allReps = useMemo(() => {
    const s = new Set([...vendas.map(r => r.representacao), ...parcelas.map(r => r.representacao)]);
    return [...s].sort();
  }, [vendas, parcelas]);

  // KPIs
  const kpis = useMemo(() => {
    const vgv = fVendas.reduce((a, r) => a + r.valor_vgv, 0);
    const comPrev = fVendas.reduce((a, r) => a + r.comissao_prevista, 0);
    const comReceb = fParcelas.filter(r => r.pago).reduce((a, r) => a + r.comissao_recebida, 0);
    const gap = comPrev - comReceb;
    const ligTotal = fAtividade.reduce((a, r) => a + r.ligacoes, 0);
    const visitTotal = fAtividade.reduce((a, r) => a + r.visitas, 0);
    const efVGVLig = ligTotal > 0 ? vgv / ligTotal : 0;
    const efComVisit = visitTotal > 0 ? comReceb / visitTotal : 0;
    return { vgv, comPrev, comReceb, gap, efVGVLig, efComVisit };
  }, [fVendas, fParcelas, fAtividade]);

  // Chart: VGV vs Comissão Recebida por mês
  const chartMensal = useMemo(() => {
    const map = new Map<string, { vgv: number; comReceb: number }>();
    fVendas.forEach(r => {
      const ym = getYearMonth(r.data_venda);
      const prev = map.get(ym) || { vgv: 0, comReceb: 0 };
      map.set(ym, { ...prev, vgv: prev.vgv + r.valor_vgv });
    });
    fParcelas.filter(r => r.pago).forEach(r => {
      const ym = getYearMonth(r.data_repasse);
      const prev = map.get(ym) || { vgv: 0, comReceb: 0 };
      map.set(ym, { ...prev, comReceb: prev.comReceb + r.comissao_recebida });
    });
    return Array.from(map, ([name, v]) => ({ name, ...v })).sort((a, b) => a.name.localeCompare(b.name));
  }, [fVendas, fParcelas]);

  // Resumo por vendedor
  const resumoVendedor = useMemo(() => {
    const map = new Map<string, { vgv: number; comPrev: number; comReceb: number; lig: number; visit: number }>();
    const get = (v: string) => map.get(v) || { vgv: 0, comPrev: 0, comReceb: 0, lig: 0, visit: 0 };

    fVendas.forEach(r => {
      const p = get(r.vendedor);
      map.set(r.vendedor, { ...p, vgv: p.vgv + r.valor_vgv, comPrev: p.comPrev + r.comissao_prevista });
    });
    fParcelas.filter(r => r.pago).forEach(r => {
      const p = get(r.vendedor);
      map.set(r.vendedor, { ...p, comReceb: p.comReceb + r.comissao_recebida });
    });
    fAtividade.forEach(r => {
      const p = get(r.vendedor);
      map.set(r.vendedor, { ...p, lig: p.lig + r.ligacoes, visit: p.visit + r.visitas });
    });

    return Array.from(map, ([vendedor, v]) => ({
      vendedor,
      ...v,
      vgvLig: v.lig > 0 ? v.vgv / v.lig : 0,
      comVisit: v.visit > 0 ? v.comReceb / v.visit : 0,
    })).sort((a, b) => b.vgv - a.vgv);
  }, [fVendas, fParcelas, fAtividade]);

  // Resumo por representação
  const resumoRep = useMemo(() => {
    const map = new Map<string, { vgv: number; comPrev: number; comReceb: number }>();
    const get = (v: string) => map.get(v) || { vgv: 0, comPrev: 0, comReceb: 0 };

    fVendas.forEach(r => {
      const p = get(r.representacao);
      map.set(r.representacao, { ...p, vgv: p.vgv + r.valor_vgv, comPrev: p.comPrev + r.comissao_prevista });
    });
    fParcelas.filter(r => r.pago).forEach(r => {
      const p = get(r.representacao);
      map.set(r.representacao, { ...p, comReceb: p.comReceb + r.comissao_recebida });
    });

    return Array.from(map, ([representacao, v]) => ({ representacao, ...v })).sort((a, b) => b.vgv - a.vgv);
  }, [fVendas, fParcelas]);

  const chartVGVVendedor = useMemo(() =>
    resumoVendedor.map(r => ({ name: r.vendedor, value: r.vgv }))
  , [resumoVendedor]);

  const chartComVendedor = useMemo(() =>
    resumoVendedor.map(r => ({ name: r.vendedor, value: r.comReceb }))
  , [resumoVendedor]);

  const chartEficiencia = useMemo(() =>
    resumoVendedor.map(r => ({ name: r.vendedor, vgvLig: r.vgvLig, comVisit: r.comVisit }))
  , [resumoVendedor]);

  const expectedV = ['data_venda', 'vendedor', 'closer', 'cliente_telefone', 'representacao', 'valor_vgv', 'percentual_comissao', 'comissao_prevista', 'etapa'];
  const expectedP = ['data_repasse', 'vendedor', 'cliente_telefone', 'representacao', 'numero_parcela', 'comissao_recebida', 'pago'];
  const expectedA = ['periodo_inicio', 'periodo_fim', 'vendedor', 'anuncios', 'ligacoes', 'agendamentos', 'visitas'];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 space-y-6">
        <h1 className="text-2xl font-display font-bold">Visão Geral</h1>

        {!generated && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <FileUpload label="Vendas" expectedColumns={expectedV} onFileSelected={(f) => setVendasFile(f)} success={!!vendasFile} />
              <FileUpload label="Parcelas" expectedColumns={expectedP} onFileSelected={(f) => setParcelasFile(f)} success={!!parcelasFile} />
              <FileUpload label="Atividade" expectedColumns={expectedA} onFileSelected={(f) => setAtividadeFile(f)} success={!!atividadeFile} />
            </div>

            {errors.length > 0 && (
              <div className="rounded-md bg-destructive/10 p-4 space-y-1">
                {errors.map((e, i) => <p key={i} className="text-sm text-destructive">{e}</p>)}
              </div>
            )}

            <Button onClick={handleGenerate} disabled={loading} size="lg" className="w-full md:w-auto">
              {loading ? 'Processando...' : 'Gerar Dashboard'}
            </Button>
          </div>
        )}

        {generated && (
          <div className="space-y-6 animate-fade-in">
            <DashboardFilters
              filters={[
                { key: 'vendedor', label: 'Vendedor', options: allVendedores },
                { key: 'representacao', label: 'Representação', options: allReps },
              ]}
              values={filters}
              onChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
              dateFrom={dateFrom} dateTo={dateTo}
              onDateFromChange={setDateFrom} onDateToChange={setDateTo}
              onClear={() => { setFilters({}); setDateFrom(''); setDateTo(''); }}
            />

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <KPICard title="VGV Total" value={formatCurrency(kpis.vgv)} icon={DollarSign} />
              <KPICard title="Comissão Prevista" value={formatCurrency(kpis.comPrev)} icon={TrendingUp} />
              <KPICard title="Comissão Recebida" value={formatCurrency(kpis.comReceb)} icon={DollarSign} />
              <KPICard title="GAP" value={formatCurrency(kpis.gap)} icon={TrendingDown} />
              <KPICard title="VGV / Ligação" value={formatCurrency(kpis.efVGVLig)} icon={Zap} />
              <KPICard title="Comissão / Visita" value={formatCurrency(kpis.efComVisit)} icon={Target} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="md:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-sm">VGV vs Comissão Recebida (mensal)</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartMensal}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} fontSize={11} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                      <Line type="monotone" dataKey="vgv" stroke="#03c355" strokeWidth={2} name="VGV" dot={{ fill: '#03c355' }} />
                      <Line type="monotone" dataKey="comReceb" stroke="#0c6c34" strokeWidth={2} name="Comissão Recebida" dot={{ fill: '#0c6c34' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">VGV por Vendedor</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartVGVVendedor} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} fontSize={11} />
                      <YAxis type="category" dataKey="name" fontSize={11} width={75} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="value" fill="#03c355" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Comissão Recebida por Vendedor</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartComVendedor} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} fontSize={11} />
                      <YAxis type="category" dataKey="name" fontSize={11} width={75} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="value" fill="#0c6c34" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Eficiência por Vendedor</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartEficiencia} margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} fontSize={11} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                      <Bar dataKey="vgvLig" fill="#03c355" name="VGV/Ligação" />
                      <Bar dataKey="comVisit" fill="#0c6c34" name="Comissão/Visita" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Resumo por Vendedor</CardTitle></CardHeader>
              <CardContent className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Vendedor</TableHead>
                      <TableHead className="text-xs text-right">VGV</TableHead>
                      <TableHead className="text-xs text-right">Com. Prevista</TableHead>
                      <TableHead className="text-xs text-right">Com. Recebida</TableHead>
                      <TableHead className="text-xs text-right">Ligações</TableHead>
                      <TableHead className="text-xs text-right">Visitas</TableHead>
                      <TableHead className="text-xs text-right">VGV/Lig</TableHead>
                      <TableHead className="text-xs text-right">Com/Visita</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumoVendedor.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-medium">{r.vendedor}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(r.vgv)}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(r.comPrev)}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(r.comReceb)}</TableCell>
                        <TableCell className="text-xs text-right">{r.lig}</TableCell>
                        <TableCell className="text-xs text-right">{r.visit}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(r.vgvLig)}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(r.comVisit)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Resumo por Representação</CardTitle></CardHeader>
              <CardContent className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Representação</TableHead>
                      <TableHead className="text-xs text-right">VGV</TableHead>
                      <TableHead className="text-xs text-right">Com. Prevista</TableHead>
                      <TableHead className="text-xs text-right">Com. Recebida</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumoRep.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-medium">{r.representacao}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(r.vgv)}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(r.comPrev)}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(r.comReceb)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default VisaoGeralPage;
