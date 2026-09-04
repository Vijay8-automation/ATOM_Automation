import * as path from 'path';
import * as fs from 'fs';

export interface UIUserCredential {
  username: string;
  password: string;
  [key: string]: any;
}

const DEFAULT_UI_EXCEL_PATH = path.resolve(__dirname, '../UITestData.xlsx');

/**
 * Helper to get workbook instance safely for UI tests
 */
function getUIWorkbook(filePath: string = DEFAULT_UI_EXCEL_PATH) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[UIExcelReader] File does not exist at: ${filePath}`);
    return null;
  }
  try {
    const xlsx = require('xlsx');
    return xlsx.readFile(filePath);
  } catch (err: any) {
    if (err.code !== 'MODULE_NOT_FOUND') {
      console.warn(`[UIExcelReader] Could not read workbook: ${err.message}`);
    }
    return null;
  }
}

/**
 * Reads all data rows from a specific sheet in UITestData.xlsx.
 * Case-insensitive sheet matching with trim support.
 */
export function readUISheet<T = any>(sheetName: string = 'Branch', filePath: string = DEFAULT_UI_EXCEL_PATH): T[] {
  const workbook = getUIWorkbook(filePath);
  if (!workbook) return [];

  const actualSheetName = workbook.SheetNames.find(
    (s: string) => s.trim().toLowerCase() === sheetName.trim().toLowerCase()
  );

  if (!actualSheetName) {
    console.warn(`[UIExcelReader] Sheet "${sheetName}" not found. Available sheets: [${workbook.SheetNames.join(', ')}]`);
    return [];
  }

  const xlsx = require('xlsx');
  const worksheet = workbook.Sheets[actualSheetName];
  return xlsx.utils.sheet_to_json(worksheet, { defval: '' });
}

/**
 * Fetches a specific row from a given sheet by column name and value (e.g. TestCaseId == 'TC01').
 */
export function getUIRowByField<T = any>(
  sheetName: string,
  fieldName: string,
  fieldValue: string,
  filePath: string = DEFAULT_UI_EXCEL_PATH
): T | null {
  const rows = readUISheet<any>(sheetName, filePath);
  const found = rows.find(r => {
    const key = Object.keys(r).find(k => k.trim().toLowerCase() === fieldName.trim().toLowerCase());
    return key && String(r[key]).trim().toLowerCase() === fieldValue.trim().toLowerCase();
  });
  return found || null;
}

/**
 * Reads row from 'BranchCreation' sheet (or fallback to any sheet matching 'branch').
 */
export function getBranchCreationRow<T = any>(sheetName: string = 'BranchCreation', rowIndex: number = 0): T {
  const rows = readUISheet<T>(sheetName);
  if (rows && rows.length > rowIndex) {
    return rows[rowIndex];
  }
  // Try fallback search for sheets containing 'branch'
  const workbook = getUIWorkbook();
  if (workbook) {
    const match = workbook.SheetNames.find(s => s.trim().toLowerCase().includes('branch'));
    if (match && match.toLowerCase() !== sheetName.toLowerCase()) {
      const fallbackRows = readUISheet<T>(match);
      if (fallbackRows && fallbackRows.length > rowIndex) {
        return fallbackRows[rowIndex];
      }
    }
  }
  return {} as T;
}

/**
 * Flexible field value extractor that handles case, spacing, and underscores in column headers.
 */
export function getFieldValue(row: Record<string, any>, possibleKeys: string[], defaultValue: string = ''): string {
  if (!row || typeof row !== 'object') return defaultValue;
  for (const key of Object.keys(row)) {
    const cleanKey = key.replace(/[\s_\-.]/g, '').toLowerCase();
    for (const target of possibleKeys) {
      const cleanTarget = target.replace(/[\s_\-.]/g, '').toLowerCase();
      if (cleanKey === cleanTarget || cleanKey.includes(cleanTarget)) {
        const val = row[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim();
        }
      }
    }
  }
  return defaultValue;
}

/**
 * Fetches user credentials (Username, Password) for UI Login.
 * Searches the 'Credential' sheet first, then scans all sheets looking for columns 'Username' and 'Password'.
 */
export function getUICredentials(preferredSheet: string = 'Credential', rowIndex: number = 0): UIUserCredential {
  const workbook = getUIWorkbook();

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

      if (rows && rows.length > rowIndex) {
        const row = rows[rowIndex];

        const userKey = Object.keys(row).find(
          k =>
            k.trim().toLowerCase() === 'username' ||
            k.trim().toLowerCase() === 'user_name' ||
            k.trim().toLowerCase() === 'user'
        );
        const passKey = Object.keys(row).find(
          k =>
            k.trim().toLowerCase() === 'password' ||
            k.trim().toLowerCase() === 'pwd' ||
            k.trim().toLowerCase() === 'pass'
        );

        const username = userKey && row[userKey] ? String(row[userKey]).trim() : '';
        const password = passKey && row[passKey] ? String(row[passKey]).trim() : '';

        if (username && password) {
          console.log(`[UIExcelReader] Loaded UI credentials from sheet "${matchName}": Username = "${username}"`);
          return { username, password, ...row };
        }
      }
    }
  }

  console.warn(`[UIExcelReader] Could not find Username/Password in UITestData.xlsx sheets. Using fallback.`);
  return {
    username: 'SONY',
    password: 'Kuchbhi@123',
  };
}

/**
 * Reads UI base URL or returns default https://dev.omone.in
 */
export function getUIBaseUrl(defaultUrl: string = 'https://dev.omone.in'): string {
  const workbook = getUIWorkbook();
  if (workbook && workbook.SheetNames.length > 0) {
    const xlsx = require('xlsx');
    for (const sName of workbook.SheetNames) {
      const rows: Record<string, any>[] = xlsx.utils.sheet_to_json(workbook.Sheets[sName], { defval: '' });
      for (const row of rows) {
        for (const [key, val] of Object.entries(row)) {
          const cleanKey = key.replace(/[{}]/g, '').trim().toLowerCase();
          if (cleanKey === 'baseurl' || cleanKey === 'url' || cleanKey === 'loginurl') {
            const urlStr = String(val).trim();
            if (urlStr && (urlStr.startsWith('http://') || urlStr.startsWith('https://'))) {
              return urlStr.replace(/\/+$/, '');
            }
          }
        }
      }
    }
  }
  return defaultUrl.replace(/\/+$/, '');
}
