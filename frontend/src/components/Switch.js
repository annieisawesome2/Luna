import React from 'react';
import './Switch.css';

function Switch({ checked, onChange, disabled }) {
  return (
    <label className={`switch ${disabled ? 'disabled' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="slider"></span>
    </label>
  );
}

export default Switch;
