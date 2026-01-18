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
          <div className="logo-group">
            <img src="/images/moon.png" alt="Moon" className="moon-icon" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'block'; }} />
            <span className="moon-icon-fallback" style={{ display: 'none' }}>🌙</span>
            <div className="mascot-circle">
              <img src="/images/mascot.png" alt="Luna Mascot" className="mascot-image" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'block'; }} />
              <span className="mascot-emoji-fallback" style={{ display: 'none' }}>🦘</span>
            </div>
            <img src="/images/sparkle.png" alt="Sparkle" className="sparkle-icon" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'block'; }} />
            <span className="sparkle-icon-fallback" style={{ display: 'none' }}>✨</span>
          </div>
          <h1 className="login-title">Luna</h1>
          <p className="login-subtitle">Track your celestial cycle</p>
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

          {/* Decorative sparkles */}
          <div className="sparkles">
            <span className="sparkle">✨</span>
            <span className="sparkle small">✨</span>
            <span className="sparkle">✨</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
