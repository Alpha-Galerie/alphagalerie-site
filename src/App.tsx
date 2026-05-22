import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Home from './pages/Home';
import ProductPage from './pages/ProductPage';

const CheckoutSucesso = lazy(() => import('./pages/CheckoutSucesso'));
const CheckoutErro = lazy(() => import('./pages/CheckoutErro'));
const CheckoutPendente = lazy(() => import('./pages/CheckoutPendente'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/produto/:productSlug" element={<ProductPage />} />
            <Route path="/checkout/sucesso" element={<CheckoutSucesso />} />
            <Route path="/checkout/erro" element={<CheckoutErro />} />
            <Route path="/checkout/pendente" element={<CheckoutPendente />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
