import React from 'react';
import { Slider } from '@mui/material';
import PropTypes from 'prop-types';
import '../styles/Timeline.css';

const Timeline = ({ selectedYear, onYearChange }) => {
  return (
    <div className="timeline-container">
      <Slider
        className="timeline-slider"
        value={selectedYear}
        onChange={onYearChange}
        min={1900}
        max={2023}
        valueLabelDisplay="auto"
        valueLabelFormat={(value) => `${value}`}
        sx={{
          '& .MuiSlider-valueLabel': {
            backgroundColor: '#4a90e2',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '0.875rem'
          }
        }}
      />
    </div>
  );
};

Timeline.propTypes = {
  selectedYear: PropTypes.number.isRequired,
  onYearChange: PropTypes.func.isRequired
};

export default Timeline;
