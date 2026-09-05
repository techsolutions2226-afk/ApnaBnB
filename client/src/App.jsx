import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
import { AuthProvider } from "./context/AuthContext";
import { WishlistProvider } from "./context/WishlistContext";
import { BookingProvider } from "./context/BookingContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import RouteErrorBoundary from "./components/common/RouteErrorBoundary";

/* ── New Layouts ── */
import PublicLayout from "./components/layout/PublicLayout";
import DashboardLayout from "./components/layout/DashboardLayout";
import AuthLayout from "./components/layout/AuthLayout";

/* ── Pages ── */
import Home from "./pages/Home";
import PropertyDetail from "./pages/PropertyDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";
import VerifyTwoFactor from "./pages/VerifyTwoFactor";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import About from "./pages/About";
import Contact from "./pages/Contact";
import SearchResults from "./pages/SearchResults";
import Account from "./pages/Account";
import PersonalInfo from "./pages/PersonalInfo";
import Notifications from "./pages/Notifications";
import LoginSecurity from "./pages/LoginSecurity";
import PaymentsPayouts from "./pages/PaymentsPayouts";
import PrivacySharing from "./pages/PrivacySharing";
import GlobalPreferences from "./pages/GlobalPreferences";
import Profile from "./pages/Profile";
import Wishlists from "./pages/Wishlists";
import Trips from "./pages/Trips";
import Legal from "./pages/Legal";

/* ── Dashboard shell (sidebar + role selector) ── */
import DashboardShell from "./components/dashboard/DashboardShell";
import DashboardHome from "./pages/DashboardHome";

/* ── Listing management pages ── */
import CreateListing from "./pages/CreateListing";
import EditListing from "./pages/EditListing";
import ViewListing from "./pages/ViewListing";
import MyListings from "./pages/MyListings";

/* ── My Requirements ── */
import MyRequirements from "./pages/MyRequirements";

/* ── Requirements pages ── */
import PostRequirement from "./pages/PostRequirement";
import EditRequirement from "./pages/EditRequirement";
import ViewRequirement from "./pages/ViewRequirement";
import RequirementsBoard from "./pages/RequirementsBoard";

/* ── Matchmaking ── */
import Matches from "./pages/Matches";

/* ── Admin Panel ── */
import AdminShell from "./components/admin/AdminShell";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminUserDetail from "./pages/admin/AdminUserDetail";
import AdminListings from "./pages/admin/AdminListings";
import AdminRequirements from "./pages/admin/AdminRequirements";
import AdminMatches from "./pages/admin/AdminMatches";
import AdminVisits from "./pages/admin/AdminVisits";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminContact from "./pages/admin/AdminContact";
import AdminLogs from "./pages/admin/AdminLogs";

/* ── Subscription Plans ── */
import Plans from "./pages/Plans";
import VisitPlan from "./pages/VisitPlan";
import VisitStatus from "./pages/VisitStatus";

function App() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <BookingProvider>
          <BrowserRouter>
            <RouteErrorBoundary>
              <Routes>
                {/* ── Dashboard app shell ── */}
                <Route
                  element={
                    <ProtectedRoute>
                      <DashboardShell />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<DashboardHome />} />
                  <Route path="/dashboard/:role" element={<DashboardHome />} />

                  <Route path="/listing/new" element={<CreateListing />} />
                  <Route path="/listing/:id/edit" element={<EditListing />} />
                  <Route path="/listing/:id" element={<ViewListing />} />
                  <Route path="/my-listings" element={<MyListings />} />
                  <Route path="/my-requirements" element={<MyRequirements />} />

                  <Route path="/requirements/new" element={<PostRequirement />} />
                  <Route path="/requirements/:id/edit" element={<EditRequirement />} />
                  <Route path="/requirements/:id" element={<ViewRequirement />} />
                  <Route path="/requirements" element={<RequirementsBoard />} />

                  <Route path="/matches" element={<Matches />} />
                  <Route path="/wishlists" element={<Wishlists />} />
                  <Route path="/trips" element={<Trips />} />
                  <Route path="/visit/:propertyId" element={<VisitPlan />} />
                  <Route path="/visits/:tripId" element={<VisitStatus />} />
                  <Route path="/plans" element={<Plans />} />

                  <Route path="/account" element={<Account />} />
                  <Route path="/account/personal-info" element={<PersonalInfo />} />
                  <Route path="/account/notifications" element={<Notifications />} />
                  <Route path="/account/login-security" element={<LoginSecurity />} />
                  <Route path="/account/payments" element={<PaymentsPayouts />} />
                  <Route path="/account/privacy" element={<PrivacySharing />} />
                  <Route path="/account/preferences" element={<GlobalPreferences />} />
                </Route>

                {/* ── Public routes with layout ── */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/property/:id" element={<PropertyDetail />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/search" element={<SearchResults />} />
                  <Route path="/sale" element={<SearchResults />} />
                  <Route path="/rent" element={<SearchResults />} />
                  <Route path="/users/:id" element={<Profile />} />
                  <Route path="/legal/:slug" element={<Legal />} />
                </Route>

                {/* ── Admin panel ── */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <AdminShell />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminOverview />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="users/:id" element={<AdminUserDetail />} />
                  <Route path="listings" element={<AdminListings />} />
                  <Route path="requirements" element={<AdminRequirements />} />
                  <Route path="matches" element={<AdminMatches />} />
                  <Route path="visits" element={<AdminVisits />} />
                  <Route path="payments" element={<AdminPayments />} />
                  <Route path="plans" element={<AdminPlans />} />
                  <Route path="contact" element={<AdminContact />} />
                  <Route path="logs" element={<AdminLogs />} />
                  <Route path="account" element={<Account />} />
                  <Route path="account/personal-info" element={<PersonalInfo />} />
                  <Route path="account/notifications" element={<Notifications />} />
                  <Route path="account/login-security" element={<LoginSecurity />} />
                  <Route path="account/payments" element={<PaymentsPayouts />} />
                  <Route path="account/privacy" element={<PrivacySharing />} />
                  <Route path="account/preferences" element={<GlobalPreferences />} />
                </Route>

                {/* ── Auth pages with AuthLayout ── */}
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/login/verify" element={<VerifyTwoFactor />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                </Route>
              </Routes>
            </RouteErrorBoundary>
            <ToastContainer
              position="top-right"
              autoClose={4000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          </BrowserRouter>
        </BookingProvider>
      </WishlistProvider>
    </AuthProvider>
  );
}

export default App;
