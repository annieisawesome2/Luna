import React from 'react';
import './TodayCard.css';

const phaseInfo = {
  menstrual: {
    name: 'Menstrual Phase',
    image: '/images/phase-menstrual.png',
    emoji: '🔴', // Fallback
    color: '#c14a4a',
    description: 'Days 1-5: Your period. BBT is typically lower.'
  },
  follicular: {
    name: 'Follicular Phase',
    image: '/images/phase-follicular.png',
    emoji: '🟢', // Fallback
    color: '#93a7d1',
    description: 'Days 6-13: Energy rising! BBT gradually increases.'
  },
  ovulation: {
    name: 'Ovulation',
    image: '/images/phase-ovulation.png',
    emoji: '🟠', // Fallback
    color: '#93a7d1',
    description: 'Days 14-16: Peak fertility. BBT rises 0.3-0.5°C.'
  },
  luteal: {
    name: 'Luteal Phase',
    image: '/images/phase-luteal.png',
    emoji: '🟣', // Fallback
    color: '#9d7089',
    description: 'Days 17-28: Progesterone high. BBT stays elevated.'
  },
  unknown: {
    name: 'Unknown',
    image: '/images/phase-unknown.png',
    emoji: '⚪', // Fallback
    color: '#b9a4ba',
    description: 'Start tracking to determine your cycle phase.'
  }
};

function TodayCard({ todayData }) {
  if (!todayData) {
    return (
      <div className="today-card">
        <p>Loading...</p>
      </div>
    );
  }

  const phase = todayData.phase || 'unknown';
  const info = phaseInfo[phase] || phaseInfo.unknown;

  return (
    <div className="today-card">
      <h3 className="card-title">Today's Summary</h3>
      
      <div className="today-content">
        <div className="phase-badge" style={{ borderColor: info.color }}>
          <div className="phase-icon-wrapper">
            <img 
              src={info.image} 
              alt={info.name}
              className="phase-icon"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <span className="phase-emoji-fallback" style={{ display: 'none' }}>{info.emoji}</span>
          </div>
          <div>
            <div className="phase-name">{info.name}</div>
            <div className="cycle-day">Cycle Day {todayData.cycleDay || '?'}</div>
          </div>
        </div>

        {todayData.temperature ? (
          <div className="temperature-display">
            <div className="temp-label">Today's BBT</div>
            <div className="temp-value">{todayData.temperature.toFixed(2)}°C</div>
            {todayData.avgBBT && (
              <div className="temp-avg">Avg: {todayData.avgBBT}°C</div>
            )}
          </div>
        ) : (
          <div className="no-reading">
            <p>
              <img src="/images/data-icon.png" alt="Data" className="inline-icon" onError={(e) => e.target.style.display = 'none'} />
              <span className="emoji-fallback">📊</span> No reading today yet
            </p>
            <p className="hint">Press the button on your Luna device to record BBT</p>
          </div>
        )}

        <div className="tip-section">
          <div className="tip-label">
            <img src="/images/insight-icon.png" alt="Insight" className="inline-icon" onError={(e) => e.target.style.display = 'none'} />
            <span className="emoji-fallback">💡</span> Insight
          </div>
          <div className="tip-text">{todayData.tip || 'Keep tracking daily for personalized insights!'}</div>
        </div>
      </div>
    </div>
  );
}

export default TodayCard;
