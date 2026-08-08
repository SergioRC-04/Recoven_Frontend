import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import WhatsAppButton from "./components/layout/WhatsAppButton";
import Home from "./pages/Home";
import Empresa from "./pages/Empresa";
import Servicios from "./pages/Servicios";
import { Route, Routes } from "react-router-dom";
import ScrollToHash from "./components/ScrollToHash";
import Login from "./pages/Login";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <div className="min-h-screen bg-white text-gray-800">
      <ScrollToHash />
      <Routes>
        {/* Rutas públicas */}
        <Route
          path="/"
          element={
            <>
              <Header />
              <Home />
              <Footer />
              <WhatsAppButton />
            </>
          }
        />
        <Route
          path="/empresa"
          element={
            <>
              <Header />
              <Empresa />
              <Footer />
              <WhatsAppButton />
            </>
          }
        />
        <Route
          path="/servicios"
          element={
            <>
              <Header />
              <Servicios />
              <Footer />
              <WhatsAppButton />
            </>
          }
        />
        {/* Ruta de login sin layout */}
        <Route path="/login" element={<Login />} />
        {/* Ruta protegida del dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
