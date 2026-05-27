import { Switch, Route, Router as WouterRouter } from "wouter";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import ChatPage from "@/pages/chat";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/chat" component={ChatPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Router />
    </WouterRouter>
  );
}

export default App;
