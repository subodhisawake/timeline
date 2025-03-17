import React from 'react';
import Globe from './components/Globe';
import { Box } from '@mui/material';

function App() {
  return (
    <Box sx={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Globe />
    </Box>
  );
}

export default App;
