import type { FC } from 'react';
import InstagramIcon from './InstagramIcon';
import {
  useLoja,
  telefoneLink,
  instagramUrl,
  horarios,
} from '../hooks/useLoja';
import styles from './Footer.module.css';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER as string;

const CURRENT_YEAR = new Date().getFullYear();
const APP_VERSION = __BUILD_ID__;

interface FooterProps {
  /** Esconde endereço e horário da loja física: páginas de venda 100% online
   *  (ex.: /kit) não levam o cliente para a loja. */
  semEndereco?: boolean;
}

const Footer: FC<FooterProps> = ({ semEndereco = false }) => {
  // Endereço, telefone, horário e Instagram vêm da retaguarda. Precisam bater
  // exatamente com o perfil do Google: é esse cruzamento (NAP) que sustenta a
  // busca local, e antes o rodapé dizia "São Paulo — SP" enquanto o perfil
  // dizia Barueri.
  const loja = useLoja();
  const instagram = instagramUrl(loja.instagram);
  const telLink = telefoneLink(loja.telefone);

  return (
    <footer className={styles.footer}>
      <div className={styles.grid}>
        <div>
          <a href="/" className={styles.brandName} aria-label="Alpha Galerie — página inicial">
            <span className={styles.brandMark} aria-hidden="true" />
            <span>alpha.galerie</span>
          </a>
          <p className={styles.brandDesc}>
            Curadoria de produtos exclusivos com identidade única. Arte,
            moda e lifestyle em um só lugar.
          </p>

          {instagram && (
            <a
              className={styles.instaCard}
              href={instagram}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className={styles.instaGlyph} aria-hidden="true">
                <InstagramIcon size={22} />
              </span>
              <span className={styles.instaTexto}>
                <span className={styles.instaCta}>Siga a gente no Instagram</span>
                <span className={styles.instaArroba}>@{loja.instagram}</span>
              </span>
              <span className={styles.instaSeta} aria-hidden="true">→</span>
            </a>
          )}
        </div>

        <nav aria-label="Links do rodapé">
          <p className={styles.colTitle}>Navegue</p>
          <ul className={styles.navList}>
            <li><a href="#produtos">Vitrine</a></li>
            <li><a href="/alpha-club">Alpha Club</a></li>
            <li><a href="#sobre">Sobre</a></li>
            <li>
              <a href="https://alphahempbrasil.com" target="_blank" rel="noopener noreferrer">
                Hemp Brasil
              </a>
            </li>
          </ul>
        </nav>

        <div>
          <p className={styles.colTitle}>Contato</p>
          <ul className={styles.contactList}>
            <li>
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </li>
            {instagram && (
              <li>
                <a className={styles.instaInline} href={instagram} target="_blank" rel="noopener noreferrer">
                  <InstagramIcon size={15} />
                  <span>@{loja.instagram}</span>
                </a>
              </li>
            )}
            {loja.telefone && (
              <li>
                {telLink ? <a href={`tel:${telLink}`}>{loja.telefone}</a> : loja.telefone}
              </li>
            )}
            {loja.email && (
              <li>
                <a href={`mailto:${loja.email}`}>{loja.email}</a>
              </li>
            )}
          </ul>
        </div>

        {!semEndereco && (
        <div>
          <p className={styles.colTitle}>Onde estamos</p>
          <address className={styles.endereco}>
            Alphaville · Barueri, SP
            <br />
            <span className={styles.semRetirada}>Atendimento online, com entrega na região. Sem retirada no local.</span>
          </address>
          {/* Mapa só da região (sem endereço): mostra que a loja é de Alphaville. */}
          <iframe
            className={styles.mapa}
            title="Mapa de Alphaville, Barueri"
            src="https://www.google.com/maps?q=Alphaville,+Barueri+-+SP&z=13&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <p className={styles.colTitle} style={{ marginTop: '1.25rem' }}>Horário de atendimento</p>
          <ul className={styles.contactList}>
            {horarios(loja).map((h) => (
              <li key={h.dias}>{h.dias} · {h.horas}</li>
            ))}
          </ul>
        </div>
        )}
      </div>

      <div className={styles.copyright}>
        <p>
          &copy; {CURRENT_YEAR} Alpha Galerie · Todos os direitos reservados
          <span className={styles.version}>v{APP_VERSION}</span>
        </p>
        <p className={styles.warning}>⚠ Produtos destinados a maiores de 18 anos</p>
      </div>
    </footer>
  );
};

export default Footer;
