import React from 'react';
import './BottomNav.css';

function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: "data", icon: "/images/data-icon.png", emoji: "📊", label: "Data" },
    { id: "calendar", icon: "/images/calendar-icon.png", emoji: "📅", label: "Calendar" },
    { id: "home", icon: "/images/moon.png", emoji: "🌙", label: "Home", isMoon: true },
    { id: "tips", icon: "/images/tips-icon.png", emoji: "💡", label: "Tips" },
    { id: "settings", icon: "/images/settings-icon.png", emoji: "⚙️", label: "Settings" },
  ];

  return (
    <div className="bottom-nav">
      <div className="bottom-nav-container">
        <div className="bottom-nav-content">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            if (tab.isMoon) {
              // Special moon button styling - bigger and elevated
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className="moon-button"
                >
                  <div className={`moon-circle ${isActive ? 'active' : ''}`}>
                    <img 
                      src={tab.icon} 
                      alt={tab.label}
                      className="moon-icon-img"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <span className="moon-icon-fallback" style={{ display: 'none' }}>{tab.emoji}</span>
                  </div>
                  {/* Sparkle decorations when active */}
                  {isActive && (
                    <>
                      <div className="sparkle sparkle-1"></div>
                      <div className="sparkle sparkle-2"></div>
                    </>
                  )}
                </button>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`nav-button ${isActive ? 'active' : ''}`}
              >
                <div className="nav-icon-wrapper">
                  <img 
                    src={tab.icon} 
                    alt={tab.label}
                    className="nav-icon-img"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                <span className="nav-label">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default BottomNav;
