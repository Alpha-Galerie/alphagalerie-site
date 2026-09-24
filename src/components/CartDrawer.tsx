import { useEffect, useRef } from 'react';
import { useCartStore } from '../store/cart';
import { formatCurrency } from '../lib/format';
import { formatarPontos, pontosGanhos, valorDosPontos } from '../lib/clube';
import { useClubeRegras } from '../hooks/useClube';
import Sugestoes from './Sugestoes';
import styles from './CartDrawer.module.css';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCheckout: () => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export default function CartDrawer({ isOpen, onClose, onOpenCheckout }: CartDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const changeQty = useCartStore((s) => s.changeQty);
  const selectTotal = useCartStore((s) => s.selectTotal);
  const addItem = useCartStore((s) => s.addItem);

  const total = selectTotal();
  const clube = useClubeRegras();
  const pontos = clube?.ativo ? pontosGanhos(total, clube) : 0;

  useEffect(() => {
    if (!isOpen) return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    const focusables = Array.from(drawer.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusables.length) focusables[0].focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab') {
        if (!focusables.length) { e.preventDefault(); return; }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`${styles.overlay}${isOpen ? ` ${styles.open}` : ''}`}
        onPointerDown={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        ref={drawerRef}
        id="cartDrawer"
        role="dialog"
        aria-modal="true"
        aria-label="Carrinho de compras"
        className={`${styles.drawer}${isOpen ? ` ${styles.open}` : ''}`}
      >
        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>
            Seu <em>carrinho</em>
          </h3>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className={styles.closeBtn}
          >
            ×
          </button>
        </div>

        {/* Items */}
        <div className={styles.items} id="cartItems">
          {items.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>Seu carrinho está vazio</p>
              <span className={styles.emptyMono}>Adicione produtos para continuar</span>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.cartKey} className={styles.item}>
                {/* Imagem */}
                <div className={styles.itemImg}>
                  {item.imagem ? (
                    <img
                      src={item.imagem}
                      alt={item.nome}
                      className={styles.itemImgEl}
                      width={70}
                      height={70}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <svg className={styles.itemImgSvg} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="20" y="30" width="60" height="50" rx="2" />
                      <circle cx="35" cy="45" r="4" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div className={styles.itemInfo}>
                  <div>
                    <div className={styles.itemCat}>
                      {item.categoria}{item.marca ? ` · ${item.marca}` : ''}
                    </div>
                    <div className={styles.itemName}>
                      {item.nome}
                      {item.variacao && (
                        <span className={styles.itemVariacao}>{item.variacao}</span>
                      )}
                    </div>
                  </div>

                  {/* Bottom: qty | preço + remover */}
                  <div className={styles.itemBottom}>
                    <div className={styles.qtyControl}>
                      <button
                        type="button"
                        className={styles.qtyBtn}
                        aria-label={`Diminuir quantidade de ${item.nome}`}
                        onClick={() => changeQty(item.cartKey, -1)}
                      >
                        −
                      </button>
                      <span className={styles.qtySpan} aria-live="polite">
                        {item.qtd}
                      </span>
                      <button
                        type="button"
                        className={styles.qtyBtn}
                        aria-label={`Aumentar quantidade de ${item.nome}`}
                        onClick={() => changeQty(item.cartKey, +1)}
                      >
                        +
                      </button>
                    </div>

                    <div className={styles.itemRight}>
                      <span className={styles.itemPrice}>
                        {formatCurrency(item.preco * item.qtd)}
                      </span>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        aria-label={`Remover ${item.nome} do carrinho`}
                        onClick={() => removeItem(item.cartKey)}
                      >
                        REMOVER
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {isOpen && items.length > 0 && (
            <Sugestoes itens={items} onAdd={(produto) => addItem(produto)} />
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className={styles.footer} id="cartFooter">
            <div className={styles.totalRow}>
              <span>Subtotal</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className={styles.totalFinal}>
              <span className={styles.totalLabel}>Total</span>
              <span className={styles.totalValue}>{formatCurrency(total)}</span>
            </div>
            {clube?.ativo && pontos > 0 && (
              <p className={styles.cashback}>
                Esta compra rende <strong>{formatarPontos(pontos)}</strong> no {clube.nome}
                {' '}({formatCurrency(valorDosPontos(pontos, clube))} para a próxima)
              </p>
            )}
            <button
              type="button"
              className={styles.checkoutBtn}
              onClick={() => { onClose(); onOpenCheckout(); }}
              disabled={items.length === 0}
            >
              Finalizar pedido →
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
