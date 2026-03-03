import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DataPreviewProps {
  data: Record<string, unknown>[];
  title?: string;
}

const DataPreview: React.FC<DataPreviewProps> = ({ data, title = "Preview (10 primeiras linhas)" }) => {
  if (!data.length) return null;
  const cols = Object.keys(data[0]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {cols.map(c => <TableHead key={c} className="text-xs whitespace-nowrap">{c}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={i}>
                {cols.map(c => (
                  <TableCell key={c} className="text-xs whitespace-nowrap">
                    {row[c] instanceof Date ? (row[c] as Date).toLocaleDateString('pt-BR') : String(row[c] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default DataPreview;
