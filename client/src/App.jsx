import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
import { AuthProvider } from "./context/AuthContext";
import { WishlistProvider } from "./context/WishlistContext";
import { BookingProvider } from "./context/BookingContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import Layout from "./components/layout/Layout";

/* ── Pages ── */
import Home from "./pages/Home";
import PropertyDetail from "./pages/PropertyDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Experiences from "./pages/Experiences";
import Services from "./pages/Services";
import SearchResults from "./pages/SearchResults";
import Account from "./pages/Account";
import PersonalInfo from "./pages/PersonalInfo";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Wishlists from "./pages/Wishlists";
import Trips from "./pages/Trips";

/* ── Dashboard shell (sidebar + role selector) ── */
import DashboardShell from "./components/dashboard/DashboardShell";
import DashboardHome from "./pages/DashboardHome";

/* ── Listing management pages (Step 4) ── */
import CreateListing from "./pages/CreateListing";
import EditListing from "./pages/EditListing";
import ViewListing from "./pages/ViewListing";
import MyListings from "./pages/MyListings";

/* ── Requirements pages (Step 5) ── */
import PostRequirement from "./pages/PostRequirement";
import EditRequirement from "./pages/EditRequirement";
import ViewRequirement from "./pages/ViewRequirement";
import RequirementsBoard from "./pages/RequirementsBoard";

/* ── Messaging (Step 7) ── */
import Messages from "./pages/Messages";

/* ── Matchmaking (Step 6) ── */
import Matches from "./pages/Matches";

/* ── Admin Panel (Step 8) ── */
import AdminDashboard from "./pages/AdminDashboard";

/* ── Subscription Plans (Step 10) ── */
import Plans from "./pages/Plans";

function App() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <BookingProvider>
          <BrowserRouter>
            <Routes>
                {/* ── Dashboard app shell (standalone — fixed sidebar, NO
                    navbar/footer). Presentational wrapper only; the outer
                    ProtectedRoute requires auth and each child keeps its OWN
                    role gate. The role selector switches the VIEW only. ── */}
                <Route
                  element={
                    <ProtectedRoute>
                      <DashboardShell />
                    </ProtectedRoute>
                  }
                >
                  {/* Dashboard home — body follows the selected view role;
                      /dashboard/:role keeps login redirects working. */}
                  <Route path="/dashboard" element={<DashboardHome />} />
                  <Route path="/dashboard/:role" element={<DashboardHome />} />

                  {/* Listing management — any authenticated user (auth via the
                      shell's outer ProtectedRoute). The acting role is recorded
                      on the property at create time. */}
                  <Route path="/listing/new" element={<CreateListing />} />
                  <Route path="/listing/:id/edit" element={<EditListing />} />
                  <Route path="/listing/:id" element={<ViewListing />} />
                  <Route path="/my-listings" element={<MyListings />} />

                  {/* Requirements — any authenticated user. The acting role is
                      recorded on the requirement at create time. */}
                  <Route path="/requirements/new" element={<PostRequirement />} />
                  <Route path="/requirements/:id/edit" element={<EditRequirement />} />
                  <Route path="/requirements/:id" element={<ViewRequirement />} />
                  <Route path="/requirements" element={<RequirementsBoard />} />

                  {/* Matches, Messages, Wishlists, Trips (all authenticated
                      — auth enforced by the shell's outer ProtectedRoute) */}
                  <Route path="/matches" element={<Matches />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/wishlists" element={<Wishlists />} />
                  <Route path="/trips" element={<Trips />} />

                  {/* Account pages — rendered inside the shell (sidebar + content) */}
                  <Route path="/account" element={<Account />} />
                  <Route path="/account/personal-info" element={<PersonalInfo />} />
                  <Route path="/account/notifications" element={<Notifications />} />
                </Route>

                {/* ── Public routes with layout (navbar + footer) ── */}
                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/property/:id" element={<PropertyDetail />} />
                  <Route path="/experiences" element={<Experiences />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/search" element={<SearchResults />} />
                  {/* Clean URLs for the For Sale / For Rent landing cards.
                      SearchResults reads `purpose` from the URL pathname. */}
                  <Route path="/sale" element={<SearchResults />} />
                  <Route path="/rent" element={<SearchResults />} />
                  <Route path="/plans" element={<Plans />} />
                  <Route path="/users/:id" element={<Profile />} />

                  {/* ── Admin ── */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute roles={["admin"]}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* ── Auth pages (no layout — standalone) ── */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
            </Routes>
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
