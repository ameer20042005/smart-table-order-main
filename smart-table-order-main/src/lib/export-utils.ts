import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface ExportData {
  [key: string]: string | number | boolean | Date;
}

export const exportToExcel = (data: ExportData[], fileName: string): void => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    saveAs(blob, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
  }
};

export const exportToCSV = (data: ExportData[], fileName: string): void => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    
    saveAs(blob, `${fileName}.csv`);
  } catch (error) {
    console.error('Error exporting to CSV:', error);
  }
};
