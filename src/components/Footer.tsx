import type { FC } from 'react';
import styles from './Footer.module.css';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER as string;

/** Endereço, telefone e horário publicados no site precisam bater exatamente
 *  com o perfil do Google. É esse cruzamento (NAP) que sustenta a busca
 *  local — antes o rodapé dizia "São Paulo — SP", contradizendo o perfil,
 *  que informa Barueri. */
const ENDERECO = 'Calçada Flôr de Lótus, 15 — Alphaville, Barueri/SP · 06453-000';
const LOCAL = 'Centro Comercial Alphaville';
const TELEFONE_EXIBIDO = '(11) 94292-0076';
const TELEFONE_LINK = '+5511942920076';
const MAPA = 'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent('Alpha Galerie, Calçada Flôr de Lótus, 15, Alphaville, Barueri, SP, 06453-000');
const CURRENT_YEAR = new Date().getFullYear();
const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? new Date().toISOString().slice(0, 10);

const Footer: FC = () => {
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
        </div>

        <nav aria-label="Links do rodapé">
          <p className={styles.colTitle}>Navegue</p>
          <ul className={styles.navList}>
            <li><a href="#produtos">Vitrine</a></li>
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
            <li>
              <a href={`tel:${TELEFONE_LINK}`}>{TELEFONE_EXIBIDO}</a>
            </li>
            <li>
              <a href="mailto:contato@alphagalerie.com.br">
                contato@alphagalerie.com.br
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className={styles.colTitle}>Onde estamos</p>
          <address className={styles.endereco}>
            <a href={MAPA} target="_blank" rel="noopener noreferrer">
              {LOCAL}
              <br />
              {ENDERECO}
            </a>
          </address>
          <p className={styles.colTitle} style={{ marginTop: '1.25rem' }}>Horário</p>
          <ul className={styles.contactList}>
            <li>Segunda a sábado · 11h às 21h</li>
            <li>Domingo · 14h às 19h</li>
          </ul>
        </div>
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
