import styles from './MarcasBand.module.css';

// Basta soltar o arquivo do logo em src/assets/marcas/ que ele entra aqui sozinho.
// O nome do arquivo é o nome da marca (ex.: aleda.png, bombaco.jpg, mascotte.png).
const ARQUIVOS = import.meta.glob('../assets/marcas/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const LIMITE_ESTATICO = 6;

function nomeDaMarca(caminho: string): string {
  const arquivo = caminho.split('/').pop() ?? '';
  return arquivo.replace(/\.\w+$/, '').replace(/[-_]+/g, ' ').trim();
}

const MARCAS = Object.entries(ARQUIVOS)
  .map(([caminho, src]) => ({ nome: nomeDaMarca(caminho), src }))
  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

export default function MarcasBand() {
  if (MARCAS.length === 0) return null;

  const rolar = MARCAS.length > LIMITE_ESTATICO;
  // Na versão que rola, a trilha é duplicada para o loop não deixar buraco
  const trilha = rolar ? [...MARCAS, ...MARCAS] : MARCAS;

  return (
    <section className={styles.band} aria-labelledby="marcas-titulo">
      <div className={styles.head}>
        <p className={styles.eyebrow}>Marcas</p>
        <h2 className={styles.titulo} id="marcas-titulo">
          As melhores marcas você encontra <em>aqui</em>.
        </h2>
      </div>

      <div className={`${styles.viewport} ${rolar ? styles.viewportRolando : ''}`}>
        <div className={`${styles.trilha} ${rolar ? styles.trilhaRolando : ''}`}>
          {trilha.map((marca, i) => {
            const copia = i >= MARCAS.length;
            return (
              <div
                key={`${marca.nome}-${i}`}
                className={styles.placa}
                aria-hidden={copia || undefined}
              >
                <img
                  className={styles.logo}
                  src={marca.src}
                  alt={copia ? '' : marca.nome}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
