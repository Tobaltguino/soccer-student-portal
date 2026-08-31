import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExcelService {
  
  /**
   * Genera un buffer de Excel estilizado a partir de datos crudos.
   * @param nombreHoja Nombre de la pestaña inferior del Excel
   * @param columnas Definición de las columnas { header: 'Nombre', key: 'nombre', width: 20 }
   * @param datos Array de objetos con la información
   */
  async generarExcel(
    nombreHoja: string,
    columnas: Partial<ExcelJS.Column>[],
    datos: any[],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    // Metadatos del archivo
    workbook.creator = 'ProFutbol Admin';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(nombreHoja);

    // Asignar columnas
    worksheet.columns = columnas;

    // Agregar los datos
    worksheet.addRows(datos);

    // ==========================================
    // ESTILOS: Cabecera profesional (Fondo Teal, Texto Blanco)
    // ==========================================
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0D9488' }, // Color Teal aproximado
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
    });
    headerRow.height = 25;

    // ==========================================
    // ESTILOS: Filas de datos
    // ==========================================
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Saltamos la cabecera
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        });
      }
    });

    // Generar el archivo en memoria (Buffer)
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}