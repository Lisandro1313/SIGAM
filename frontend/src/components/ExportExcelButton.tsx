import { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { FileDownload as DownloadIcon } from '@mui/icons-material';
import * as XLSX from 'xlsx';

interface ExportExcelButtonProps {
  data?: any[];
  fileName: string;
  sheetName: string;
  label?: string;
  /** Si se pasa, se llama en lugar de usar `data` — permite fetch asíncrono de todos los datos */
  onExport?: () => Promise<any[]>;
}

export default function ExportExcelButton({
  data = [],
  fileName,
  sheetName,
  label = 'Exportar a Excel',
  onExport,
}: ExportExcelButtonProps) {
  const [loading, setLoading] = useState(false);

  const doExport = (rows: any[]) => {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  const handleExport = async () => {
    if (onExport) {
      setLoading(true);
      try {
        const rows = await onExport();
        doExport(rows);
      } finally {
        setLoading(false);
      }
    } else {
      doExport(data);
    }
  };

  return (
    <Button
      variant="outlined"
      startIcon={loading ? <CircularProgress size={16} /> : <DownloadIcon />}
      onClick={handleExport}
      disabled={loading || (!onExport && data.length === 0)}
    >
      {label}
    </Button>
  );
}
