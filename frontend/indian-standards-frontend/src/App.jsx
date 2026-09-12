import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { TenderProvider } from './context/TenderContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { SearchProvider } from './context/SearchContext';
import { AuditProvider } from './context/AuditContext';
import { TopNav } from './components/layout/TopNav';
import { AttributionBanner } from './components/layout/AttributionBanner';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/tender/CartDrawer';
import { RecommendPage } from './pages/RecommendPage';
import { StandardDetailPage } from './pages/StandardDetailPage';
import { TenderBuilderPage } from './pages/TenderBuilderPage';
import { LabsPage } from './pages/LabsPage';
import { AuditPage } from './pages/AuditPage';
import { NotFoundPage } from './pages/NotFoundPage';
import './App.layout.css';

function AppShell() {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <div className="app-shell">
      <TopNav onOpenCart={() => setCartOpen(true)} />
      <AttributionBanner />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/recommend" replace />} />
          <Route path="/recommend" element={<RecommendPage />} />
          <Route path="/standard/:standardNumber" element={<StandardDetailPage />} />
          <Route path="/tender" element={<TenderBuilderPage />} />
          <Route path="/labs" element={<LabsPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <SearchProvider>
          <AuditProvider>
            <TenderProvider>
              <BrowserRouter>
                <AppShell />
              </BrowserRouter>
            </TenderProvider>
          </AuditProvider>
        </SearchProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
