import { TestInfo } from '@playwright/test';

export * from '../TestData/Excel_Reader/excelReader';
export * from '../TestData/Excel_Reader/uiExcelReader';
export * from './WaitHelper';
export * from './ExceptionHandler';

export interface TestCaseReportData {
  caseDetails: string;
  expected: string;
  actualResult: string;
}

export class ReportHelper {
  /**
   * Logs and records Case details, Expected, and Actual Result into Playwright HTML Report.
   * Adds both as top-level Annotations and as a formatted Attachment in the HTML report.
   */
  public static recordTestResult(testInfo: TestInfo, data: TestCaseReportData): void {
    // 1. Add annotations to appear directly at the top of the HTML report
    testInfo.annotations.push(
      { type: 'Case details', description: data.caseDetails },
      { type: 'Expected', description: data.expected },
      { type: 'Actual Result', description: data.actualResult }
    );

    // 2. Add formatted Markdown attachment for the HTML report
    const summaryContent = [
      `## 📋 Test Execution Summary`,
      ``,
      `**Case details:** ${data.caseDetails}`,
      ``,
      `**Expected:** ${data.expected}`,
      ``,
      `**Actual Result:** ${data.actualResult}`,
    ].join('\n');

    testInfo.attach('Case Execution Summary', {
      body: summaryContent,
      contentType: 'text/markdown',
    });

    console.log(`\n================== [REPORT SUMMARY] ==================`);
    console.log(`Case details  : ${data.caseDetails}`);
    console.log(`Expected      : ${data.expected}`);
    console.log(`Actual Result : ${data.actualResult}`);
    console.log(`======================================================\n`);
  }
}

