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
  const [bunnyData, setBunnyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bunnyLoading, setBunnyLoading] = useState(true);
  const [bunnyError, setBunnyError] = useState(null);

  useEffect(() => {
    fetchTips();
    fetchBunnyGuidance();
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

  const fetchBunnyGuidance = async () => {
    try {
      setBunnyLoading(true);
      setBunnyError(null);
      const response = await axios.get(`${API_BASE_URL}/bunny`);
      setBunnyData(response.data);
    } catch (err) {
      console.error('Error fetching bunny guidance:', err);
      setBunnyError('Unable to connect to Luna. Using fallback guidance.');
      // Set fallback data
      setBunnyData({
        greeting: "Hello! I'm here to help you understand your cycle.",
        phaseExplanation: "Keep tracking your temperature daily to understand your body's unique patterns.",
        food: {
          focus: "Focus on nourishing your body with whole foods",
          recommendations: ["Balanced meals", "Plenty of water", "Iron-rich foods"]
        },
        exercise: {
          type: "Gentle movement",
          intensity: "moderate",
          guidance: "Listen to your body and choose movement that feels good"
        },
        social: {
          capacity: "medium",
          guidance: "Honor your energy levels and set boundaries as needed"
        },
        closing: "Take care of yourself today!",
        metadata: { fallback: true }
      });
    } finally {
      setBunnyLoading(false);
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
        <h1 className="tips-title">Body Literacy & Insights</h1>
        <p className="tips-subtitle">Understand your body's signals</p>
      </div>

      {/* Decorative line */}
      <div className="decorative-line">
        <div className="gradient-line"></div>
      </div>

      {/* Luna Bunny Chat Section */}
      {bunnyData && (
        <div className="bunny-chat-card">
          <div className="bunny-header">
            <div className="bunny-avatar">
              <span className="bunny-emoji">🐰</span>
            </div>
            <div className="bunny-title-group">
              <h2 className="bunny-name">Luna</h2>
              <p className="bunny-subtitle">Your cycle companion</p>
            </div>
            {bunnyError && (
              <div className="bunny-error-badge" title={bunnyError}>
                ⚠️
              </div>
            )}
          </div>

          {bunnyLoading ? (
            <div className="bunny-loading">
              <div className="bunny-loading-dots">
                <span></span><span></span><span></span>
              </div>
              <p>Luna is thinking...</p>
            </div>
          ) : (
            <div className="bunny-message">
              <div className="bunny-greeting">
                {bunnyData.greeting}
              </div>

              <div className="bunny-phase-explanation">
                {bunnyData.phaseExplanation}
              </div>

              <div className="bunny-guidance-sections">
                {/* Food Section */}
                <div className="bunny-guidance-item food-guidance">
                  <div className="guidance-header">
                    <span className="guidance-icon">🍽️</span>
                    <h3 className="guidance-title">Food Focus</h3>
                  </div>
                  <p className="guidance-focus">{bunnyData.food.focus}</p>
                  <ul className="guidance-list">
                    {bunnyData.food.recommendations.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Exercise Section */}
                <div className="bunny-guidance-item exercise-guidance">
                  <div className="guidance-header">
                    <span className="guidance-icon">🏃</span>
                    <h3 className="guidance-title">Exercise</h3>
                    <span className="intensity-badge" data-intensity={bunnyData.exercise.intensity}>
                      {bunnyData.exercise.intensity}
                    </span>
                  </div>
                  <p className="guidance-type">{bunnyData.exercise.type}</p>
                  <p className="guidance-text">{bunnyData.exercise.guidance}</p>
                </div>

                {/* Social Section */}
                <div className="bunny-guidance-item social-guidance">
                  <div className="guidance-header">
                    <span className="guidance-icon">💬</span>
                    <h3 className="guidance-title">Social Capacity</h3>
                    <span className="capacity-badge" data-capacity={bunnyData.social.capacity}>
                      {bunnyData.social.capacity}
                    </span>
                  </div>
                  <p className="guidance-text">{bunnyData.social.guidance}</p>
                </div>
              </div>

              <div className="bunny-closing">
                {bunnyData.closing}
              </div>

              {bunnyData.metadata?.fallback && (
                <div className="bunny-fallback-notice">
                  <small>Using fallback guidance. Add GEMINI_API_KEY to enable AI-powered insights.</small>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Current Phase Tips (Highlighted) */}
      {tipsData.currentPhaseTips && (
        <div className="phase-tips-card current-phase-card" style={{ borderColor: tipsData.currentPhaseTips.color, borderWidth: '2px' }}>
          <div className="phase-header">
            <div 
              className="phase-icon-circle"
              style={{ backgroundColor: `${tipsData.currentPhaseTips.color}20` }}
            >
              <span className="phase-icon" style={{ color: tipsData.currentPhaseTips.color }}>
                {iconMap[tipsData.currentPhaseTips.icon] || '💡'}
              </span>
            </div>
            <div>
              <h2 className="phase-title">{tipsData.currentPhaseName || tipsData.currentPhaseTips.phase}</h2>
              <p className="phase-subtitle" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Your current detected phase
              </p>
            </div>
          </div>

          <div className="tips-list">
            {tipsData.currentPhaseTips.tips.map((tip, index) => (
              <div 
                key={index} 
                className="tip-item"
                style={{ borderLeftColor: tipsData.currentPhaseTips.color }}
              >
                <h3 className="tip-title">{tip.title}</h3>
                <p className="tip-description">{tip.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Phase Tips */}
      <div className="all-phases-section">
        <h2 className="section-title" style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '16px', marginTop: '8px' }}>
          All Phases
        </h2>
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
      </div>

      {/* Body Literacy Tips */}
      <div className="general-tips-card">
        <h2 className="general-tips-title">Body Literacy & Self-Understanding</h2>

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
