/**
 * URL pública usada para gerar links de checkout que serão abertos por leads/clientes.
 *
 * Estratégia: sempre usar window.location.origin do ambiente atual. Assim o link
 * gerado funciona automaticamente em qualquer domínio onde o app esteja hospedado
 * (preview Lovable, domínio publicado .lovable.app, ou domínio customizado), sem
 * precisar manter uma constante hardcoded que quebra quando o subdomínio muda
 * (como aconteceu entre v2 e v3 após o remix).
 *
 * Fallback (SSR / sem window): string vazia → gera link relativo (/pay/xxx),
 * que ainda é colável e abre no mesmo host.
 */
export function getPublicAppUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

/** @deprecated Use getPublicAppUrl(). Mantido por compatibilidade. */
export const PUBLIC_APP_URL = "";
