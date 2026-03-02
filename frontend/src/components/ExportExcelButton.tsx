import { Button } from '@mui/material';
import { FileDownload as DownloadIcon } from '@mui/icons-material';
import * as XLSX from 'xlsx';

interface ExportExcelButtonProps {
  data: any[];
  fileName: string;
  sheetName: string;
  label?: string;
}

export default function ExportExcelButton({
  data,
  fileName,
  sheetName,
  label = 'Exportar a Excel',
}: ExportExcelButtonProps) {
  const handleExport = () => {
    // Crear el libro de trabajo
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generar el archivo y descargarlo
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  return (
    <Button
      variant="outlined"
      startIcon={<DownloadIcon />}
      onClick={handleExport}
      disabled={data.length === 0}
    >
      {label}
    </Button>
  );
}
