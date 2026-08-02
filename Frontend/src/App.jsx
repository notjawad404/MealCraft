import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Layout from './components/common/Layout';
import Home from './components/Home';
import AddRecipe from './components/AddRecipe';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/add" element={<AddRecipe />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
