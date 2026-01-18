import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TipsPage.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const iconMap = {
  heart: '❤️',
  sparkles: '✨',
  activity: '🏃',
  brain: '🧠',
  utensils: '🍽️'
};

function TipsPage() {
  const [tipsData, setTipsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTips();
  }, []);

  const fetchTips = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/tips`);
      setTipsData(response.data);
    } catch (err) {
      console.error('Error fetching tips:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="tips-page">
        <div className="loading">Loading tips...</div>
      </div>
    );
  }

  if (!tipsData) {
    return (
      <div className="tips-page">
        <div className="loading">No tips available</div>
      </div>
    );
  }

  return (
    <div className="tips-page">
      {/* Header */}
      <div className="tips-header">
        <div className="header-icons-group">
          <img 
            src="/images/tips-icon.png" 
            alt="Book" 
            className="header-icon tips-icon-img"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
          />
          <span className="tips-icon-fallback" style={{ display: 'none' }}>📖</span>
          
          <div className="mascot-circle-small">
            <img 
              src="/images/mascot.png" 
              alt="Luna Mascot" 
              className="mascot-image-small"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'block'; }}
            />
            <span className="mascot-emoji-fallback-small" style={{ display: 'none' }}>🦘</span>
          </div>
        </div>
        <h1 className="tips-title">Cycle Tips & Info</h1>
        <p className="tips-subtitle">Learn to work with your cycle</p>
        {tipsData.aiGenerated && (
          <div className="ai-badge" style={{ marginTop: '8px', fontSize: '0.75rem', color: '#9d7089', fontStyle: 'italic' }}>
            ✨ AI-Powered Personalized Tips
          </div>
        )}
      </div>

      {/* Decorative line */}
      <div className="decorative-line">
        <div className="gradient-line"></div>
      </div>

      {/* Phase-specific tips */}
      {tipsData.allPhaseTips.map((phaseInfo) => (
        <div key={phaseInfo.phase} className="phase-tips-card">
          <div className="phase-header">
            <div 
              className="phase-icon-circle"
              style={{ backgroundColor: `${phaseInfo.color}20` }}
            >
              <span className="phase-icon" style={{ color: phaseInfo.color }}>
                {iconMap[phaseInfo.icon] || '💡'}
              </span>
            </div>
            <h2 className="phase-title">{phaseInfo.phase}</h2>
            {tipsData.aiGenerated && (
              <span className="ai-indicator" style={{ fontSize: '0.7rem', color: '#9d7089', marginLeft: '8px' }}>
                🤖 AI
              </span>
            )}
          </div>

          <div className="tips-list">
            {phaseInfo.tips.map((tip, index) => (
              <div 
                key={index} 
                className="tip-item"
                style={{ borderLeftColor: phaseInfo.color }}
              >
                <h3 className="tip-title">{tip.title}</h3>
                <p className="tip-description">{tip.description}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* General wellness tips */}
      <div className="general-tips-card">
        <h2 className="general-tips-title">General Wellness Tips</h2>

        <div className="general-tips-list">
          {tipsData.generalTips.map((tip, index) => (
            <div key={index} className="general-tip-item">
              <span className="general-tip-icon">
                {iconMap[tip.icon] || '💡'}
              </span>
              <div className="general-tip-content">
                <h3 className="general-tip-title">{tip.title}</h3>
                <p className="general-tip-description">{tip.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="disclaimer-card">
        <p className="disclaimer-text">
          <strong>Note:</strong> This information is for educational purposes only and should not replace professional medical advice. Always consult with your healthcare provider for personalized guidance.
        </p>
      </div>

      {/* Decorative sparkles */}
      <div className="decorative-sparkles">
        <span className="sparkle">✨</span>
        <span className="sparkle small">✨</span>
        <span className="sparkle">✨</span>
      </div>
    </div>
  );
}

export default TipsPage;
