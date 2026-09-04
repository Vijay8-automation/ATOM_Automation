import { test, expect } from '@playwright/test';
import { LoginAPI } from '../../../APIs/Modules/UserIAMService/auth/LoginAPI';
import { getUserCredentials, getBaseUrl } from '../../../TestData/Excel_Reader/excelReader';

test.describe('UserIAMService - Master Login API Test', () => {

  test('should login using Username & Password from TestData.xlsx', async ({ request }) => {
    const baseUrl = getBaseUrl();
    const creds = getUserCredentials('User_credential');

    console.log(`\n======================================================`);
    console.log(`[CONFIG] Base URL from Excel: ${baseUrl}`);
    console.log(`[AUTH] Attempting login with Username from Excel: "${creds.username}"`);
    console.log(`======================================================\n`);

    // Execute Login using credentials from Excel
    const { response, body, accessToken, refreshToken } = await LoginAPI.login(request);

    console.log(`[RESPONSE] Status Code: ${response.status()}`);
    console.log(`[RESPONSE] Body:`, JSON.stringify(body, null, 2));

    // Assertions
    expect(response.status()).toBe(200);
    expect(body.status).toBe('success');
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();

    console.log(`\n🎉 Login Successful!`);
    console.log(`   - Access Token: ${accessToken.substring(0, 25)}...`);
    console.log(`   - Refresh Token: ${refreshToken.substring(0, 25)}...\n`);

    // Save token to TestData/authToken.json for Franchise tests to use
    const fs = require('fs');
    const path = require('path');
    const tokenFile = path.resolve(__dirname, '../../../TestData/authToken.json');
    fs.writeFileSync(tokenFile, JSON.stringify({ accessToken, refreshToken, savedAt: new Date().toISOString() }, null, 2), 'utf-8');
    console.log(`💾 [Token Saved] Saved Bearer token to: ${tokenFile}\n`);
  });

});
