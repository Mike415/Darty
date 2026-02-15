import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import GameSetup from "./pages/GameSetup";
import X01Game from "./pages/X01Game";
import CricketGame from "./pages/CricketGame";
import Players from "./pages/Players";
import PlayerStats from "./pages/PlayerStats";

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/setup/:mode" component={GameSetup} />
      <Route path="/x01" component={X01Game} />
      <Route path="/cricket" component={CricketGame} />
      <Route path="/players" component={Players} />
      <Route path="/stats/:id" component={PlayerStats} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Use hash-based routing for file:// URLs (iOS WebView)
  const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';
  
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          {isFileProtocol ? (
            <WouterRouter hook={useHashLocation}>
              <AppRoutes />
            </WouterRouter>
          ) : (
            <AppRoutes />
          )}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
