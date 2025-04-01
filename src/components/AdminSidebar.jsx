import { useState } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  CreditCardIcon,
  BellIcon,
  ShieldCheckIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentListIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import logo from '../assets/logo.png';
import { classNames } from '../utils/classNames';

const AdminSidebar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const handleLogout = () => {
    // Add your logout logic here
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: HomeIcon },
    { name: 'Client Dashboard', href: '/dashboard', icon: ArrowTopRightOnSquareIcon },
    { name: 'Account Management', href: '/admin/clients', icon: UsersIcon },
    { name: 'Requests', href: '/admin/requests', icon: ClipboardDocumentListIcon },
    { name: 'Content Export', href: '/admin/content-export', icon: ArrowDownTrayIcon },
    { name: 'Settings', href: '/admin/settings', icon: Cog6ToothIcon },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-20 p-2 rounded-md bg-gray-800 text-white hover:bg-gray-700"
      >
        {isSidebarOpen ? (
          <XMarkIcon className="w-6 h-6" />
        ) : (
          <Bars3Icon className="w-6 h-6" />
        )}
      </button>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-20
        transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 transition-transform duration-200 ease-in-out
        w-64 h-screen bg-[#1f1f1f] text-white flex flex-col
      `}>
        {/* Scrollable container for all content */}
        <div className="min-h-0 h-full flex flex-col">
          {/* Header - always visible */}
          <div className="flex-shrink-0 p-4">
            <div className="w-full flex justify-center items-center mb-4">
              <img src={logo} alt="Swyft Logo" className="h-12 w-auto" />
            </div>
            <div className="flex items-center justify-center gap-2 px-4">
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center justify-center p-2 text-gray-300 hover:text-white hover:bg-gray-600 hover:border-teal-500 border border-transparent rounded-lg transition-all ${
                    isActive ? 'bg-gray-700 text-white border-teal-500' : ''
                  }`
                }
              >
                <HomeIcon className="w-5 h-5 opacity-75" />
              </NavLink>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center p-2 text-gray-300 hover:text-white hover:bg-gray-600 hover:border-teal-500 border border-transparent rounded-lg transition-all"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5 opacity-75" />
              </button>
            </div>
          </div>

          {/* Scrollable navigation */}
          <div className="flex-1 overflow-y-auto px-4">
            <nav className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={classNames(
                    pathname === item.href
                      ? 'bg-gray-700 text-white border-teal-500'
                      : 'text-gray-300 hover:text-white hover:bg-gray-600 hover:border-teal-500',
                    'w-full flex items-center px-4 py-2 border border-transparent rounded-lg transition-all text-sm'
                  )}
                >
                  <item.icon
                    className={classNames(
                      pathname === item.href ? 'text-white' : 'text-gray-400 group-hover:text-white',
                      'w-4 h-4 mr-2.5 opacity-75'
                    )}
                    aria-hidden="true"
                  />
                  <span>{item.name}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminSidebar; 