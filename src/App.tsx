import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import MyFinds from './pages/MyFinds';
import AuthCallback from './pages/AuthCallback';
import DesignSoftPreview from './pages/DesignSoftPreview';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="design/soft" element={<DesignSoftPreview />} />
        <Route element={<Layout />}>
          <Route index element={<MyFinds />} />
          <Route path="auth/callback" element={<AuthCallback />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
