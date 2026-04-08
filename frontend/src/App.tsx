import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import NotificationProvider from './components/NotificationProvider';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingPage from './components/LoadingPage';
import LoginPage from './pages/LoginPage';

// Lazy-loaded pages — se cargan solo al navegar a cada ruta
const Dashboard          = lazy(() => import('./pages/Dashboard'));
const ProgramasPage      = lazy(() => import('./pages/Programas'));
const PlantillasPage     = lazy(() => import('./pages/Plantillas'));
const BeneficiariosPage  = lazy(() => import('./pages/Beneficiarios'));
const ArticulosPage      = lazy(() => import('./pages/Articulos'));
const StockPage          = lazy(() => import('./pages/Stock'));
const RemitosPage        = lazy(() => import('./pages/Remitos'));
const CronogramaPage     = lazy(() => import('./pages/Cronograma'));
const ReportesPage       = lazy(() => import('./pages/Reportes'));
const MapaPage           = lazy(() => import('./pages/Mapa'));
const UsuariosPage       = lazy(() => import('./pages/Usuarios'));
const DepositoHome       = lazy(() => import('./pages/DepositoHome'));
const HistorialEntregas  = lazy(() => import('./pages/HistorialEntregas'));
const Auditoria          = lazy(() => import('./pages/Auditoria'));
const Tareas             = lazy(() => import('./pages/Tareas'));
const MisCasos           = lazy(() => import('./pages/MisCasos'));
const CasosParticulares  = lazy(() => import('./pages/CasosParticulares'));
const BusquedaDNI        = lazy(() => import('./pages/BusquedaDNI'));
const ChoferHome         = lazy(() => import('./pages/ChoferHome'));
const NutricionistaHome  = lazy(() => import('./pages/NutricionistaHome'));

function HomeRedirect() {
  const { user } = useAuthStore();
  if (user == null) return null;
  if (user.rol === 'CHOFER') return <Navigate to="/mis-entregas" replace />;
  if (user.rol === 'NUTRICIONISTA') return <Navigate to="/nutricionista" replace />;
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
        <Suspense fallback={<LoadingPage />}>
          <Routes>
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
            <Route path="/mis-entregas" element={<ProtectedRoute seccion="mis-entregas"><ChoferHome /></ProtectedRoute>} />
            <Route path="/nutricionista" element={<ProtectedRoute seccion="nutricionista"><NutricionistaHome /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
