import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { 
  HomeIcon, 
  UserGroupIcon, 
  BuildingOfficeIcon, 
  DocumentTextIcon,
  UserIcon,
  ArrowLeftOnRectangleIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  UsersIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentListIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

const AdminLayout = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout; 