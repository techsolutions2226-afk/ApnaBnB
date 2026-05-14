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

/* ── Dashboards ── */
import SellerDashboard from "./pages/SellerDashboard";
import BuyerDashboard from "./pages/BuyerDashboard";
import DealerDashboard from "./pages/DealerDashboard";

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
                {/* ── Public routes with layout (navbar + footer) ── */}
                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/property/:id" element={<PropertyDetail />} />
                  <Route path="/experiences" element={<Experiences />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/search" element={<SearchResults />} />
                  <Route path="/plans" element={<Plans />} />
                  <Route path="/users/:id" element={<Profile />} />

                  {/* ── Auth-protected routes with layout ── */}
                  <Route
                    path="/account"
                    element={
                      <ProtectedRoute>
                        <Account />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/account/personal-info"
                    element={
                      <ProtectedRoute>
                        <PersonalInfo />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/account/notifications"
                    element={
                      <ProtectedRoute>
                        <Notifications />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/wishlists"
                    element={
                      <ProtectedRoute>
                        <Wishlists />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/trips"
                    element={
                      <ProtectedRoute>
                        <Trips />
                      </ProtectedRoute>
                    }
                  />

                  {/* ── Role-based dashboards ── */}
                  <Route
                    path="/dashboard/seller"
                    element={
                      <ProtectedRoute roles={["seller"]}>
                        <SellerDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/buyer"
                    element={
                      <ProtectedRoute roles={["buyer"]}>
                        <BuyerDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/dealer"
                    element={
                      <ProtectedRoute roles={["dealer"]}>
                        <DealerDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* ── Listing management (sellers + dealers) ── */}
                  <Route
                    path="/listing/new"
                    element={
                      <ProtectedRoute roles={["seller", "dealer"]}>
                        <CreateListing />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/listing/:id/edit"
                    element={
                      <ProtectedRoute roles={["seller", "dealer"]}>
                        <EditListing />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/listing/:id"
                    element={
                      <ProtectedRoute roles={["seller", "dealer"]}>
                        <ViewListing />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/my-listings"
                    element={
                      <ProtectedRoute roles={["seller", "dealer"]}>
                        <MyListings />
                      </ProtectedRoute>
                    }
                  />

                  {/* ── Requirements (buyers + dealers) ── */}
                  <Route
                    path="/requirements/new"
                    element={
                      <ProtectedRoute roles={["buyer", "dealer"]}>
                        <PostRequirement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/requirements/:id"
                    element={
                      <ProtectedRoute roles={["buyer", "dealer"]}>
                        <ViewRequirement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/requirements/:id/edit"
                    element={
                      <ProtectedRoute roles={["buyer", "dealer"]}>
                        <EditRequirement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/requirements"
                    element={
                      <ProtectedRoute roles={["dealer"]}>
                        <RequirementsBoard />
                      </ProtectedRoute>
                    }
                  />

                  {/* ── Matches & Messages (all authenticated) ── */}
                  <Route
                    path="/matches"
                    element={
                      <ProtectedRoute>
                        <Matches />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/messages"
                    element={
                      <ProtectedRoute>
                        <Messages />
                      </ProtectedRoute>
                    }
                  />

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
