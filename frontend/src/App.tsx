import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import NotificationProvider from './components/NotificationProvider';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProgramasPage from './pages/Programas';
import BeneficiariosPage from './pages/Beneficiarios';
import ArticulosPage from './pages/Articulos';
import StockPage from './pages/Stock';
import RemitosPage from './pages/Remitos';
import CronogramaPage from './pages/Cronograma';
import ReportesPage from './pages/Reportes';
import MapaPage from './pages/Mapa';

function App() {
  const { token } = useAuthStore();

  if (!token) {
    return <LoginPage />;
  }

  return (
    <>
      <NotificationProvider />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/programas" element={<ProgramasPage />} />
          <Route path="/beneficiarios" element={<BeneficiariosPage />} />
          <Route path="/articulos" element={<ArticulosPage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/remitos" element={<RemitosPage />} />
          <Route path="/cronograma" element={<CronogramaPage />} />
          <Route path="/mapa" element={<MapaPage />} />
          <Route path="/reportes" element={<ReportesPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </>
  );
}

export default App;
