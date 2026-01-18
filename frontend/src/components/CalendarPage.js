import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CalendarPage.css';

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  useEffect(() => {
    fetchCalendarData();
  }, [year, month]);

  // Sync selectedDate when currentMonth changes
  useEffect(() => {
    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = selectedDate.getMonth();
    
    // If selectedDate is not in the current month, reset it to day 1 of current month
    if (selectedYear !== year || selectedMonth !== month) {
      const today = new Date();
      // If today is in the current month, use today; otherwise use day 1
      if (today.getFullYear() === year && today.getMonth() === month) {
        setSelectedDate(new Date(year, month, today.getDate()));
      } else {
        setSelectedDate(new Date(year, month, 1));
      }
    }
  }, [year, month]);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/calendar`, {
        params: { year, month }
      });
      setCalendarData(response.data);
    } catch (err) {
      console.error('Error fetching calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  const daysInMonth = calendarData?.daysInMonth || new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  // Create calendar days array
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(year, month - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1));
  };

  const getPhaseForDay = (day) => {
    if (!calendarData) return null;
    const dayData = calendarData.calendarData.find(d => d.day === day);
    return dayData ? dayData.phaseColor : null;
  };

  // Calculate progress based on selectedDate, but ensure it's within the current month
  const selectedDay = selectedDate.getFullYear() === year && selectedDate.getMonth() === month
    ? selectedDate.getDate()
    : 1;
  const progress = selectedDay / daysInMonth;
  const circumference = 2 * Math.PI * 88;
  
  // Get phase color for the selected day to color the dot
  const selectedDayPhaseColor = getPhaseForDay(selectedDay);

  if (loading) {
    return (
      <div className="calendar-page">
        <div className="loading">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="calendar-page">
      {/* Header with mascot */}
      <div className="calendar-header">
        <div className="header-content">
          <h1 className="calendar-title">Cycle Calendar</h1>
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
        <p className="calendar-subtitle">Track your phases</p>
      </div>

      {/* Calendar Card */}
      <div className="calendar-card">
        <div className="month-navigation">
          <button
            onClick={previousMonth}
            className="nav-button"
          >
            <span className="chevron-left">‹</span>
          </button>

          <h2 className="month-year">
            {monthNames[month]} {year}
          </h2>

          <button
            onClick={nextMonth}
            className="nav-button"
          >
            <span className="chevron-right">›</span>
          </button>
        </div>

        {/* Day labels */}
        <div className="day-labels">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
            <div key={`${day}-${idx}`} className="day-label">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="calendar-grid">
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="calendar-day-empty" />;
            }

            const isSelected =
              day === selectedDate.getDate() &&
              month === selectedDate.getMonth() &&
              year === selectedDate.getFullYear();

            const phaseDotColor = getPhaseForDay(day);

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(new Date(year, month, day))}
                className={`calendar-day ${isSelected ? 'selected' : ''}`}
              >
                <span className="day-number">{day}</span>
                {phaseDotColor && (
                  <div
                    className="phase-dot"
                    style={{ backgroundColor: phaseDotColor }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Month Progress Card */}
      <div className="progress-card">
        <h3 className="progress-title">Month Progress</h3>
        
        <div className="progress-ring-container">
          <div className="progress-ring-wrapper">
            {/* Background ring */}
            <svg className="progress-ring" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r="88"
                fill="none"
                stroke="#d4d8ed"
                strokeWidth="8"
              />
              {/* Progress ring */}
              <circle
                cx="100"
                cy="100"
                r="88"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="8"
                strokeDasharray={`${progress * circumference} ${circumference}`}
                strokeLinecap="round"
                transform="rotate(-90 100 100)"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#9d7089" />
                  <stop offset="100%" stopColor="#93a7d1" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center content */}
            <div className="progress-center">
              <div className="progress-day-number">{selectedDay}</div>
              <div className="progress-day-label">of {daysInMonth}</div>
            </div>

            {/* Selected date indicator dot */}
            <div
              className="progress-indicator-dot"
              style={{
                transform: `rotate(${progress * 360}deg) translateY(-88px) rotate(-${progress * 360}deg)`,
                backgroundColor: selectedDayPhaseColor || '#9d7089',
              }}
            />
          </div>
        </div>
      </div>

      {/* Phase Legend Card */}
      <div className="legend-card">
        <h3 className="legend-title">Phase Legend</h3>
        
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-dot" style={{ backgroundColor: '#c14a4a' }}></div>
            <span className="legend-text">Period (Days 1-5)</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ backgroundColor: '#93a7d1' }}></div>
            <span className="legend-text">Ovulation (Days 12-16)</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ backgroundColor: '#9d7089' }}></div>
            <span className="legend-text">Luteal Phase (Days 17-28)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarPage;
