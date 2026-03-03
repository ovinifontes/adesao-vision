import React, { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  label: string;
  expectedColumns: string[];
  onFileSelected: (file: File) => void;
  isLoading?: boolean;
  error?: string | null;
  success?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ label, expectedColumns, onFileSelected, isLoading, error, success }) => {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'csv') {
      return;
    }
    setFileName(file.name);
    onFileSelected(file);
  }, [onFileSelected]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  }, [handleFile]);

  return (
    <Card className={`transition-all duration-200 ${dragOver ? 'ring-2 ring-primary border-primary' : ''} ${error ? 'border-destructive' : ''} ${success ? 'border-primary' : ''}`}>
      <CardContent className="p-6">
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 cursor-pointer hover:border-primary/50 transition-colors"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => document.getElementById(`upload-${label}`)?.click()}
        >
          <input id={`upload-${label}`} type="file" accept=".xlsx,.csv" className="hidden" onChange={onInputChange} />
          
          {isLoading ? (
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
          ) : success ? (
            <CheckCircle2 className="h-10 w-10 text-primary" />
          ) : (
            <Upload className="h-10 w-10 text-muted-foreground" />
          )}

          <div className="text-center">
            <p className="font-display font-semibold text-lg">{label}</p>
            {fileName ? (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <FileSpreadsheet className="h-4 w-4" /> {fileName}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                Arraste ou clique para enviar (.xlsx ou .csv)
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-1">Colunas esperadas:</p>
          <div className="flex flex-wrap gap-1">
            {expectedColumns.map(col => (
              <span key={col} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{col}</span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUpload;
