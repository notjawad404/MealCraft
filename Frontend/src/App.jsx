import { BrowserRouter, Routes, Route } from 'react-router-dom';

import AuthProvider from './context/AuthProvider';
import LikesProvider from './context/LikesProvider';
import Layout from './components/common/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import GuestRoute from './components/common/GuestRoute';
import Home from './components/Home';
import Recipes from './components/Recipes';
import RecipeDetail from './components/RecipeDetail';
import MyRecipes from './components/MyRecipes';
import LikedRecipes from './components/LikedRecipes';
import AddRecipe from './components/AddRecipe';
import EditRecipe from './components/EditRecipe';
import Profile from './components/Profile';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import CookbookList from './components/cookbooks/CookbookList';
import CreateCookbook from './components/cookbooks/CreateCookbook';
import CookbookDetail from './components/cookbooks/CookbookDetail';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LikesProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/recipes" element={<Recipes />} />
              {/* Open to everyone; the API gates private recipes. */}
              <Route path="/recipes/:id" element={<RecipeDetail />} />

              {/* Cookbooks public routes */}
              <Route path="/cookbooks" element={<CookbookList />} />
              <Route path="/cookbooks/:id" element={<CookbookDetail />} />

              {/* Signed-in users are bounced out of these. */}
              <Route element={<GuestRoute />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Route>

              {/* Guests are sent to /login and returned afterwards. */}
              <Route element={<ProtectedRoute />}>
                <Route path="/add" element={<AddRecipe />} />
                <Route path="/my-recipes" element={<MyRecipes />} />
                <Route path="/liked" element={<LikedRecipes />} />
                <Route path="/recipes/:id/edit" element={<EditRecipe />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/cookbooks/create" element={<CreateCookbook />} />
                <Route path="/cookbooks/:id/edit" element={<CreateCookbook />} />
              </Route>
            </Route>
          </Routes>
        </LikesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

