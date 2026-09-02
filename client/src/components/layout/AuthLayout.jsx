import { Outlet } from "react-router-dom";

/* Auth pages render their own full-page layouts (e.g. the two-panel split on
   Login), so this layout is just a passthrough shell. */
export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-white">
      <Outlet />
    </div>
  );
}
