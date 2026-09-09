import { APIRequestContext } from '@playwright/test';
import {
  BaseAPI,
  getSavedAuthToken as commonGetSavedAuthToken,
  ensureAuthToken as commonEnsureAuthToken,
  getDefaultGatewayHeaders as commonGetDefaultGatewayHeaders,
  getApiBaseUrl,
} from '../../Common/BaseAPI';

/**
 * Franchise Base Configuration.
 * Inherits and re-exports universal API utilities from APIs/Common/BaseAPI.ts.
 *
 * Provides 100% backward compatibility for existing Franchise tests while enabling:
 * - Universal Auto-Login (ensureAuthToken)
 * - Centralized Gateway Headers
 * - Postman-like pm.environment integration
 */
export const getSavedAuthToken = commonGetSavedAuthToken;
export const ensureAuthToken = (req?: APIRequestContext, force?: boolean) => commonEnsureAuthToken(req, force);
export const getDefaultGatewayHeaders = commonGetDefaultGatewayHeaders;
export const getFranchiseBaseUrl = () => getApiBaseUrl('Environment');
export { BaseAPI };
