import React, { useState } from 'react';
import axios from 'axios';
import './TipsPage.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function TipsPage() {
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isAsking, setIsAsking] = useState(false);


  const askLuna = async (e) => {
    e.preventDefault();
    if (!question.trim() || isAsking) return;

    const userQuestion = question.trim();
    setQuestion('');
    setIsAsking(true);

    // Add user question to chat history
    const newUserMessage = {
      type: 'user',
      text: userQuestion,
      timestamp: new Date().toISOString()
    };
    setChatHistory(prev => [...prev, newUserMessage]);

    try {
      const response = await axios.post(`${API_BASE_URL}/bunny/ask`, {
        question: userQuestion
      });
      
      // Add Luna's response to chat history
      const lunaResponse = {
        type: 'luna',
        text: response.data.answer,
        timestamp: response.data.timestamp
      };
      setChatHistory(prev => [...prev, lunaResponse]);
    } catch (err) {
      console.error('Error asking Luna:', err);
      let errorMessage = "I'm having trouble right now. Please try again later!";
      
      if (err.response) {
        // Server responded with error
        if (err.response.status === 429) {
          errorMessage = "I've reached my daily limit. Please try again tomorrow! 🌙";
        } else if (err.response.status === 503) {
          errorMessage = "I'm not available right now. Make sure GEMINI_API_KEY is configured.";
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        }
      } else if (err.request) {
        // Request was made but no response
        errorMessage = "I can't connect right now. Is the backend server running?";
      }
      
      const errorResponse = {
        type: 'luna',
        text: errorMessage,
        timestamp: new Date().toISOString(),
        error: true
      };
      setChatHistory(prev => [...prev, errorResponse]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="tips-page">
      {/* Header */}
      <div className="tips-header">
        <div className="header-icons-group">
          <img 
            src="/images/computer_bunny.gif" 
            alt="Luna AI" 
            className="computer-bunny-gif"
          />
        </div>
        <h1 className="tips-title">Chat with Luna</h1>
        <p className="tips-subtitle">Your AI cycle companion</p>
      </div>

      {/* Decorative line */}
      <div className="decorative-line">
        <div className="gradient-line"></div>
      </div>

      {/* Ask Luna Chat Section */}
      <div className="bunny-chat-section">
        <div className="chat-header">
          <h2 className="chat-title">Ask Luna</h2>
          <p className="chat-subtitle">Have a question about your cycle? Luna is here to help!</p>
        </div>

        {/* Chat History */}
        {chatHistory.length > 0 && (
          <div className="chat-history">
            {chatHistory.map((message, idx) => (
              <div key={idx} className={`chat-message ${message.type}`}>
                <div className="chat-message-avatar">
                  <img 
                    src={message.type === 'user' ? '/images/user.png' : '/images/ai_bunny.png'} 
                    alt={message.type === 'user' ? 'User' : 'Luna'} 
                    className="avatar-img"
                  />
                </div>
                <div className="chat-message-content">
                  <div className="chat-message-text">{message.text}</div>
                  {message.error && (
                    <div className="chat-error-note">Please try again later</div>
                  )}
                </div>
              </div>
            ))}
            {isAsking && (
              <div className="chat-message luna">
                <div className="chat-message-avatar">
                  <img 
                    src="/images/ai_bunny.png" 
                    alt="Luna" 
                    className="avatar-img"
                  />
                </div>
                <div className="chat-message-content">
                  <div className="chat-typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chat Input */}
        <form onSubmit={askLuna} className="chat-input-form">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask Luna anything about your cycle..."
            className="chat-input"
            disabled={isAsking}
          />
          <button
            type="submit"
            className="chat-send-button"
            disabled={!question.trim() || isAsking}
          >
            {isAsking ? '...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default TipsPage;
