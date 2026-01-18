import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import './DataPage.css';
import './CalendarPage.css';

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

function HomePage() {
  const [temperatureData, setTemperatureData] = useState([]);
  const [avgTemp, setAvgTemp] = useState(null);
  const [ovulationMarkers, setOvulationMarkers] = useState([]);
  const [ovulation, setOvulation] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState(null);
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  useEffect(() => {
    fetchAllData();
  }, [year, month]);

  // Sync selectedDate when currentMonth changes
  useEffect(() => {
    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = selectedDate.getMonth();
    
    if (selectedYear !== year || selectedMonth !== month) {
      const today = new Date();
      if (today.getFullYear() === year && today.getMonth() === month) {
        setSelectedDate(new Date(year, month, today.getDate()));
      } else {
        setSelectedDate(new Date(year, month, 1));
      }
    }
  }, [year, month]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [tempRes, calendarRes, todayRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/data/chart`),
        axios.get(`${API_BASE_URL}/temperature/calendar`, {
          params: { year, month }
        }),
        axios.get(`${API_BASE_URL}/temperature/today`)
      ]);

      setTemperatureData(tempRes.data.temperatureData || []);
      setAvgTemp(tempRes.data.avgTemp);
      setOvulationMarkers(tempRes.data.ovulationMarkers || []);
      setOvulation(tempRes.data.ovulation || null);
      setCalendarData(calendarRes.data);
      setTodayData(todayRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
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

  const getDayData = (day) => {
    if (!calendarData) return null;
    return calendarData.calendarData.find(d => d.day === day);
  };

  const selectedDay = selectedDate.getFullYear() === year && selectedDate.getMonth() === month
    ? selectedDate.getDate()
    : 1;

  if (loading) {
    return (
      <div className="data-page">
        <div className="loading">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="data-page">
      {/* Header */}
      <div className="data-header">
        <img 
          src="/images/luna_logo.png" 
          alt="Luna" 
          className="luna-logo"
        />
      </div>

      {/* Basal Body Temperature Chart */}
      <div className="data-card">
        <div className="card-header-row">
          <h2 className="card-title">Basal Body Temperature</h2>
        </div>

        <div className="chart-container">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={temperatureData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d4d8ed" />
              <XAxis
                dataKey="day"
                label={{ value: "Days of Tracking", position: "insideBottom", offset: 5 }}
                stroke="#4a2f3f"
                tick={{ fill: "#4a2f3f", fontSize: 12 }}
                height={60}
              />
              <YAxis
                domain={[36, 37]}
                label={{ value: "Temperature (°C)", angle: -90, position: "insideLeft" }}
                stroke="#4a2f3f"
                tick={{ fill: "#4a2f3f", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid #9d7089",
                  borderRadius: "1rem",
                  padding: "0.5rem",
                }}
                formatter={(value) => [`${value}°C`, 'BBT']}
              />
              <Line
                type="monotone"
                dataKey="temp"
                stroke="#9d7089"
                strokeWidth={3}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (payload && payload.isOvulationDay) {
                    return <circle cx={cx} cy={cy} r={6} fill="#93a7d1" stroke="#fff" strokeWidth={2} />;
                  }
                  return <circle cx={cx} cy={cy} r={4} fill="#9d7089" strokeWidth={2} />;
                }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {ovulation && ovulation.detected ? (
          <div className="ovulation-explanation">
            <div className="ovulation-marker-info">
              <span className="ovulation-dot" style={{ backgroundColor: '#93a7d1' }}></span>
              <span className="ovulation-text">
                <strong>Ovulation detected:</strong> Temperature rose {ovulation.temperatureRise}°C on {new Date(ovulation.date).toLocaleDateString()}. 
                This sustained rise (3 days above baseline) indicates ovulation occurred.
              </span>
            </div>
            <p className="chart-note">
              After ovulation, your temperature stays elevated. Your period typically starts 12-14 days after ovulation.
            </p>
          </div>
        ) : (
          <p className="chart-note">
            Keep tracking daily. We'll detect ovulation when your temperature shows a sustained rise (3 consecutive days 0.3°C+ above baseline).
          </p>
        )}
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
            const dayData = getDayData(day);
            const isOvulationDay = dayData?.isOvulationDay;

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(new Date(year, month, day))}
                className={`calendar-day ${isSelected ? 'selected' : ''}`}
              >
                <span className="day-number">{day}</span>
                {isOvulationDay && (
                  <div className="ovulation-marker" title="Ovulation detected">
                    ✨
                  </div>
                )}
                {phaseDotColor && !isOvulationDay && (
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

      {/* Selected Day Info Card */}
      {calendarData && (() => {
        const selectedDayData = getDayData(selectedDay);
        return selectedDayData && selectedDayData.hasReading ? (
          <div className="progress-card">
            <h3 className="progress-title">Selected Day</h3>
            
            <div className="selected-day-info">
              <div className="selected-day-temp">
                <div className="temp-value">{selectedDayData.temperature}°C</div>
                <div className="temp-label">Basal Body Temperature</div>
              </div>
              {selectedDayData.isOvulationDay && (
                <div className="ovulation-day-badge">
                  <span className="ovulation-icon-small">✨</span>
                  <span>Ovulation Detected</span>
                </div>
              )}
              {selectedDayData.phase && (
                <div className="selected-day-phase" style={{ marginTop: '12px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Phase: {selectedDayData.phase}
                </div>
              )}
            </div>
          </div>
        ) : selectedDayData ? (
          <div className="progress-card">
            <h3 className="progress-title">Selected Day</h3>
            <div className="selected-day-info">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No temperature reading for this day</p>
            </div>
          </div>
        ) : null;
      })()}

      {/* Menstruation Countdown Bar - Only show after ovulation detected */}
      {ovulation && ovulation.detected && todayData && todayData.daysSinceOvulation !== null && todayData.daysSinceOvulation >= 0 && (
        <div className="countdown-card">
          <div className="countdown-header">
            <h3 className="countdown-title">Menstruation Countdown</h3>
            <div className="countdown-badge">
              {14 - todayData.daysSinceOvulation > 0 
                ? `${14 - todayData.daysSinceOvulation} day${14 - todayData.daysSinceOvulation !== 1 ? 's' : ''} remaining`
                : 'Expected soon'}
            </div>
          </div>
          
          <div className="countdown-bar-container">
            <div className="countdown-bar">
              {/* Progress fill showing days since ovulation */}
              <div 
                className="countdown-progress"
                style={{ 
                  width: `${Math.min((todayData.daysSinceOvulation / 14) * 100, 100)}%`
                }}
              />
              
              {/* Ovulation marker at start */}
              <div className="countdown-start-marker">
                <div className="marker-dot"></div>
                <div className="marker-label">Ovulation</div>
              </div>
              
              {/* Today marker - moving */}
              <div 
                className="countdown-marker"
                style={{ 
                  left: `${Math.min((todayData.daysSinceOvulation / 14) * 100, 100)}%`
                }}
              >
                <div className="marker-dot"></div>
                <div className="marker-label">Today</div>
              </div>
              
              {/* Expected menstruation marker at end */}
              <div className="countdown-end-marker">
                <div className="marker-dot"></div>
                <div className="marker-label">Period</div>
              </div>
            </div>
          </div>
          
          <div className="countdown-info">
            <p className="countdown-text">
              {todayData.daysSinceOvulation === 0 
                ? 'Ovulation detected today. Menstruation expected in ~14 days.'
                : todayData.daysSinceOvulation < 14
                ? `Day ${todayData.daysSinceOvulation} of 14. Menstruation expected in ${14 - todayData.daysSinceOvulation} day${14 - todayData.daysSinceOvulation !== 1 ? 's' : ''}.`
                : 'Menstruation expected to start soon.'}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}

export default HomePage;
