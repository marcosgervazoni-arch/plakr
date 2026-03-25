export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
// [S12] Sessão de 30 dias em vez de 1 ano para reduzir janela de ataque
export const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
