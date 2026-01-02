import { HttpContextToken } from '@angular/common/http';

/**
 * Context token to skip global error handling in the error interceptor.
 * Use this when you want to handle errors locally in your component.
 */
export const SKIP_ERROR_INTERCEPTOR = new HttpContextToken<boolean>(() => false);
