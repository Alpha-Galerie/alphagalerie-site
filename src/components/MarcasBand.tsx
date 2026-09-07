import styles from './MarcasBand.module.css';

// Basta soltar o arquivo do logo em src/assets/marcas/ que ele entra aqui sozinho.
// Use PNG com fundo transparente — a faixa é escura, logo com fundo chapado fica feio.
const ARQUIVOS = import.meta.glob('../assets/marcas/*.{png,webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

function nomeDaMarca(caminho: string): string {
  const arquivo = caminho.split('/').pop() ?? '';
  return arquivo.replace(/\.\w+$/, '').replace(/[-_]+/g, ' ').trim();
}

const MARCAS = Object.entries(ARQUIVOS)
  .map(([caminho, src]) => ({ nome: nomeDaMarca(caminho), src }))
  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

export default function MarcasBand() {
  if (MARCAS.length === 0) return null;

  return (
    <section className={styles.secao} aria-labelledby="marcas-titulo">
      <div className={styles.head}>
        <p className={styles.eyebrow}>Marcas</p>
        <h2 className={styles.titulo} id="marcas-titulo">
          As melhores marcas você encontra <em>aqui</em>.
        </h2>
      </div>

      <div className={styles.assinatura}>
        {MARCAS.map((marca) => (
          <img
            key={marca.nome}
            className={styles.logo}
            src={marca.src}
            alt={marca.nome}
            loading="lazy"
            decoding="async"
          />
        ))}
      </div>
    </section>
  );
}
