import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { DataProvider, useData } from './data/store';
import GalleryPage from './pages/GalleryPage';
import GarmentPage from './pages/GarmentPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import { NotFound } from './pages/shared';
import { Splash } from './ui/Splash';
import { ToastProvider } from './ui/Toast';
import { TopBar } from './ui/TopBar';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<SignedIn />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              {/* Old id-based links; they redirect to the readable address. */}
              <Route path="/p/:profileSlug" element={<ProfilePage />} />
              <Route path="/p/:profileSlug/g/:garmentSlug" element={<GarmentPage />} />
              <Route path="/:profileSlug" element={<ProfilePage />} />
              <Route path="/:profileSlug/:garmentSlug" element={<GarmentPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

/** Everything behind sign-in: loads the data once and shows the top bar. */
function SignedIn() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'checking') return <><TopBar /><main className="wrap"><Splash /></main></>;
  if (status === 'signed-out') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return (
    <DataProvider>
      <TopBar />
      <ScrollToTop />
      <main className="wrap"><DataGate><Outlet /></DataGate></main>
    </DataProvider>
  );
}

function DataGate({ children }: { children: ReactNode }) {
  const data = useData();
  if (data.status === 'loading') return <Splash text="Loading your profiles…" />;
  if (data.status === 'error') {
    return (
      <div className="empty">
        <p className="empty-title">Couldn’t load your data</p>
        <p>{data.error}</p>
        <button type="button" className="btn primary" onClick={data.reload}>Try again</button>
      </div>
    );
  }
  return children;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
