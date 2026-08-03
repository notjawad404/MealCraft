import { BrowserRouter, Routes, Route } from 'react-router-dom';

import AuthProvider from './context/AuthProvider';
import Layout from './components/common/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import GuestRoute from './components/common/GuestRoute';
import Home from './components/Home';
import Recipes from './components/Recipes';
import RecipeDetail from './components/RecipeDetail';
import MyRecipes from './components/MyRecipes';
import AddRecipe from './components/AddRecipe';
import EditRecipe from './components/EditRecipe';
import Login from './components/auth/Login';
import Register from './components/auth/Register';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/recipes" element={<Recipes />} />
            {/* Open to everyone: the API is what keeps a private recipe out of
                a stranger's hands, not the routing. */}
            <Route path="/recipes/:id" element={<RecipeDetail />} />

            {/* Signed-in users get bounced back out of these. */}
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            {/* Guests are sent to /login and returned here afterwards. */}
            <Route element={<ProtectedRoute />}>
              <Route path="/add" element={<AddRecipe />} />
              <Route path="/my-recipes" element={<MyRecipes />} />
              <Route path="/recipes/:id/edit" element={<EditRecipe />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
