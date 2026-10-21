import { Navigate } from "react-router-dom";

export default function DashboardRedirectPage() {
  return <Navigate to="/home" replace />;
}
