import React, { useState } from 'react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

const ForgotPassword = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setMessage('');
    setError('');
    
    // Basic email validation
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);
      setMessage('Check your email for password reset instructions');
      setEmail(''); // Clear the email field on success
    } catch (err) {
      // Handle specific Firebase Auth errors
      switch (err.code) {
        case 'auth/user-not-found':
          setError('No account found with this email address');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address');
          break;
        case 'auth/too-many-requests':
          setError('Too many requests. Please try again later');
          break;
        default:
          setError('Something went wrong. Please try again');
          console.error('Password reset error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      width: '100%',
      maxWidth: '400px',
      margin: '0 auto'
    }}>
      <h2 style={{
        textAlign: 'center',
        marginBottom: '1.5rem',
        color: '#333',
        fontSize: '1.5rem',
        fontWeight: '600'
      }}>
        Reset Password
      </h2>

      <p style={{
        textAlign: 'center',
        marginBottom: '1.5rem',
        color: '#666',
        fontSize: '0.9rem',
        lineHeight: '1.4'
      }}>
        Enter your email address and we'll send you instructions to reset your password.
      </p>

      <form onSubmit={handlePasswordReset} style={{ width: '100%' }}>
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem',
              boxSizing: 'border-box',
              backgroundColor: loading ? '#f5f5f5' : 'white',
              opacity: loading ? 0.7 : 1
            }}
          />
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fee',
            color: '#c33',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            fontSize: '0.9rem',
            border: '1px solid #fcc'
          }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{
            backgroundColor: '#efe',
            color: '#363',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            fontSize: '0.9rem',
            border: '1px solid #cfc'
          }}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '1rem',
            transition: 'background-color 0.2s ease'
          }}
        >
          {loading ? 'Sending...' : 'Send Reset Email'}
        </button>
      </form>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={onBackToLogin}
          disabled={loading}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#007bff',
            fontSize: '0.9rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            textDecoration: 'underline',
            opacity: loading ? 0.5 : 1
          }}
        >
          ← Back to Login
        </button>
      </div>
    </div>
  );
};

export default ForgotPassword;
