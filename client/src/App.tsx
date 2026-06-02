import { Toaster } from "sonner";
import { Route, Switch } from "wouter";
import PwaInstallPrompt from "./components/PwaInstallPrompt";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminCustomers from "./pages/admin/Customers";
import AdminCustomerDetail from "./pages/admin/CustomerDetail";
import AdminProperties from "./pages/admin/Properties";
import AdminPropertyDetail from "./pages/admin/PropertyDetail";
import AdminInspection from "./pages/admin/Inspection";
import AdminUsers from "./pages/admin/Users";
import ClientDashboard from "./pages/client/Dashboard";
import ClientProperty from "./pages/client/Property";
import NotFound from "./pages/NotFound";
import Pricing from "./pages/Pricing";
import Onboarding from "./pages/Onboarding";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ClientOnboarding from "./pages/client/Onboarding";
import AIHuismeester from "./pages/client/AIHuismeester";

export default function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <PwaInstallPrompt />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/registreren" component={Register} />
        <Route path="/wachtwoord-vergeten" component={ForgotPassword} />
        <Route path="/wachtwoord-reset" component={ResetPassword} />
        <Route path="/abonnementen" component={Pricing} />
        <Route path="/welkom" component={Onboarding} />
        {/* Admin routes */}
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/customers" component={AdminCustomers} />
        <Route path="/admin/customers/:id" component={AdminCustomerDetail} />
        <Route path="/admin/properties" component={AdminProperties} />
        <Route path="/admin/properties/:id" component={AdminPropertyDetail} />
        <Route path="/admin/inspections/:id" component={AdminInspection} />
        <Route path="/admin/users" component={AdminUsers} />
        {/* Client routes */}
        <Route path="/mijn" component={ClientDashboard} />
        <Route path="/mijn/onboarding" component={ClientOnboarding} />
        <Route path="/mijn/woning/:id" component={ClientProperty} />
        <Route path="/mijn/woning/:propertyId/huismeester" component={AIHuismeester} />
        {/* Fallback */}
        <Route component={NotFound} />
      </Switch>
    </>
  );
}
