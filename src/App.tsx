import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import MyFinds from './pages/MyFinds';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<MyFinds />} />
          <Route path="auth/callback" element={<MyFinds />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
