import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import WhatsAppButton from "./components/layout/WhatsAppButton";
import Home from "./pages/Home";
import Empresa from "./pages/Empresa";
import Servicios from "./pages/Servicios";
import { Route, Routes } from "react-router-dom";

function App() {
  return (
    <div className="min-h-screen bg-white text-gray-800">
      <Header />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/empresa" element={<Empresa />} />
        <Route path="/servicios" element={<Servicios />} />
        {/* Ruta 404 opcional */}
        <Route path="*" element={<Home />} />
      </Routes>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}

export default App;
