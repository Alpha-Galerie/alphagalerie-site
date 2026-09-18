import type { FC } from 'react';

interface Props {
  className?: string;
  size?: number;
}

/** Marca do Instagram desenhada com o traço dos demais ícones do site
 *  (mesma espessura e mesmos cantos do ícone de carrinho). */
const InstagramIcon: FC<Props> = ({ className, size = 20 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.6" cy="6.4" r="1.15" fill="currentColor" stroke="none" />
  </svg>
);

export default InstagramIcon;
