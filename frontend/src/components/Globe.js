import React, { useState, useEffect, useRef } from 'react';
import Globe from 'react-globe.gl';
import { Slider, Typography, Button, CircularProgress } from '@mui/material';
import * as THREE from 'three';
import '../styles/Globe.css';
import TiledGlobe from './TiledGlobe';

const GlobeComponent = () => {
  const globeRef = useRef();
  const [year, setYear] = useState(125);
  const [dragging, setDragging] = useState(false);
  const [isTimelinePhase, setIsTimelinePhase] = useState(true);
  const previousRotationY = useRef(0);
  const [loading, setLoading] = useState(false);

  const ROTATION_MULTIPLIER = 50;
  const MIN_YEAR = 0;
  const MAX_YEAR = 2023;

  // Configure globe controls based on current phase
  useEffect(() => {
    if (globeRef.current) {
      const globe = globeRef.current;
      const controls = globe.controls();
      const camera = globe.camera();

      if (isTimelinePhase) {
        // Phase One: Restrict to left-right rotation only
        controls.enableZoom = false;
        controls.enablePan = false;
        camera.position.set(0, 0, 400);
        globe.scene().rotation.x = 0;
        globe.scene().rotation.z = 0;
        controls.enableRotate = true;
        controls.rotateSpeed = 0.5;
        controls.autoRotate = false;
      }
    }
  }, [isTimelinePhase]);

  const handleYearChange = (event, newValue) => {
    if (isTimelinePhase) {
      setYear(newValue);
      if (globeRef.current) {
        const rotation = ((2023 - newValue) / (MAX_YEAR - MIN_YEAR)) * (ROTATION_MULTIPLIER * 2 * Math.PI);
        globeRef.current.scene().rotation.y = rotation;
      }
    }
  };

  const handleMouseDown = () => {
    if (isTimelinePhase) {
      setDragging(true);
      if (globeRef.current) {
        previousRotationY.current = globeRef.current.scene().rotation.y;
      }
    }
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  const handleMouseMove = (event) => {
    if (dragging && globeRef.current && isTimelinePhase) {
      const deltaX = event.movementX;
      const newRotation = previousRotationY.current - deltaX * 0.002;

      // Update the globe rotation to reflect the swipe
      globeRef.current.scene().rotation.y = newRotation;

      // Convert the rotation back to a year and update the timeline
      const newYear = Math.round(2023 - (newRotation / (ROTATION_MULTIPLIER * 2 * Math.PI)) * (MAX_YEAR - MIN_YEAR));
      if (newYear >= MIN_YEAR && newYear <= MAX_YEAR) {
        setYear(newYear);
      }
    }
  };

  // If we're in Phase Two, render the TiledGlobe component instead
  if (!isTimelinePhase) {
    return <TiledGlobe initialYear={year} onBackToTimeline={() => setIsTimelinePhase(true)} />;
  }

  // Otherwise, render the original timeline selection globe
  return (
    <div className="globe-container">
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      />

      <div className="timeline-container">
        <Typography variant="h6" style={{ color: 'white', marginBottom: '8px' }}>
          Year: {year}
        </Typography>
        <Slider
          value={year}
          onChange={handleYearChange}
          min={MIN_YEAR}
          max={MAX_YEAR}
          valueLabelDisplay="auto"
          style={{ width: '90vw', color: 'white' }}
        />
        <Button
          className="timeline-select-button"
          onClick={() => setIsTimelinePhase(false)}
          style={{ marginTop: '10px' }}
        >
          Select Timeline
        </Button>
      </div>

      {loading && (
        <CircularProgress 
          style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        />
      )}
    </div>
  );
};

export default GlobeComponent;
