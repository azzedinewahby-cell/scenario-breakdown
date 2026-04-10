import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import UploadPage from "./pages/UploadPage";
import HistoryPage from "./pages/HistoryPage";
import ScenarioDetail from "./pages/ScenarioDetail";
import DepouillementPage from "./pages/DepouillementPage";
import BudgetPage from "./pages/BudgetPage";
import DistributionPage from "./pages/DistributionPage";
import FinancementPage from "./pages/FinancementPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/upload" component={UploadPage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/scenario/:id" component={ScenarioDetail} />
      <Route path="/depouillement" component={DepouillementPage} />
      <Route path="/budget" component={BudgetPage} />
      <Route path="/distribution" component={DistributionPage} />
      <Route path="/financement" component={FinancementPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
