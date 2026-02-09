/**
 * Helpers para formatação segura de valores numéricos.
 * Evita erros ".toFixed is not a function" quando valor vem como string ou undefined.
 */

/**
 * Converte qualquer valor para número de forma segura.
 */
export function valorNumerico(valor: unknown): number {
  if (valor === null || valor === undefined) return 0;
  if (typeof valor === 'number' && !Number.isNaN(valor)) return valor;
  const num = parseFloat(String(valor).replace(/\D/g, '').replace(',', '.') || '0');
  return Number.isNaN(num) ? 0 : num;
}

/**
 * Formata valor para exibição com 2 casas decimais (string).
 * Uso: R$ {formatarValor(item.valor)}
 */
export function formatarValor(valor: unknown): string {
  const num = valorNumerico(valor);
  return num.toFixed(2);
}

/**
 * Formata como moeda BRL (R$ 1.234,56).
 */
export function formatarMoeda(valor: unknown): string {
  const num = valorNumerico(valor);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}
