import React, { useState, useRef } from 'react';
import Map, { NavigationControl } from 'react-map-gl/maplibre';
import { Typography, Button } from '@mui/material';
import 'maplibre-gl/dist/maplibre-gl.css';
import MarkerLayer from './MarkerLayer';
import MapPostForm from './MapPostForm';
import '../styles/Globe.css';

const TiledGlobe = ({ initialYear, onBackToTimeline }) => {
  const [year, setYear] = useState(initialYear || 125);
  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 20,
    zoom: 1.5,
    bearing: 0,
    pitch: 0
  });
  const [clickedLocation, setClickedLocation] = useState(null);
  const [refreshMarkers, setRefreshMarkers] = useState(false);
  const mapRef = useRef();

  const handleMapClick = (event) => {
    if (viewState.zoom >= 3) { // Only allow posting when zoomed in
      const { lng, lat } = event.lngLat;
      setClickedLocation({ lng, lat });
    }
  };

  const goToRome = () => {
    setViewState({
      ...viewState,
      longitude: 12.4964,
      latitude: 41.9028,
      zoom: 10,
      pitch: 60,
      bearing: 20,
      transitionDuration: 2000
    });
  };

  const handlePostSubmit = () => {
    // Refresh the markers to show the new post
    setRefreshMarkers(prev => !prev);
  };

  return (
    <div className="globe-container">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={handleMapClick}
        mapStyle="https://demotiles.maplibre.org/style.json"
        style={{ width: '100%', height: '100vh' }}
        mapLib={import('maplibre-gl')}
        terrain={{ source: 'terrain', exaggeration: 1.5 }}
      >
        <MarkerLayer year={year} minZoom={3} refresh={refreshMarkers} />
        <NavigationControl position="top-left" />
      </Map>

      {clickedLocation && (
        <MapPostForm
          location={clickedLocation}
          year={year}
          onClose={() => setClickedLocation(null)}
          onSubmit={handlePostSubmit}
        />
      )}

      <div className="controls-container">
        <Button
          className="timeline-select-button"
          onClick={onBackToTimeline}
          style={{ position: 'absolute', top: '10px', right: '10px' }}
        >
          Pick Another Timeline
        </Button>
        <Typography
          variant="h6"
          style={{
            color: 'white',
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(0,0,0,0.5)',
            padding: '5px',
            borderRadius: '3px'
          }}
        >
          Year: {year}
        </Typography>
        
        <Button
          onClick={goToRome}
          variant="contained"
          style={{ position: 'absolute', bottom: '20px', right: '20px' }}
        >
          Go to Rome
        </Button>
        
        <Typography
          variant="body2"
          style={{
            color: 'white',
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            background: 'rgba(0,0,0,0.5)',
            padding: '5px',
            borderRadius: '3px'
          }}
        >
          Zoom: {viewState.zoom.toFixed(1)}x
          {viewState.zoom < 3 && " (Zoom in more to see markers)"}
          {viewState.zoom >= 3 && " (Click anywhere to add a historical post)"}
        </Typography>
      </div>
    </div>
  );
};

export default TiledGlobe;
