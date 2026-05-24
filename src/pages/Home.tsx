import { lazy, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useVisita } from '../hooks/useVisita';
import { useCartStore } from '../store/cart';
import { useAllCategories } from '../hooks/useAllCategories';
import RecuperacaoPopup from '../components/RecuperacaoPopup';
import AnnouncementBar from '../components/AnnouncementBar';
import HeroSection from '../components/HeroSection';
import Header from '../components/Header';
import ProductGrid from '../components/ProductGrid';
import CartDrawer from '../components/CartDrawer';
import ProductModal from '../components/ProductModal';
import FloatingWhatsApp from '../components/FloatingWhatsApp';
import AddedToCartToast from '../components/AddedToCartToast';
import Footer from '../components/Footer';
import HempSection from '../components/HempSection';

const CheckoutModal = lazy(() => import('../components/checkout/CheckoutModal'));

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);

  // Parse URL params synchronously so they're available on first render
  const urlParams = new URLSearchParams(globalThis.location.search);
  const [initialSearch] = useState(() => urlParams.get('q') ?? '');
  const [initialSubcat] = useState<string | null>(() => urlParams.get('sub'));

  useVisita();

  const cartItems = useCartStore((s) => s.items);

  useEffect(() => {
    const popupShown = sessionStorage.getItem('ag_popup_shown');
    if (popupShown) return;

    function maybeShow() {
      if (cartItems.length > 0) return;
      if (sessionStorage.getItem('ag_popup_shown')) return;
      sessionStorage.setItem('ag_popup_shown', '1');
      setPopupOpen(true);
    }

    const timer = setTimeout(maybeShow, 90_000);

    function handleExitIntent(e: MouseEvent) {
      if (e.clientY <= 0) maybeShow();
    }
    document.addEventListener('mouseleave', handleExitIntent);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleExitIntent);
    };
  }, [cartItems.length]);

  const { data: allCategorias = [] } = useAllCategories();

  useEffect(() => {
    if (initialSearch || initialSubcat || urlParams.get('cat')) {
      setTimeout(() => {
        document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    const catSlug = params.get('cat');
    if (catSlug && allCategorias.length > 0) {
      const match = allCategorias.find(
        (c) => c.slug === catSlug || c.nome.toLowerCase() === catSlug.toLowerCase()
      );
      if (match) setCategoryId(match.id);
    }
  }, [allCategorias]);

  const produtoIdParam = searchParams.get('p');
  const produtoId = produtoIdParam ? Number.parseInt(produtoIdParam, 10) : null;

  function closeProductModal() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('p');
      return next;
    });
  }

  return (
    <>
      <AnnouncementBar />
      <Header onOpenCart={() => setCartOpen(true)} />

      <HeroSection />

      <main id="main-content">
        <div className="section-head">
          <div>
            <div className="section-eyebrow">
              <span className="num">01</span> Vitrine
            </div>
            <h2 className="section-title">
              A vitrine, <em>refinada</em>.
            </h2>
          </div>
          <p className="section-sub">
            Da seda artesanal ao charuto raro. Cada peça selecionada com cuidado para quem busca qualidade.
          </p>
        </div>

        <ProductGrid
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          initialSearch={initialSearch}
          initialSubcat={initialSubcat}
        />
      </main>
      <HempSection />
      <Footer />

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onOpenCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      {checkoutOpen && (
        <Suspense fallback={null}>
          <CheckoutModal onClose={() => setCheckoutOpen(false)} />
        </Suspense>
      )}

      <ProductModal produtoId={produtoId} onClose={closeProductModal} />

      <FloatingWhatsApp />
      <AddedToCartToast onOpenCart={() => setCartOpen(true)} />

      {popupOpen && (
        <RecuperacaoPopup onClose={() => setPopupOpen(false)} />
      )}
    </>
  );
}
