import React from 'react';
import './HomePage.css';

function HomePage({ todayData }) {
  const currentDate = new Date();
  const dateString = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const phase = todayData?.phase || 'unknown';
  const cycleDay = todayData?.cycleDay || 21;
  const cycleLength = 28; // Default cycle length
  const daysUntilPeriod = cycleLength - cycleDay;
  const progressPercent = (cycleDay / cycleLength) * 100;

  const phaseNames = {
    menstrual: 'Menstrual',
    follicular: 'Follicular',
    ovulation: 'Ovulation',
    luteal: 'Luteal',
    unknown: 'Luteal'
  };

  const phaseName = phaseNames[phase] || 'Luteal';

  // Calculate next period date
  const nextPeriodText = daysUntilPeriod > 0 
    ? `in ${daysUntilPeriod} days` 
    : daysUntilPeriod === 0 
    ? 'today' 
    : 'recently';

  return (
    <div className="home-page">
      {/* Header with mascot */}
      <div className="home-header">
        <div className="header-icons">
          <img 
            src="/images/moon.png" 
            alt="Moon" 
            className="header-icon moon-icon-img"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
          />
          <span className="moon-icon-fallback" style={{ display: 'none' }}>🌙</span>
          
          <div className="mascot-circle">
            <img 
              src="/images/mascot.png" 
              alt="Luna Mascot" 
              className="mascot-image"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'block'; }}
            />
            <span className="mascot-emoji-fallback" style={{ display: 'none' }}>🦘</span>
          </div>
          
          <img 
            src="/images/sparkle.png" 
            alt="Sparkle" 
            className="header-icon sparkle-icon-img"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
          />
          <span className="sparkle-icon-fallback" style={{ display: 'none' }}>✨</span>
        </div>
        <h1 className="welcome-text">Welcome back, Luna</h1>
        <p className="date-text">{dateString}</p>
      </div>

      {/* Decorative gradient line */}
      <div className="decorative-line">
        <div className="gradient-line"></div>
      </div>

      {/* Current Cycle Card */}
      <div className="cycle-card">
        <div className="card-header">
          <h2 className="card-title">Current Cycle</h2>
          <div className="moon-icon-circle">
            <img 
              src="/images/moon.png" 
              alt="Moon" 
              className="moon-icon-small"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
            />
            <span className="moon-icon-small-fallback" style={{ display: 'none' }}>🌙</span>
          </div>
        </div>

        <div className="cycle-info">
          <div className="info-row">
            <span className="info-label">Phase:</span>
            <div className="info-value">
              <div className="phase-dot" style={{ backgroundColor: '#9d7089' }}></div>
              <span>{phaseName}</span>
            </div>
          </div>

          <div className="info-row">
            <span className="info-label">Day of cycle:</span>
            <span className="info-value-text">Day {cycleDay} of {cycleLength}</span>
          </div>

          <div className="info-row">
            <span className="info-label">Next period:</span>
            <span className="info-value-text">{nextPeriodText}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Today's Insights Card */}
      <div className="insights-card">
        <h2 className="card-title">Today's Insights</h2>

        <div className="insights-list">
          <div className="insight-item">
            <img 
              src="/images/sparkle.png" 
              alt="Sparkle" 
              className="insight-icon"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
            />
            <span className="insight-icon-fallback" style={{ display: 'none' }}>✨</span>
            <div className="insight-content">
              <h3 className="insight-title">Energy Levels</h3>
              <p className="insight-text">
                {todayData?.tip || "You may experience moderate energy today. Consider light exercise like yoga or walking."}
              </p>
            </div>
          </div>

          <div className="insight-item">
            <img 
              src="/images/sparkle.png" 
              alt="Sparkle" 
              className="insight-icon"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
            />
            <span className="insight-icon-fallback" style={{ display: 'none' }}>✨</span>
            <div className="insight-content">
              <h3 className="insight-title">Self-Care Tip</h3>
              <p className="insight-text">
                This is a great time for introspection. Consider journaling or meditation to connect with yourself.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-card-1">
          <div className="stat-value">{todayData?.temperature ? `${todayData.temperature.toFixed(1)}°C` : '36.4°C'}</div>
          <div className="stat-label">Basal Temp</div>
        </div>

        <div className="stat-card stat-card-2">
          <div className="stat-value">{cycleLength} days</div>
          <div className="stat-label">Avg Cycle</div>
        </div>
      </div>

      {/* Decorative dashes */}
      <div className="decorative-dashes">
        <div className="dash dash-1"></div>
        <div className="dash dash-2"></div>
        <div className="dash dash-3"></div>
      </div>
    </div>
  );
}

export default HomePage;
