import { BrowserRouter, Routes, Route } from 'react-router-dom';

import AuthProvider from './context/AuthProvider';
import Layout from './components/common/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import GuestRoute from './components/common/GuestRoute';
import Home from './components/Home';
import AddRecipe from './components/AddRecipe';
import Login from './components/auth/Login';
import Register from './components/auth/Register';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />

            {/* Signed-in users get bounced back out of these. */}
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            {/* Guests are sent to /login and returned here afterwards. */}
            <Route element={<ProtectedRoute />}>
              <Route path="/add" element={<AddRecipe />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
