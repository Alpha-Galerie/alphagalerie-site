import type { Produto } from '../types';

function toSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function buildProductPath(produto: Pick<Produto, 'id' | 'nome'>): string {
  const slug = toSlug(produto.nome);
  return slug ? `/produto/${produto.id}-${slug}` : `/produto/${produto.id}`;
}

export function extractProductIdFromParam(param?: string): number | null {
  if (!param) return null;
  const match = param.match(/^(\d+)/);
  if (!match) return null;

  const id = Number.parseInt(match[1], 10);
  return Number.isNaN(id) ? null : id;
}
