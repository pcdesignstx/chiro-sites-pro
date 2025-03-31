import React from 'react';
import { useNavigate } from 'react-router-dom';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

const Dashboard = () => {
  const navigate = useNavigate();

  const handleViewRequest = (requestId) => {
    navigate(`/request/${requestId}`);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Dashboard Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-teal-500 uppercase tracking-wide text-sm font-medium">WELCOME TO CHIROSITES PRO</p>
      </div>

      {/* Welcome Message */}
      <div className="bg-teal-500 text-white p-4 rounded-lg mb-8 flex items-center">
        <InformationCircleIcon className="w-5 h-5 mr-2" />
        <p>Welcome to the brand new ChiroSites Pro Platform!</p>
      </div>

      {/* Video Section */}
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="relative h-[480px] bg-gray-900 rounded-lg mb-6 overflow-hidden">
          <iframe
            className="absolute inset-0 w-full h-full"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?controls=1"
            title="Welcome to ChiroSites Pro"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>

        {/* Instructions */}
        <div className="text-gray-600">
          <p className="mb-4">Welcome to the ChiroSites Pro platform! To get started, click the video above to learn how to customize your chiropractic website and grow your practice online.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 