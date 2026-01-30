import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Dashboard from "./pages/dashboard/Dashboard";
import Activities from "./pages/dashboard/Activities";
import NewActivity from "./pages/dashboard/NewActivity";
import ActivityDetail from "./pages/dashboard/ActivityDetail";
import ProfileSettings from "./pages/settings/ProfileSettings";
import BillingSettings from "./pages/settings/BillingSettings";
import GitSettings from "./pages/settings/GitSettings";
import DeploySettings from "./pages/settings/DeploySettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/signup" element={<Signup />} />
            
            {/* Protected Dashboard Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/activities" element={<ProtectedRoute><Activities /></ProtectedRoute>} />
            <Route path="/dashboard/activities/new" element={<ProtectedRoute><NewActivity /></ProtectedRoute>} />
            <Route path="/dashboard/activities/:id" element={<ProtectedRoute><ActivityDetail /></ProtectedRoute>} />
            
            {/* Protected Settings Routes */}
            <Route path="/dashboard/settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
            <Route path="/dashboard/settings/billing" element={<ProtectedRoute><BillingSettings /></ProtectedRoute>} />
            <Route path="/dashboard/git" element={<ProtectedRoute><GitSettings /></ProtectedRoute>} />
            <Route path="/dashboard/settings/deploy" element={<ProtectedRoute><DeploySettings /></ProtectedRoute>} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
