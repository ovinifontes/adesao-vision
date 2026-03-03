import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface FilterOption {
  key: string;
  label: string;
  options: string[];
}

interface DashboardFiltersProps {
  filters: FilterOption[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (v: string) => void;
  onDateToChange?: (v: string) => void;
  onClear: () => void;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  filters, values, onChange, dateFrom, dateTo, onDateFromChange, onDateToChange, onClear, searchValue, onSearchChange
}) => {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg bg-card border p-4">
      {filters.map(f => {
        const validOptions = f.options.filter(o => o !== '' && o != null);
        return (
        <div key={f.key} className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
          <Select value={values[f.key] || 'all'} onValueChange={(v) => onChange(f.key, v)}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {validOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        );
      })}
      {onDateFromChange && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">De</label>
          <Input type="date" value={dateFrom || ''} onChange={e => onDateFromChange(e.target.value)} className="w-[150px] h-9 text-sm" />
        </div>
      )}
      {onDateToChange && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Até</label>
          <Input type="date" value={dateTo || ''} onChange={e => onDateToChange(e.target.value)} className="w-[150px] h-9 text-sm" />
        </div>
      )}
      {onSearchChange && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Buscar</label>
          <Input placeholder="Buscar..." value={searchValue || ''} onChange={e => onSearchChange(e.target.value)} className="w-[180px] h-9 text-sm" />
        </div>
      )}
      <Button variant="ghost" size="sm" onClick={onClear} className="h-9">
        <X className="h-3.5 w-3.5 mr-1" /> Limpar
      </Button>
    </div>
  );
};

export default DashboardFilters;
