import { useCallback } from 'react';
import { useTranslation } from './useTranslation';

/** Maps auth service error codes to user-facing text. Shared by sign-in, password reset and account deletion. */
export function useAuthErrorMessage() {
  const { t } = useTranslation();

  return useCallback(
    (code: string): string => {
      const map: Record<string, string> = {
        empty_email: t('auth.errorEmptyEmail'),
        invalid_email: t('auth.errorInvalidEmail'),
        empty_password: t('auth.errorEmptyPassword'),
        weak_password: t('auth.errorWeakPassword'),
        invalid: t('auth.errorInvalid'),
        exists: t('auth.errorExists'),
        not_found: t('auth.errorNotFound'),
        wrong_password: t('auth.errorWrongCredentials'),
        wrong_credentials: t('auth.errorWrongCredentials'),
        email_not_confirmed: t('auth.errorEmailNotConfirmed'),
        email_confirmation_sent: t('auth.errorEmailConfirmationSent'),
        signup_disabled: t('auth.errorSignupDisabled'),
        rate_limited: t('auth.errorRateLimited'),
        network: t('auth.errorNetwork'),
        invalid_api_key: t('auth.errorInvalidApiKey'),
        not_configured: t('auth.errorNotConfigured'),
        invalid_code: t('auth.errorInvalidCode'),
        reset_unavailable: t('auth.errorResetUnavailable'),
        unknown: t('auth.errorUnknown'),
      };
      return map[code] ?? t('auth.errorUnknown');
    },
    [t]
  );
}
