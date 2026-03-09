import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

@Injectable({
    providedIn: 'root'
})
export class ExcelService {

    constructor() { }

    public exportToFile(data: any[], fileName: string, sheetName: string = 'Sheet1'): void {
        const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
        const workbook: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // Auto-size columns slightly
        const columnWidths = this.calculateColumnWidths(data);
        worksheet['!cols'] = columnWidths.map(w => ({ wch: w }));

        XLSX.writeFile(workbook, `${fileName}.xlsx`);
    }

    public parseFile(file: File): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e: any) => {
                try {
                    const binaryString = e.target.result;
                    const workbook = XLSX.read(binaryString, { type: 'binary' });

                    if (!workbook.SheetNames.length) {
                        reject(new Error('The uploaded Excel file contains no sheets.'));
                        return;
                    }

                    const worksheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[worksheetName];
                    const importedData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' }); // Provide default value for empty cells

                    resolve(importedData);
                } catch (error) {
                    reject(new Error('Failed to parse the uploaded Excel file. It might be corrupted or in an unsupported format.'));
                }
            };

            reader.onerror = (error) => reject(error);
            reader.readAsBinaryString(file);
        });
    }

    private calculateColumnWidths(data: any[]): number[] {
        if (!data || !data.length) return [];

        const maxColumnWidths: number[] = [];

        // First, analyze headers
        const headers = Object.keys(data[0]);
        headers.forEach((header, index) => {
            maxColumnWidths[index] = header.length + 2; // Add some padding
        });

        // Then analyze rows
        data.forEach(row => {
            headers.forEach((header, index) => {
                const cellValue = String(row[header] || '');
                if (cellValue.length + 2 > maxColumnWidths[index]) {
                    maxColumnWidths[index] = Math.min(cellValue.length + 2, 50); // Cap width to 50
                }
            });
        });

        return maxColumnWidths;
    }
}
