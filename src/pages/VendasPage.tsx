import React, { useState, useMemo } from 'react';
import AppHeader from '@/components/AppHeader';
import FileUpload from '@/components/FileUpload';
import DataPreview from '@/components/DataPreview';
import KPICard from '@/components/KPICard';
import DashboardFilters from '@/components/DashboardFilters';
import { parseVendas, formatCurrency, formatDate, getYearMonth } from '@/lib/parseUtils';
import type { VendaRow, ValidationError } from '@/lib/types';
import { DollarSign, ShoppingCart, TrendingUp, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#03c355', '#0c6c34', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

const VendasPage: React.FC = () => {
  const [data, setData] = useState<VendaRow[]>([]);
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
      const result = await parseVendas(file);
      if (result.errors.length > 0) {
        setErrors(result.errors);
        setPreview(result.preview);
        setData([]);
        setUploaded(false);
      } else {
        setData(result.data);
        setPreview(result.preview);
        setUploaded(true);
      }
    } catch {
      setErrors([{ type: 'invalid_data', message: 'Erro ao processar o arquivo. Verifique o formato.' }]);
    }
    setLoading(false);
  };

  const filteredData = useMemo(() => {
    let d = data;
    if (filters.vendedor && filters.vendedor !== 'all') d = d.filter(r => r.vendedor === filters.vendedor);
    if (filters.representacao && filters.representacao !== 'all') d = d.filter(r => r.representacao === filters.representacao);
    if (filters.etapa && filters.etapa !== 'all') d = d.filter(r => r.etapa === filters.etapa);
    if (dateFrom) d = d.filter(r => r.data_venda >= new Date(dateFrom));
    if (dateTo) d = d.filter(r => r.data_venda <= new Date(dateTo + 'T23:59:59'));
    if (search) {
      const s = search.toLowerCase();
      d = d.filter(r => r.vendedor.toLowerCase().includes(s) || r.cliente_telefone.includes(s) || r.representacao.toLowerCase().includes(s));
    }
    return d;
  }, [data, filters, dateFrom, dateTo, search]);

  const vendedores = useMemo(() => [...new Set(data.map(r => r.vendedor))].sort(), [data]);
  const representacoes = useMemo(() => [...new Set(data.map(r => r.representacao))].sort(), [data]);
  const etapas = useMemo(() => [...new Set(data.map(r => r.etapa))].sort(), [data]);

  const kpis = useMemo(() => {
    const vgv = filteredData.reduce((a, r) => a + r.valor_vgv, 0);
    const comissao = filteredData.reduce((a, r) => a + r.comissao_prevista, 0);
    const count = filteredData.length;
    const ticket = count > 0 ? vgv / count : 0;
    return { vgv, comissao, count, ticket };
  }, [filteredData]);

  const chartVGVVendedor = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach(r => map.set(r.vendedor, (map.get(r.vendedor) || 0) + r.valor_vgv));
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const chartComissaoVendedor = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach(r => map.set(r.vendedor, (map.get(r.vendedor) || 0) + r.comissao_prevista));
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const chartVGVRep = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach(r => map.set(r.representacao, (map.get(r.representacao) || 0) + r.valor_vgv));
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const chartEtapa = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach(r => map.set(r.etapa, (map.get(r.etapa) || 0) + 1));
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [filteredData]);

  const expected = ['data_venda', 'vendedor', 'closer', 'cliente_telefone', 'representacao', 'valor_vgv', 'percentual_comissao', 'comissao_prevista', 'etapa'];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 space-y-6">
        <h1 className="text-2xl font-display font-bold">Vendas</h1>

        {!uploaded && (
          <>
            <FileUpload
              label="Planilha de Vendas"
              expectedColumns={expected}
              onFileSelected={handleFile}
              isLoading={loading}
              error={errors.length > 0 ? errors.map(e => e.message).join('; ') : null}
              success={uploaded}
            />
            {preview.length > 0 && <DataPreview data={preview} />}
          </>
        )}

        {uploaded && (
          <div className="space-y-6 animate-fade-in">
            <DashboardFilters
              filters={[
                { key: 'vendedor', label: 'Vendedor', options: vendedores },
                { key: 'representacao', label: 'Representação', options: representacoes },
                { key: 'etapa', label: 'Etapa', options: etapas },
              ]}
              values={filters}
              onChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              onClear={() => { setFilters({}); setDateFrom(''); setDateTo(''); setSearch(''); }}
              searchValue={search}
              onSearchChange={setSearch}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard title="VGV Total" value={formatCurrency(kpis.vgv)} icon={DollarSign} />
              <KPICard title="Comissão Prevista" value={formatCurrency(kpis.comissao)} icon={TrendingUp} />
              <KPICard title="Qtd de Vendas" value={String(kpis.count)} icon={ShoppingCart} />
              <KPICard title="Ticket Médio" value={formatCurrency(kpis.ticket)} icon={Target} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
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
                <CardHeader className="pb-2"><CardTitle className="text-sm">Comissão por Vendedor</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartComissaoVendedor} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} fontSize={11} />
                      <YAxis type="category" dataKey="name" fontSize={11} width={75} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="value" fill="#0c6c34" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">VGV por Representação</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartVGVRep} layout="vertical" margin={{ left: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} fontSize={11} />
                      <YAxis type="category" dataKey="name" fontSize={11} width={95} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="value" fill="#03c355" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição por Etapa</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartEtapa} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} fontSize={11}>
                        {chartEtapa.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
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
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Vendedor</TableHead>
                      <TableHead className="text-xs">Closer</TableHead>
                      <TableHead className="text-xs">Telefone</TableHead>
                      <TableHead className="text-xs">Representação</TableHead>
                      <TableHead className="text-xs text-right">VGV</TableHead>
                      <TableHead className="text-xs text-right">% Com.</TableHead>
                      <TableHead className="text-xs text-right">Comissão Prev.</TableHead>
                      <TableHead className="text-xs">Etapa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{formatDate(r.data_venda)}</TableCell>
                        <TableCell className="text-xs">{r.vendedor}</TableCell>
                        <TableCell className="text-xs">{r.closer}</TableCell>
                        <TableCell className="text-xs">{r.cliente_telefone}</TableCell>
                        <TableCell className="text-xs">{r.representacao}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(r.valor_vgv)}</TableCell>
                        <TableCell className="text-xs text-right">{(r.percentual_comissao * 100).toFixed(1)}%</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(r.comissao_prevista)}</TableCell>
                        <TableCell className="text-xs">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">{r.etapa}</span>
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

export default VendasPage;
