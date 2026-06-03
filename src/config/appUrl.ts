/**
 * URL pública usada para gerar links de checkout que serão abertos por leads/clientes
 * fora do ambiente de edição (Lovable preview exige login do Lovable).
 *
 * Em produção, mantém-se o domínio publicado. Em dev local cai para window.location.origin.
 * Se você conectar um domínio próprio, basta atualizar PUBLIC_APP_URL abaixo.
 */
export const PUBLIC_APP_URL = "https://highflow-v2.lovable.app";

export function getPublicAppUrl(): string {
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    // Em dev local (localhost / 127.0.0.1) usamos o próprio origin para não quebrar testes.
    if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(origin)) {
      return origin;
    }
  }
  return PUBLIC_APP_URL;
}