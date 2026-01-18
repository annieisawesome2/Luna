import React, { useState } from 'react';
import './LoginPage.css';

function LoginPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // For MVP, just log in without actual authentication
    onLogin();
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Logo and title */}
        <div className="login-header">
          <img 
            src="/images/luna_logo.png" 
            alt="Luna" 
            className="luna-logo"
          />
        </div>

        {/* Form card */}
        <div className="login-card">
          {/* Decorative elements */}
          <div className="decorative-line">
            <div className="line-segment long"></div>
            <div className="line-segment short"></div>
          </div>

          <h2 className="form-title">
            {isLogin ? "Welcome Back" : "Begin Your Journey"}
          </h2>

          <form onSubmit={handleSubmit} className="login-form">
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="name" className="form-label">Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="luna@example.com"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <button type="submit" className="login-button">
              {isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="form-footer">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="toggle-link"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
