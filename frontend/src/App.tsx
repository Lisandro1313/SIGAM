import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import NotificationProvider from './components/NotificationProvider';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProgramasPage from './pages/Programas';
import PlantillasPage from './pages/Plantillas';
import BeneficiariosPage from './pages/Beneficiarios';
import ArticulosPage from './pages/Articulos';
import StockPage from './pages/Stock';
import RemitosPage from './pages/Remitos';
import CronogramaPage from './pages/Cronograma';
import ReportesPage from './pages/Reportes';
import MapaPage from './pages/Mapa';
import UsuariosPage from './pages/Usuarios';
import DepositoHome from './pages/DepositoHome';
import HistorialEntregas from './pages/HistorialEntregas';
import Auditoria from './pages/Auditoria';
import Tareas from './pages/Tareas';
import MisCasos from './pages/MisCasos';
import CasosParticulares from './pages/CasosParticulares';
import BusquedaDNI from './pages/BusquedaDNI';

function HomeRedirect() {
  const { user } = useAuthStore();
  // Esperamos a que el store se hidrate antes de decidir a dónde ir
  if (user == null) return null;
  if (user.depositoId != null) return <Navigate to="/deposito" replace />;
  if (user.rol === 'TRABAJADORA_SOCIAL') return <Navigate to="/mis-casos" replace />;
  return <ProtectedRoute seccion="dashboard"><Dashboard /></ProtectedRoute>;
}

function App() {
  const { token } = useAuthStore();

  if (!token) {
    return <LoginPage />;
  }

  return (
    <ErrorBoundary>
      <NotificationProvider />
      <Layout>
        <Routes>
          {/* Home: usuario de depósito ve sus remitos del día, el resto ve el dashboard */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/deposito" element={<DepositoHome />} />
          <Route path="/programas" element={<ProtectedRoute seccion="programas"><ProgramasPage /></ProtectedRoute>} />
          <Route path="/plantillas" element={<ProtectedRoute seccion="plantillas"><PlantillasPage /></ProtectedRoute>} />
          <Route path="/beneficiarios" element={<ProtectedRoute seccion="beneficiarios"><BeneficiariosPage /></ProtectedRoute>} />
          <Route path="/articulos" element={<ProtectedRoute seccion="articulos"><ArticulosPage /></ProtectedRoute>} />
          <Route path="/stock" element={<ProtectedRoute seccion="stock"><StockPage /></ProtectedRoute>} />
          <Route path="/remitos" element={<ProtectedRoute seccion="remitos"><RemitosPage /></ProtectedRoute>} />
          <Route path="/cronograma" element={<ProtectedRoute seccion="cronograma"><CronogramaPage /></ProtectedRoute>} />
          <Route path="/mapa" element={<ProtectedRoute seccion="mapa"><MapaPage /></ProtectedRoute>} />
          <Route path="/reportes" element={<ProtectedRoute seccion="reportes"><ReportesPage /></ProtectedRoute>} />
          <Route path="/usuarios" element={<ProtectedRoute seccion="usuarios"><UsuariosPage /></ProtectedRoute>} />
          <Route path="/historial-entregas" element={<ProtectedRoute seccion="historial-entregas"><HistorialEntregas /></ProtectedRoute>} />
          <Route path="/tareas" element={<ProtectedRoute seccion="tareas"><Tareas /></ProtectedRoute>} />
          <Route path="/auditoria" element={<ProtectedRoute seccion="auditoria"><Auditoria /></ProtectedRoute>} />
          <Route path="/mis-casos" element={<ProtectedRoute seccion="mis-casos"><MisCasos /></ProtectedRoute>} />
          <Route path="/casos-particulares" element={<ProtectedRoute seccion="casos-particulares"><CasosParticulares /></ProtectedRoute>} />
          <Route path="/busqueda-dni" element={<ProtectedRoute seccion="busqueda-dni"><BusquedaDNI /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
