import React, { useState, useEffect, useRef } from 'react';
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
import { getCurrentDate, getCurrentDateKeyUTC } from '../utils/currentDate';

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
  const [selectedDate, setSelectedDate] = useState(getCurrentDate());
  const [currentMonth, setCurrentMonth] = useState(getCurrentDate());
  const [calendarData, setCalendarData] = useState(null);
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const lastDateKeyRef = useRef(getCurrentDateKeyUTC());

  useEffect(() => {
    fetchAllData(year, month);
  }, [year, month]);

  useEffect(() => {
    const handler = () => {
      const now = getCurrentDate();
      lastDateKeyRef.current = getCurrentDateKeyUTC();
      setCurrentMonth(now);
      setSelectedDate(now);
      fetchAllData(now.getFullYear(), now.getMonth());
    };
    window.addEventListener('luna:sim-date-changed', handler);
    return () => window.removeEventListener('luna:sim-date-changed', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the app stays open and “today” changes (real midnight, or demo date changes elsewhere),
  // refetch so the menstruation countdown and predictions move.
  useEffect(() => {
    const id = setInterval(() => {
      const key = getCurrentDateKeyUTC();
      if (key !== lastDateKeyRef.current) {
        lastDateKeyRef.current = key;
        const now = getCurrentDate();
        setCurrentMonth(now);
        setSelectedDate(now);
        fetchAllData(now.getFullYear(), now.getMonth());
      }
    }, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync selectedDate when currentMonth changes
  useEffect(() => {
    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = selectedDate.getMonth();
    
    if (selectedYear !== year || selectedMonth !== month) {
      const today = getCurrentDate();
      if (today.getFullYear() === year && today.getMonth() === month) {
        setSelectedDate(new Date(year, month, today.getDate()));
      } else {
        setSelectedDate(new Date(year, month, 1));
      }
    }
  }, [year, month]);

  const fetchAllData = async (y = year, m = month) => {
    try {
      setLoading(true);
      const [tempRes, calendarRes, todayRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/data/chart`),
        axios.get(`${API_BASE_URL}/temperature/calendar`, {
          params: { year: y, month: m }
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

  const formatChartDate = (dateStr) => {
    // dateStr is YYYY-MM-DD (UTC). Use midday UTC to avoid timezone day-shifts when formatting.
    try {
      return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const mostLikelyPeriod = todayData?.periodPrediction?.mostLikely; // YYYY-MM-DD
  const expectedPeriod = mostLikelyPeriod
    ? (() => {
        const [y, m, d] = mostLikelyPeriod.split('-').map((v) => parseInt(v, 10));
        if (!y || !m || !d) return null;
        return { y, mIndex: m - 1, d };
      })()
    : null;

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
                dataKey="date"
                label={{ value: "Date", position: "insideBottom", offset: 5 }}
                stroke="#4a2f3f"
                tick={{ fill: "#4a2f3f", fontSize: 12 }}
                height={60}
                tickFormatter={formatChartDate}
                interval="preserveStartEnd"
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
                labelFormatter={(label) => formatChartDate(label)}
                formatter={(value) => {
                  if (value === null || value === undefined) return ['—', 'BBT'];
                  return [`${value}°C`, 'BBT'];
                }}
              />
              <Line
                type="monotone"
                dataKey="temp"
                stroke="#9d7089"
                strokeWidth={3}
                connectNulls={true}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (!payload || payload.temp === null || payload.temp === undefined) return null;
                  if (payload && payload.isOvulationDay) {
                    return <circle cx={cx} cy={cy} r={6} fill="#93a7d1" stroke="#fff" strokeWidth={2} />;
                  }
                  return <circle cx={cx} cy={cy} r={4} fill="#9d7089" strokeWidth={2} />;
                }}
                activeDot={(props) => {
                  const { cx, cy, payload } = props;
                  if (!payload || payload.temp === null || payload.temp === undefined) return null;
                  return <circle cx={cx} cy={cy} r={6} fill="#9d7089" stroke="#fff" strokeWidth={2} />;
                }}
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

            const now = getCurrentDate();
            const isToday =
              day === now.getDate() &&
              month === now.getMonth() &&
              year === now.getFullYear();

            const dayData = getDayData(day);
            const isOvulationDay = dayData?.isOvulationDay;
            const isExpectedPeriodDay =
              !!expectedPeriod &&
              year === expectedPeriod.y &&
              month === expectedPeriod.mIndex &&
              day === expectedPeriod.d;

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(new Date(year, month, day))}
                className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
              >
                <span className="day-number">{day}</span>
                {isOvulationDay && (
                  <div className="ovulation-marker" title="Ovulation detected">
                    <img
                      src="/images/star.png"
                      alt="Ovulation"
                      className="ovulation-star"
                    />
                  </div>
                )}
                {isExpectedPeriodDay && (
                  <div className="period-dot" title="Expected period start" />
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
                  <img
                    src="/images/star.png"
                    alt="Ovulation"
                    className="ovulation-star-small"
                  />
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

    </div>
  );
}

export default HomePage;
