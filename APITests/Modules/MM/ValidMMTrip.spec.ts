import { test, expect } from '@playwright/test';
import { MMWorkflow } from '../../../Utils/Workflows/MMWorkflow';

test.describe('Middle Mile (MM) - Complete Process Flow', () => {

  test('Scenario 1: Verify the complete process execution of mid mile', async ({ request }) => {
    const result = await MMWorkflow.executeCompleteMMFlow(request);
    expect(result.docketNo).toBeDefined();
    expect(result.tripNo).toBeDefined();
    expect(result.manifestNo).toBeDefined();
    expect(result.boxCode).toBeDefined();
  });
});
