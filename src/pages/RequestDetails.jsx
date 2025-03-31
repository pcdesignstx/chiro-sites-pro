import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Import all components
import WebsiteIdentity from './WebsiteIdentity';
import WebsiteDesign from './WebsiteDesign';
import Home from './Home';
import About from './About';
import Services from './Services';
import Contact from './Contact';
import Blog from './Blog';
import LandingPages from './LandingPages';
import LeadGenerator from '../components/elements/LeadGenerator';
import DiscoveryCall from '../components/elements/DiscoveryCall';
import FAQ from '../components/elements/FAQ';
import PromoBar from '../components/elements/PromoBar';
import Images from '../components/elements/Images';

const RequestDetails = () => {
  const { requestId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestData, setRequestData] = useState(null);

  useEffect(() => {
    const fetchRequestData = async () => {
      try {
        const db = getFirestore();
        const requestRef = doc(db, 'requests', requestId);
        const requestSnap = await getDoc(requestRef);

        if (requestSnap.exists()) {
          setRequestData(requestSnap.data());
        } else {
          setError('Request not found');
        }
      } catch (err) {
        console.error('Error fetching request:', err);
        setError('Failed to load request details');
      } finally {
        setLoading(false);
      }
    };

    fetchRequestData();
  }, [requestId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500 text-center">
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-[1000px] mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Request Details</h1>
            <p className="text-gray-600 mt-1">View all components for this request</p>
          </div>
        </div>

        {/* Components */}
        <div className="space-y-8">
          <WebsiteIdentity readOnly initialData={requestData?.websiteIdentity} />
          <WebsiteDesign readOnly initialData={requestData?.websiteDesign} />
          <Home readOnly initialData={requestData?.home} />
          <About readOnly initialData={requestData?.about} />
          <Services readOnly initialData={requestData?.services} />
          <Contact readOnly initialData={requestData?.contact} />
          <Blog readOnly initialData={requestData?.blog} />
          <LandingPages readOnly initialData={requestData?.landingPages} />
          <LeadGenerator readOnly initialData={requestData?.leadGenerator} />
          <DiscoveryCall readOnly initialData={requestData?.discoveryCall} />
          <FAQ readOnly initialData={requestData?.faq} />
          <PromoBar readOnly initialData={requestData?.promoBar} />
          <Images readOnly initialData={requestData?.images} />
        </div>
      </div>
    </div>
  );
};

export default RequestDetails; 