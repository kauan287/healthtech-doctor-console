import { Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import { DetailPage } from "./pages/DetailPage";
import { NewPrescriptionPage } from "./pages/NewPrescriptionPage";
import { QueuePage } from "./pages/QueuePage";

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<QueuePage />} />
        <Route path="/new" element={<NewPrescriptionPage />} />
        <Route path="/prescriptions/:threadId" element={<DetailPage />} />
        <Route path="*" element={<p className="text-slate-600">Página no encontrada.</p>} />
      </Routes>
    </Layout>
  );
}
