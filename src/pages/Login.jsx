import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { createOrUpdateUser, isAdmin } from '../utils/userManagement';
import logo from '../assets/logo.png'; // Update this with your actual logo filename

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState({ type: '', message: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await createOrUpdateUser(userCredential.user);
      
      // Check if user is admin
      const isUserAdmin = await isAdmin(userCredential.user.uid);
      
      // Navigate based on role
      if (isUserAdmin) {
        navigate('/admin', { replace: true });
      } else {
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }
    } catch (error) {
      setError('Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setResetStatus({ type: '', message: '' });

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetStatus({
        type: 'success',
        message: 'Password reset instructions have been sent to your email.'
      });
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetEmail('');
        setResetStatus({ type: '', message: '' });
      }, 3000);
    } catch (error) {
      console.error('Password reset error:', error);
      setResetStatus({
        type: 'error',
        message: error.message || 'Failed to send reset instructions. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-teal-600 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8">
        <img src={logo} alt="Swyft Logo" className="h-24 w-auto" />
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Login</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-transparent text-black border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                placeholder="name@company.com"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-transparent text-black border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none pr-10 transition-all"
                placeholder="************"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent text-black hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded-lg text-white font-medium transition-all ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-teal-500 hover:bg-teal-600'
            }`}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>

          {/* Forgot Password Link */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-black bg-transparent hover:text-teal-600 transition-colors px-4 py-2 rounded-lg"
            >
              FORGOT PASSWORD?
            </button>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => {
                setShowForgotPassword(false);
                setResetEmail('');
                setResetStatus({ type: '', message: '' });
              }}
              className="absolute right-4 top-4 bg-transparent text-black hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Reset Password</h2>
            
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-transparent text-black border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter your email address"
                  required
                />
              </div>

              {resetStatus.message && (
                <div
                  className={`p-4 rounded-lg ${
                    resetStatus.type === 'success'
                      ? 'bg-green-50 text-green-800'
                      : 'bg-red-50 text-red-800'
                  }`}
                >
                  {resetStatus.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-2 px-4 rounded-lg text-white font-medium transition-all ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-teal-500 hover:bg-teal-600'
                }`}
              >
                {isLoading ? 'Sending...' : 'Send Reset Instructions'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login; 