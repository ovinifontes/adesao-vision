import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import VendasPage from "./pages/VendasPage";
import ParcelasPage from "./pages/ParcelasPage";
import VendedoresPage from "./pages/VendedoresPage";
import VisaoGeralPage from "./pages/VisaoGeralPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/vendas" element={<VendasPage />} />
          <Route path="/parcelas" element={<ParcelasPage />} />
          <Route path="/vendedores" element={<VendedoresPage />} />
          <Route path="/visao-geral" element={<VisaoGeralPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
