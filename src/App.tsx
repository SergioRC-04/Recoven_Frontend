import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import WhatsAppButton from "./components/layout/WhatsAppButton";

function App() {
  return (
    <div className="min-h-screen bg-white text-gray-800">
      <Header />

      <main className="min-h-[70vh]">
        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900">Hola mundo</h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-600">
            Tu nueva app React + TypeScript ya tiene un layout base listo para crecer.
          </p>
        </section>
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}

export default App;
