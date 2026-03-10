import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

@Injectable({
    providedIn: 'root'
})
export class ExcelService {

    constructor() { }

    /**
     * Export an array of objects to an Excel file
     * @param data Array of objects to export
     * @param fileName Name of the file (without extension)
     */
    exportToExcel(data: any[], fileName: string): void {
        const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
        const workbook: XLSX.WorkBook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
        XLSX.writeFile(workbook, `${fileName}_${new Date().getTime()}.xlsx`);
    }

    /**
     * Import an Excel file and convert it to an array of objects
     * @param file The file object from the input element
     * @returns Promise resolving to an array of objects
     */
    importFromExcel(file: File): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const reader: FileReader = new FileReader();

            reader.onload = (e: any) => {
                try {
                    const binaryData = e.target.result;
                    const workbook = XLSX.read(binaryData, { type: 'binary' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const data = XLSX.utils.sheet_to_json(worksheet, { raw: true });
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = (error) => reject(error);
            reader.readAsBinaryString(file);
        });
    }
}
