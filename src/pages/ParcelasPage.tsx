import React, { useState, useMemo } from 'react';
import AppHeader from '@/components/AppHeader';
import FileUpload from '@/components/FileUpload';
import DataPreview from '@/components/DataPreview';
import KPICard from '@/components/KPICard';
import DashboardFilters from '@/components/DashboardFilters';
import { parseParcelas, formatCurrency, formatDate, getYearMonth } from '@/lib/parseUtils';
import type { ParcelaRow, ValidationError } from '@/lib/types';
import { DollarSign, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const ParcelasPage: React.FC = () => {
  const [data, setData] = useState<ParcelaRow[]>([]);
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const handleFile = async (file: File) => {
    setLoading(true);
    setErrors([]);
    try {
      const result = await parseParcelas(file);
      if (result.errors.length > 0) {
        setErrors(result.errors);
        setPreview(result.preview);
        setData([]);
      } else {
        setData(result.data);
        setPreview(result.preview);
        setUploaded(true);
      }
    } catch {
      setErrors([{ type: 'invalid_data', message: 'Erro ao processar o arquivo.' }]);
    }
    setLoading(false);
  };

  const filteredData = useMemo(() => {
    let d = data;
    if (filters.vendedor && filters.vendedor !== 'all') d = d.filter(r => r.vendedor === filters.vendedor);
    if (filters.representacao && filters.representacao !== 'all') d = d.filter(r => r.representacao === filters.representacao);
    if (filters.pago && filters.pago !== 'all') d = d.filter(r => (filters.pago === 'true') === r.pago);
    if (dateFrom) d = d.filter(r => r.data_repasse >= new Date(dateFrom));
    if (dateTo) d = d.filter(r => r.data_repasse <= new Date(dateTo + 'T23:59:59'));
    if (search) {
      const s = search.toLowerCase();
      d = d.filter(r => r.vendedor.toLowerCase().includes(s) || r.cliente_telefone.includes(s));
    }
    return d;
  }, [data, filters, dateFrom, dateTo, search]);

  const vendedores = useMemo(() => [...new Set(data.map(r => r.vendedor))].sort(), [data]);
  const representacoes = useMemo(() => [...new Set(data.map(r => r.representacao))].sort(), [data]);

  const kpis = useMemo(() => {
    const pagas = filteredData.filter(r => r.pago);
    const abertas = filteredData.filter(r => !r.pago);
    const recebida = pagas.reduce((a, r) => a + r.comissao_recebida, 0);
    const media = pagas.length > 0 ? recebida / pagas.length : 0;
    return { recebida, qtdPagas: pagas.length, qtdAbertas: abertas.length, media };
  }, [filteredData]);

  const chartMensal = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.filter(r => r.pago).forEach(r => {
      const ym = getYearMonth(r.data_repasse);
      map.set(ym, (map.get(ym) || 0) + r.comissao_recebida);
    });
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredData]);

  const chartVendedor = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.filter(r => r.pago).forEach(r => map.set(r.vendedor, (map.get(r.vendedor) || 0) + r.comissao_recebida));
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const chartRep = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.filter(r => r.pago).forEach(r => map.set(r.representacao, (map.get(r.representacao) || 0) + r.comissao_recebida));
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const expected = ['data_repasse', 'vendedor', 'cliente_telefone', 'representacao', 'numero_parcela', 'comissao_recebida', 'pago'];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 space-y-6">
        <h1 className="text-2xl font-display font-bold">Parcelas</h1>

        {!uploaded && (
          <>
            <FileUpload label="Planilha de Parcelas" expectedColumns={expected} onFileSelected={handleFile} isLoading={loading} error={errors.length > 0 ? errors.map(e => e.message).join('; ') : null} success={uploaded} />
            {preview.length > 0 && <DataPreview data={preview} />}
          </>
        )}

        {uploaded && (
          <div className="space-y-6 animate-fade-in">
            <DashboardFilters
              filters={[
                { key: 'vendedor', label: 'Vendedor', options: vendedores },
                { key: 'representacao', label: 'Representação', options: representacoes },
                { key: 'pago', label: 'Pago', options: ['true', 'false'] },
              ]}
              values={filters}
              onChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
              dateFrom={dateFrom} dateTo={dateTo}
              onDateFromChange={setDateFrom} onDateToChange={setDateTo}
              onClear={() => { setFilters({}); setDateFrom(''); setDateTo(''); setSearch(''); }}
              searchValue={search} onSearchChange={setSearch}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard title="Comissão Recebida" value={formatCurrency(kpis.recebida)} icon={DollarSign} />
              <KPICard title="Parcelas Pagas" value={String(kpis.qtdPagas)} icon={CheckCircle} />
              <KPICard title="Parcelas em Aberto" value={String(kpis.qtdAbertas)} icon={XCircle} />
              <KPICard title="Média por Parcela" value={formatCurrency(kpis.media)} icon={TrendingUp} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Comissão Recebida por Mês</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartMensal}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} fontSize={11} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Line type="monotone" dataKey="value" stroke="#03c355" strokeWidth={2} dot={{ fill: '#03c355' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Comissão por Vendedor</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartVendedor} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} fontSize={11} />
                      <YAxis type="category" dataKey="name" fontSize={11} width={75} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="value" fill="#03c355" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Comissão por Representação</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartRep} layout="vertical" margin={{ left: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} fontSize={11} />
                      <YAxis type="category" dataKey="name" fontSize={11} width={95} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="value" fill="#0c6c34" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Detalhamento</CardTitle></CardHeader>
              <CardContent className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Data Repasse</TableHead>
                      <TableHead className="text-xs">Vendedor</TableHead>
                      <TableHead className="text-xs">Telefone</TableHead>
                      <TableHead className="text-xs">Representação</TableHead>
                      <TableHead className="text-xs text-right">Parcela</TableHead>
                      <TableHead className="text-xs text-right">Comissão</TableHead>
                      <TableHead className="text-xs">Pago</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{formatDate(r.data_repasse)}</TableCell>
                        <TableCell className="text-xs">{r.vendedor}</TableCell>
                        <TableCell className="text-xs">{r.cliente_telefone}</TableCell>
                        <TableCell className="text-xs">{r.representacao}</TableCell>
                        <TableCell className="text-xs text-right">{r.numero_parcela}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(r.comissao_recebida)}</TableCell>
                        <TableCell className="text-xs">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${r.pago ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                            {r.pago ? 'Sim' : 'Não'}
                          </span>
                        </TableCell>
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

export default ParcelasPage;
