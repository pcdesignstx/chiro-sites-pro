import { useState, useEffect } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  HomeIcon,
  BuildingOfficeIcon,
  PaintBrushIcon,
  PhoneIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  Bars3Icon,
  XMarkIcon,
  PuzzlePieceIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  UserGroupIcon,
  PhotoIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import logo from '../assets/logo.png';
import { useFormData } from '../contexts/FormDataContext';
import { useAuth } from '../contexts/AuthContext';
import RequestBuilder from './RequestBuilder';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Sidebar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    brand: true,
    elements: false,
    pages: false
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { formData } = useFormData();
  const { currentUser } = useAuth();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        if (!currentUser) return;
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setIsAdmin(userData.role === 'admin' || userData.role === 'owner');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    checkAdminStatus();
  }, [currentUser]);

  const handleLogout = () => {
    // Add your logout logic here
    navigate('/login');
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const menuItems = {
    brand: [
      { name: 'Website Identity', icon: BuildingOfficeIcon, path: '/website-identity' },
      { name: 'Website Design', icon: PaintBrushIcon, path: '/website-design' }
    ],
    elements: [
      { name: 'Discovery Call', icon: PhoneIcon, path: '/discovery-call' },
      { name: 'Lead Generator', icon: ChatBubbleLeftRightIcon, path: '/lead-generator' },
      { name: 'FAQ', icon: QuestionMarkCircleIcon, path: '/faq' },
      { name: 'Promo Bar', icon: ArrowPathIcon, path: '/promo-bar' },
      { name: 'Images', icon: PhotoIcon, path: '/images' }
    ],
    pages: [
      { name: 'Home', icon: HomeIcon, path: '/home' },
      { name: 'About', icon: DocumentTextIcon, path: '/about' },
      { name: 'Blog', icon: DocumentTextIcon, path: '/blog' },
      { name: 'Contact', icon: PhoneIcon, path: '/contact' },
      { name: 'Landing Pages', icon: DocumentDuplicateIcon, path: '/landing-pages' },
      { name: 'Services', icon: DocumentTextIcon, path: '/services' }
    ]
  };

  const renderSection = (title, section) => (
    <div className="mb-4">
      <div className="px-4 py-1">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="mt-1 space-y-0.5">
        {menuItems[section].map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `w-full flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-600 hover:border-teal-500 border border-transparent rounded-lg transition-all text-sm ${
                isActive ? 'bg-gray-700 text-white border-teal-500' : ''
              }`
            }
          >
            <item.icon className="w-4 h-4 mr-2.5 opacity-75" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );

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
                to="/"
                className={({ isActive }) =>
                  `flex items-center justify-center p-2 text-gray-300 hover:text-white hover:bg-gray-600 hover:border-teal-500 border border-transparent rounded-lg transition-all ${
                    isActive ? 'bg-gray-700 text-white border-teal-500' : ''
                  }`
                }
              >
                <HomeIcon className="w-5 h-5 opacity-75" />
              </NavLink>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center justify-center p-2 text-gray-300 hover:text-white hover:bg-gray-600 hover:border-teal-500 border border-transparent rounded-lg transition-all"
                  title="Admin Dashboard"
                >
                  <ArrowTopRightOnSquareIcon className="w-5 h-5 opacity-75" />
                </Link>
              )}
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
            <nav>
              {renderSection('BRAND', 'brand')}
              {renderSection('ELEMENTS', 'elements')}
              {renderSection('PAGES', 'pages')}
            </nav>
          </div>
          
          {/* Footer - always visible */}
          <div className="flex-shrink-0 p-4 border-t border-gray-800">
            <RequestBuilder formData={formData} />
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar; 