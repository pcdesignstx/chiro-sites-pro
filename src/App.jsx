import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MainLayout from './components/MainLayout';
import AdminLayout from './components/AdminLayout';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import About from './pages/About';
import Blog from './pages/Blog';
import WebsiteIdentity from './pages/WebsiteIdentity';
import WebsiteDesign from './pages/WebsiteDesign';
import DiscoveryCall from './components/elements/DiscoveryCall';
import LeadGenerator from './components/elements/LeadGenerator';
import FAQ from './components/elements/FAQ';
import PromoBar from './components/elements/PromoBar';
import Images from './components/elements/Images';
import Contact from './pages/Contact';
import LandingPages from './pages/LandingPages';
import Services from './pages/Services';
import Login from './pages/Login';
import CreateAdmin from './pages/CreateAdmin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSettings from './pages/admin/AdminSettings';
import Clients from './pages/admin/Clients';
import Organizations from './pages/admin/Organizations';
import AdminUsers from './pages/admin/AdminUsers';
import ClientRequests from './pages/admin/ClientRequests';
import ContentExport from './components/admin/ContentExport';
import { FormDataProvider } from './contexts/FormDataContext';
import { AuthProvider } from './contexts/AuthContext';
import RequestDetails from './pages/RequestDetails';
import PrivateRoute from './components/PrivateRoute';

export default function App() {
  return (
    <AuthProvider>
      <FormDataProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/create-admin" element={<CreateAdmin />} />

            {/* Client Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/login" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="home" element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="blog" element={<Blog />} />
              <Route path="website-identity" element={<WebsiteIdentity />} />
              <Route path="website-design" element={<WebsiteDesign />} />
              <Route path="discovery-call" element={<DiscoveryCall />} />
              <Route path="lead-generator" element={<LeadGenerator />} />
              <Route path="faq" element={<FAQ />} />
              <Route path="promo-bar" element={<PromoBar />} />
              <Route path="images" element={<Images />} />
              <Route path="contact" element={<Contact />} />
              <Route path="landing-pages" element={<LandingPages />} />
              <Route path="services" element={<Services />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="clients" element={<Clients />} />
              <Route path="requests" element={<ClientRequests />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="content-export" element={<ContentExport />} />
            </Route>

            <Route
              path="/request/:requestId"
              element={
                <PrivateRoute>
                  <RequestDetails />
                </PrivateRoute>
              }
            />
          </Routes>
          <ToastContainer />
        </Router>
      </FormDataProvider>
    </AuthProvider>
  );
}
