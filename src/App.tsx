import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import NotFound from "./pages/NotFound.tsx";
import AppLayout from "./pages/layout/AppLayout.tsx";
import Feed from "./pages/feed/page.tsx";
import Admin from "./pages/admin/page.tsx";
import Trends from "./pages/trends/page.tsx";
import SearchPage from "./pages/search/page.tsx";
import UnifiedFeed from "./pages/unified/page.tsx";

export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<Trends />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/unified" element={<UnifiedFeed />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
