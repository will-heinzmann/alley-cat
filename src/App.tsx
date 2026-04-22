import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Feed from "./pages/Feed";
import Index from "./pages/Index";
import AlleyDetail from "./pages/AlleyDetail";
import CityPage from "./pages/CityPage";
import ScoreLog from "./pages/ScoreLog";
import Leaderboard from "./pages/Leaderboard";
import BowlerProfile from "./pages/BowlerProfile";
import AuthPage from "./pages/AuthPage";
import AlleyUpdates from "./pages/AlleyUpdates";
import LeagueNight from "./pages/LeagueNight";
import Leagues from "./pages/Leagues";
import LeagueDetail from "./pages/LeagueDetail";
import BlogIndex from "./pages/BlogIndex";
import BlogPost from "./pages/BlogPost";
import BowlingScoreCalculator from "./pages/BowlingScoreCalculator";
import NotFound from "./pages/NotFound";
import BottomNav from "./components/BottomNav";
import Header from "./components/Header";
import QuickAddFab from "./components/QuickAddFab";

// Routes include /tools/bowling-score-calculator
const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Header />
          <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/alleys" element={<Index />} />
            <Route path="/alley/:slug" element={<AlleyDetail />} />
            <Route path="/city/:citySlug" element={<CityPage />} />
            <Route path="/log" element={<ScoreLog />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/bowler/:userId" element={<BowlerProfile />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/league" element={<LeagueNight />} />
            <Route path="/leagues" element={<Leagues />} />
            <Route path="/leagues/:id" element={<LeagueDetail />} />
            <Route path="/admin/alley-updates" element={<AlleyUpdates />} />
            <Route path="/blog" element={<BlogIndex />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/tools/bowling-score-calculator" element={<BowlingScoreCalculator />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <QuickAddFab />
          <BottomNav />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;

-
