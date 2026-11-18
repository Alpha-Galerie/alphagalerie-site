// Basta soltar o arquivo do logo em src/assets/marcas/ que ele entra na faixa
// de marcas sozinho. Use PNG com fundo transparente e traço claro: a faixa e o
// cabeçalho de marca são escuros.
const ARQUIVOS = import.meta.glob('../assets/marcas/*.{png,webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

/**
 * Marcas com vitrine própria (subcategoria com o nome da marca). As demais
 * levam para a busca pelo nome.
 */
const SUBCATEGORIA_DA_MARCA: Record<string, string> = {
  'puff life': 'Puff Life',
  squadafum: 'Squadafum',
};

const FRASE_DA_MARCA: Record<string, string> = {
  'puff life': 'Cases, bags e acessórios Puff Life com preço oficial da marca.',
  squadafum: 'Vidros, silicones e acessórios Squadafum, direto da curadoria Alpha.',
};

export interface Marca {
  nome: string;
  src: string;
  href: string;
  subcategoria: string | null;
  frase: string | null;
}

function nomeDoArquivo(caminho: string): string {
  const arquivo = caminho.split('/').pop() ?? '';
  return arquivo.replace(/\.\w+$/, '').replace(/[-_]+/g, ' ').trim().toLowerCase();
}

export const MARCAS: Marca[] = Object.entries(ARQUIVOS)
  .map(([caminho, src]) => {
    const nome = nomeDoArquivo(caminho);
    const subcategoria = SUBCATEGORIA_DA_MARCA[nome] ?? null;
    return {
      nome,
      src,
      subcategoria,
      frase: FRASE_DA_MARCA[nome] ?? null,
      href: subcategoria ? `/?sub=${encodeURIComponent(subcategoria)}` : `/?q=${encodeURIComponent(nome)}`,
    };
  })
  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

/** A marca dona da subcategoria, para o cabeçalho da vitrine dela. */
export function marcaDaSubcategoria(subcategoria: string | null | undefined): Marca | null {
  if (!subcategoria) return null;
  const alvo = subcategoria.toLowerCase();
  return MARCAS.find((m) => m.subcategoria?.toLowerCase() === alvo) ?? null;
}
