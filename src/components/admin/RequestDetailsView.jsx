import React, { useState } from 'react';
import { ChevronUpIcon } from '@heroicons/react/24/outline';
import WebsiteIdentity from '../../pages/WebsiteIdentity';
import WebsiteDesign from '../../pages/WebsiteDesign';
import Home from '../../pages/Home';
import About from '../../pages/About';
import Services from '../../pages/Services';
import Contact from '../../pages/Contact';
import DiscoveryCall from '../../components/elements/DiscoveryCall';
import LeadGenerator from '../../components/elements/LeadGenerator';
import FAQ from '../../components/elements/FAQ';
import PromoBar from '../../components/elements/PromoBar';
import Images from '../../components/elements/Images';
import Blog from '../../pages/Blog';
import LandingPages from '../../pages/LandingPages';

const RequestDetailsView = ({ request, onStatusChange }) => {
  const [expandedSections, setExpandedSections] = useState({
    clientInfo: true,
    brand: false,
    elements: false,
    pages: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderMainSection = (sectionKey, title, children) => {
    if (!children) return null;

    return (
      <div className="mb-6 bg-white rounded-lg shadow">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full px-6 py-4 flex items-center justify-between text-left bg-white border-b border-gray-200"
        >
          <h2 className="text-lg font-medium text-gray-900">{title}</h2>
          <ChevronUpIcon
            className={`w-5 h-5 text-gray-500 transition-transform ${
              expandedSections[sectionKey] ? '' : 'transform rotate-180'
            }`}
          />
        </button>

        {expandedSections[sectionKey] && (
          <div className="p-6">
            {children}
          </div>
        )}
      </div>
    );
  };

  const NoDataMessage = () => (
    <div className="text-center py-8 text-gray-500">
      No data submitted for this section
    </div>
  );

  const renderField = (label, value) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
        {value || 'Not provided'}
      </div>
    </div>
  );

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-[1500px] mx-auto">
        {/* Client Info Section */}
        {renderMainSection('clientInfo', 'Client Information', (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {renderField('Name', request.clientName)}
              {renderField('Email', request.clientEmail)}
              {request.clinicName && renderField('Clinic Name', request.clinicName)}
            </div>
          </div>
        ))}

        {/* Status Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 bg-white border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Request Status</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center space-x-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                request.status === 'approved' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {request.status}
              </span>
              <div className="flex space-x-3">
                <button
                  onClick={() => onStatusChange(request.id, 'rejected')}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600"
                >
                  Reject
                </button>
                <button
                  onClick={() => onStatusChange(request.id, 'approved')}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-500 rounded-md hover:bg-teal-600"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Section */}
        {renderMainSection('brand', 'Brand', (
          <div className="space-y-4">
            <WebsiteIdentity readOnly={true} initialData={request?.websiteIdentity} />
            <WebsiteDesign readOnly={true} initialData={request?.websiteDesign} />
          </div>
        ))}

        {/* Elements Section */}
        {renderMainSection('elements', 'Elements', (
          <div className="space-y-4">
            <DiscoveryCall readOnly={true} initialData={request?.discoveryCall} />
            <LeadGenerator readOnly={true} initialData={request?.leadGenerator} />
            <FAQ readOnly={true} initialData={request?.faq} />
            <PromoBar readOnly={true} initialData={request?.promoBar} />
            <Images readOnly={true} initialData={request?.images} />
          </div>
        ))}

        {/* Pages Section */}
        {renderMainSection('pages', 'Pages', (
          <div className="space-y-4">
            <details className="bg-white rounded-lg shadow-sm mb-8 group" open>
              <summary className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Home Page</h3>
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="p-6">
                <Home readOnly={true} initialData={request?.home} />
              </div>
            </details>

            <details className="bg-white rounded-lg shadow-sm mb-8 group" open>
              <summary className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">About Page</h3>
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="p-6">
                <About readOnly={true} initialData={request?.about} />
              </div>
            </details>

            <details className="bg-white rounded-lg shadow-sm mb-8 group" open>
              <summary className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Services Page</h3>
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="p-6">
                <Services readOnly={true} initialData={request?.services} />
              </div>
            </details>

            <details className="bg-white rounded-lg shadow-sm mb-8 group" open>
              <summary className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Contact Page</h3>
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="p-6">
                <Contact readOnly={true} initialData={request?.contact} />
              </div>
            </details>

            <details className="bg-white rounded-lg shadow-sm mb-8 group" open>
              <summary className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Blog Page</h3>
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="p-6">
                <Blog readOnly={true} initialData={request?.blog} />
              </div>
            </details>

            <details className="bg-white rounded-lg shadow-sm mb-8 group" open>
              <summary className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Landing Pages</h3>
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="p-6">
                <LandingPages readOnly={true} initialData={request?.landingPages} />
              </div>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RequestDetailsView; 