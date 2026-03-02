import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import MyFinds from './pages/MyFinds';
import AuthCallback from './pages/AuthCallback';
import DesignSoftPreview from './pages/DesignSoftPreview';
import DesignSoftRetroPreview from './pages/DesignSoftRetroPreview';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="design/soft" element={<DesignSoftPreview />} />
        <Route path="design/soft-retro" element={<DesignSoftRetroPreview />} />
        <Route element={<Layout />}>
          <Route index element={<MyFinds />} />
          <Route path="auth/callback" element={<AuthCallback />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
