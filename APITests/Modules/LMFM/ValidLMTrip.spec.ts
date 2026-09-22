import { test, expect } from '@playwright/test';
import { MMWorkflow } from '../../../Utils/Workflows/MMWorkflow';
import { LMWorkflow } from '../../../Utils/Workflows/LMWorkflow';

test.describe('Last Mile (LM) - Complete Process Flow', () => {

  test('Scenario 1: Verify complete end-to-end Middle Mile to Last Mile execution', async ({ request }) => {
    console.log('\n================================================================');
    console.log('🚀 [SCENARIO 1] VERIFY COMPLETE END-TO-END MM & LM PROCESS FLOW');
    console.log('================================================================\n');

    // 1. Re-use complete MM flow (Booking -> Manifest -> Loading -> Gate-Out -> Gate-In -> Unload)
    const mmResult = await MMWorkflow.executeCompleteMMFlow(request);
    expect(mmResult.docketNo).toBeTruthy();
    expect(mmResult.boxCode).toBeTruthy();

    // 2. Re-use complete LM flow (Eligible -> Trip Create -> Verify -> Scan -> Load -> Gate-Out -> POD -> Close)
    const lmResult = await LMWorkflow.executeCompleteLMFlow(request, mmResult);
    expect(lmResult.tripNo).toBeTruthy();
    expect(lmResult.deliveryOutcome).toBe('DELIVERED');
    expect(lmResult.tripOutcome).toBe('COMPLETED');
  });

});
