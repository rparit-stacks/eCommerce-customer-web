/**
 * Customer web (storefront) auth mode.
 *
 * When true:
 * - Login: only Google OAuth (Firebase). Email / mobile / password / OTP tabs are not shown (code kept in modals behind this flag for easy restore).
 * - Register: first screen is only “Continue with Google”. After Google, if the API marks `new_user`, the existing onboarding form opens (name, email, phone, password) as today.
 *
 * Google / Firebase Web client config: Admin panel → Settings → Authentication (API key, Auth domain, Google sign-in, etc.) — unchanged.
 *
 * Mobile apps: they still call the same Laravel APIs; set this to `false` temporarily if you need the old multi-method UI on web while apps catch up.
 */
export const CUSTOMER_AUTH_GOOGLE_ONLY = true;

/**
 * Web storefront only: submit register form → POST /register directly (no Firebase phone OTP step).
 * Mobile apps are unchanged. Set to `false` to restore Firebase SMS OTP on web when smsGateway is firebase.
 */
export const CUSTOMER_WEB_REGISTER_SKIP_PHONE_OTP = true;
