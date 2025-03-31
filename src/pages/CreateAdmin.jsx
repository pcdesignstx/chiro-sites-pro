import React, { useState, useEffect } from 'react';
import { createAdminUser } from '../utils/createAdmin';
import { useNavigate } from 'react-router-dom';

const CreateAdmin = () => {
  console.log('CreateAdmin component rendering');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: '',
    color: 'text-gray-500'
  });
  const navigate = useNavigate();

  useEffect(() => {
    console.log('CreateAdmin component mounted');
  }, []);

  // Password strength checker
  const checkPasswordStrength = (password) => {
    let score = 0;
    let message = '';
    let color = 'text-gray-500';

    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;

    // Character type checks
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    // Set message and color based on score
    switch (score) {
      case 0:
      case 1:
        message = 'Very Weak';
        color = 'text-red-500';
        break;
      case 2:
        message = 'Weak';
        color = 'text-orange-500';
        break;
      case 3:
        message = 'Medium';
        color = 'text-yellow-500';
        break;
      case 4:
        message = 'Strong';
        color = 'text-green-500';
        break;
      case 5:
      case 6:
        message = 'Very Strong';
        color = 'text-green-600';
        break;
      default:
        message = '';
    }

    return { score, message, color };
  };

  // Update password strength on password change
  useEffect(() => {
    if (password) {
      setPasswordStrength(checkPasswordStrength(password));
    }
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted');
    setError('');
    setSuccess('');

    // Password strength validation
    if (passwordStrength.score < 4) {
      setError('Password is not strong enough. Please include uppercase, lowercase, numbers, and special characters.');
      return;
    }

    try {
      console.log('Attempting to create admin user');
      await createAdminUser(email, password, name);
      console.log('Admin user created successfully');
      setSuccess('Admin user created successfully! Please check your email for verification.');
      // Redirect to login page after 3 seconds
      setTimeout(() => navigate('/login'), 3000);
    } catch (error) {
      console.error('Error creating admin user:', error);
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create Admin User
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm bg-transparent text-black placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm bg-transparent text-black placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm bg-transparent text-black placeholder:text-gray-400"
                />
                {password && (
                  <div className={`mt-1 text-sm ${passwordStrength.color}`}>
                    Password Strength: {passwordStrength.message}
                  </div>
                )}
                <div className="mt-1 text-xs text-gray-500">
                  Password must contain:
                  <ul className="list-disc list-inside">
                    <li>At least 8 characters</li>
                    <li>Uppercase and lowercase letters</li>
                    <li>Numbers and special characters</li>
                  </ul>
                </div>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            {success && (
              <div className="text-green-600 text-sm">{success}</div>
            )}

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Create Admin User
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateAdmin; 