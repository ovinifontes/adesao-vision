import React, { useState, useMemo } from 'react';
import AppHeader from '@/components/AppHeader';
import FileUpload from '@/components/FileUpload';
import DataPreview from '@/components/DataPreview';
import KPICard from '@/components/KPICard';
import DashboardFilters from '@/components/DashboardFilters';
import { parseAtividade, formatDate } from '@/lib/parseUtils';
import type { AtividadeRow, ValidationError } from '@/lib/types';
import { Megaphone, Phone, CalendarCheck, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const VendedoresPage: React.FC = () => {
  const [data, setData] = useState<AtividadeRow[]>([]);
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleFile = async (file: File) => {
    setLoading(true);
    setErrors([]);
    try {
      const result = await parseAtividade(file);
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
    if (dateFrom) d = d.filter(r => r.periodo_inicio >= new Date(dateFrom));
    if (dateTo) d = d.filter(r => r.periodo_inicio <= new Date(dateTo + 'T23:59:59'));
    return d;
  }, [data, filters, dateFrom, dateTo]);

  const vendedores = useMemo(() => [...new Set(data.map(r => r.vendedor))].sort(), [data]);

  const totals = useMemo(() => {
    const t = { anuncios: 0, ligacoes: 0, agendamentos: 0, visitas: 0 };
    filteredData.forEach(r => {
      t.anuncios += r.anuncios;
      t.ligacoes += r.ligacoes;
      t.agendamentos += r.agendamentos;
      t.visitas += r.visitas;
    });
    return t;
  }, [filteredData]);

  const taxas = useMemo(() => ({
    ligAnun: totals.anuncios > 0 ? (totals.ligacoes / totals.anuncios * 100).toFixed(1) + '%' : '-',
    agendLig: totals.ligacoes > 0 ? (totals.agendamentos / totals.ligacoes * 100).toFixed(1) + '%' : '-',
    visitAgend: totals.agendamentos > 0 ? (totals.visitas / totals.agendamentos * 100).toFixed(1) + '%' : '-',
  }), [totals]);

  const chartVendedor = useMemo(() => {
    const map = new Map<string, { anuncios: number; ligacoes: number; agendamentos: number; visitas: number }>();
    filteredData.forEach(r => {
      const prev = map.get(r.vendedor) || { anuncios: 0, ligacoes: 0, agendamentos: 0, visitas: 0 };
      map.set(r.vendedor, {
        anuncios: prev.anuncios + r.anuncios,
        ligacoes: prev.ligacoes + r.ligacoes,
        agendamentos: prev.agendamentos + r.agendamentos,
        visitas: prev.visitas + r.visitas,
      });
    });
    return Array.from(map, ([name, v]) => ({ name, ...v })).sort((a, b) => b.visitas - a.visitas);
  }, [filteredData]);

  const rankingVisitas = useMemo(() =>
    [...chartVendedor].sort((a, b) => b.visitas - a.visitas)
  , [chartVendedor]);

  const expected = ['periodo_inicio', 'periodo_fim', 'vendedor', 'anuncios', 'ligacoes', 'agendamentos', 'visitas'];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 space-y-6">
        <h1 className="text-2xl font-display font-bold">Vendedores</h1>

        {!uploaded && (
          <>
            <FileUpload label="Planilha de Atividade" expectedColumns={expected} onFileSelected={handleFile} isLoading={loading} error={errors.length > 0 ? errors.map(e => e.message).join('; ') : null} success={uploaded} />
            {preview.length > 0 && <DataPreview data={preview} />}
          </>
        )}

        {uploaded && (
          <div className="space-y-6 animate-fade-in">
            <DashboardFilters
              filters={[{ key: 'vendedor', label: 'Vendedor', options: vendedores }]}
              values={filters}
              onChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
              dateFrom={dateFrom} dateTo={dateTo}
              onDateFromChange={setDateFrom} onDateToChange={setDateTo}
              onClear={() => { setFilters({}); setDateFrom(''); setDateTo(''); }}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard title="Total Anúncios" value={String(totals.anuncios)} subtitle={`Lig/Anún: ${taxas.ligAnun}`} icon={Megaphone} />
              <KPICard title="Total Ligações" value={String(totals.ligacoes)} subtitle={`Agend/Lig: ${taxas.agendLig}`} icon={Phone} />
              <KPICard title="Total Agendamentos" value={String(totals.agendamentos)} subtitle={`Visit/Agend: ${taxas.visitAgend}`} icon={CalendarCheck} />
              <KPICard title="Total Visitas" value={String(totals.visitas)} icon={MapPin} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Funil por Vendedor</CardTitle></CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartVendedor} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" fontSize={11} />
                      <YAxis type="category" dataKey="name" fontSize={11} width={75} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="anuncios" fill="#03c355" name="Anúncios" />
                      <Bar dataKey="ligacoes" fill="#0c6c34" name="Ligações" />
                      <Bar dataKey="agendamentos" fill="#3b82f6" name="Agendamentos" />
                      <Bar dataKey="visitas" fill="#f59e0b" name="Visitas" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Ranking de Visitas</CardTitle></CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rankingVisitas} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" fontSize={11} />
                      <YAxis type="category" dataKey="name" fontSize={11} width={75} />
                      <Tooltip />
                      <Bar dataKey="visitas" fill="#03c355" radius={[0, 4, 4, 0]} name="Visitas" />
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
                      <TableHead className="text-xs">Início</TableHead>
                      <TableHead className="text-xs">Fim</TableHead>
                      <TableHead className="text-xs">Vendedor</TableHead>
                      <TableHead className="text-xs text-right">Anúncios</TableHead>
                      <TableHead className="text-xs text-right">Ligações</TableHead>
                      <TableHead className="text-xs text-right">Agendamentos</TableHead>
                      <TableHead className="text-xs text-right">Visitas</TableHead>
                      <TableHead className="text-xs text-right">Lig/Anún</TableHead>
                      <TableHead className="text-xs text-right">Agend/Lig</TableHead>
                      <TableHead className="text-xs text-right">Visit/Agend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{formatDate(r.periodo_inicio)}</TableCell>
                        <TableCell className="text-xs">{formatDate(r.periodo_fim)}</TableCell>
                        <TableCell className="text-xs">{r.vendedor}</TableCell>
                        <TableCell className="text-xs text-right">{r.anuncios}</TableCell>
                        <TableCell className="text-xs text-right">{r.ligacoes}</TableCell>
                        <TableCell className="text-xs text-right">{r.agendamentos}</TableCell>
                        <TableCell className="text-xs text-right">{r.visitas}</TableCell>
                        <TableCell className="text-xs text-right">{r.anuncios > 0 ? (r.ligacoes / r.anuncios * 100).toFixed(1) + '%' : '-'}</TableCell>
                        <TableCell className="text-xs text-right">{r.ligacoes > 0 ? (r.agendamentos / r.ligacoes * 100).toFixed(1) + '%' : '-'}</TableCell>
                        <TableCell className="text-xs text-right">{r.agendamentos > 0 ? (r.visitas / r.agendamentos * 100).toFixed(1) + '%' : '-'}</TableCell>
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

export default VendedoresPage;
