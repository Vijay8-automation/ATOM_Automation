import * as path from 'path';
import * as fs from 'fs';

export interface UserCredential {
  username: string;
  password: string;
  [key: string]: any;
}

const DEFAULT_EXCEL_PATH = path.resolve(__dirname, '../TestData.xlsx');

/**
 * Helper to get workbook instance safely
 */
function getWorkbook(filePath: string = DEFAULT_EXCEL_PATH) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const xlsx = require('xlsx');
    return xlsx.readFile(filePath);
  } catch (err: any) {
    if (err.code !== 'MODULE_NOT_FOUND') {
      console.warn(`[ExcelReader] Could not read workbook: ${err.message}`);
    }
    return null;
  }
}

/**
 * Reads data rows from a specific sheet of TestData.xlsx.
 */
export function readExcelSheet<T = any>(filePath: string = DEFAULT_EXCEL_PATH, sheetName: string = 'Sheet1'): T[] {
  const workbook = getWorkbook(filePath);
  if (!workbook) return [];

  const actualSheetName = workbook.SheetNames.find(
    (s: string) => s.trim().toLowerCase() === sheetName.trim().toLowerCase()
  );

  if (!actualSheetName) return [];

  const xlsx = require('xlsx');
  const worksheet = workbook.Sheets[actualSheetName];
  return xlsx.utils.sheet_to_json(worksheet, { defval: '' });
}

/**
 * Fetches user credentials (Username, Password).
 * Searches the preferred sheet first, and if not found, scans ALL sheets (Sheet1, Sheet2, etc.)
 * looking for columns 'Username' and 'Password'.
 */
export function getUserCredentials(preferredSheet: string = 'User_credential', rowIndex: number = 0): UserCredential {
  const workbook = getWorkbook();

  if (workbook && workbook.SheetNames.length > 0) {
    // Prioritize preferredSheet, then scan all other sheets
    const sheetsToTry = [
      preferredSheet,
      ...workbook.SheetNames.filter((s: string) => s.trim().toLowerCase() !== preferredSheet.trim().toLowerCase()),
    ];

    const xlsx = require('xlsx');

    for (const sName of sheetsToTry) {
      const matchName = workbook.SheetNames.find(
        (s: string) => s.trim().toLowerCase() === sName.trim().toLowerCase()
      );
      if (!matchName) continue;

      const worksheet = workbook.Sheets[matchName];
      const rows: Record<string, any>[] = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

      if (rows && rows.length > rowIndex) {
        const row = rows[rowIndex];

        const userKey = Object.keys(row).find(
          k => k.trim().toLowerCase() === 'username' || k.trim().toLowerCase() === 'user_name'
        );
        const passKey = Object.keys(row).find(
          k => k.trim().toLowerCase() === 'password' || k.trim().toLowerCase() === 'pwd'
        );

        const username = userKey && row[userKey] ? String(row[userKey]).trim() : '';
        const password = passKey && row[passKey] ? String(row[passKey]).trim() : '';

        if (username && password) {
          console.log(`[ExcelReader] Loaded credentials from sheet "${matchName}": Username = "${username}"`);
          return { username, password, ...row };
        }
      }
    }
  }

  console.warn(`[ExcelReader] Could not find Username/Password in sheets. Using fallback credentials.`);
  return {
    username: 'SONY',
    password: 'Kuchbhi@123',
  };
}

/**
 * Reads baseUrl from 'Environment' sheet, or scans all sheets for '{{baseUrl}}' / 'baseUrl'.
 */
export function getBaseUrl(preferredSheet: string = 'Environment', defaultUrl: string = 'https://devapi.omone.in'): string {
  const workbook = getWorkbook();

  if (workbook && workbook.SheetNames.length > 0) {
    const sheetsToTry = [
      preferredSheet,
      ...workbook.SheetNames.filter((s: string) => s.trim().toLowerCase() !== preferredSheet.trim().toLowerCase()),
    ];

    const xlsx = require('xlsx');

    for (const sName of sheetsToTry) {
      const matchName = workbook.SheetNames.find(
        (s: string) => s.trim().toLowerCase() === sName.trim().toLowerCase()
      );
      if (!matchName) continue;

      const worksheet = workbook.Sheets[matchName];
      const rows: Record<string, any>[] = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

      if (rows && rows.length > 0) {
        for (const row of rows) {
          for (const [key, val] of Object.entries(row)) {
            const cleanKey = key.replace(/[{}]/g, '').trim().toLowerCase();
            if (cleanKey === 'baseurl' || cleanKey === 'url') {
              const urlStr = String(val).trim();
              if (urlStr && (urlStr.startsWith('http://') || urlStr.startsWith('https://'))) {
                console.log(`[ExcelReader] Loaded Base URL from sheet "${matchName}": "${urlStr}"`);
                return urlStr.replace(/\/+$/, '');
              }
            }
          }

          const values = Object.values(row).map(v => String(v).trim());
          const hasBaseUrlKey = values.some(v => v.replace(/[{}]/g, '').toLowerCase() === 'baseurl');
          if (hasBaseUrlKey) {
            const foundUrl = values.find(v => v.startsWith('http://') || v.startsWith('https://'));
            if (foundUrl) {
              console.log(`[ExcelReader] Loaded Base URL from sheet "${matchName}": "${foundUrl}"`);
              return foundUrl.replace(/\/+$/, '');
            }
          }
        }
      }
    }
  }

  return defaultUrl.replace(/\/+$/, '');
}
