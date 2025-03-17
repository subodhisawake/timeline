import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

// In your index.js or App.js
import { AuthProvider } from './context/AuthContext';

// Wrap your app with AuthProvider
ReactDOM.render(
  <AuthProvider>
    <App />
  </AuthProvider>,
  document.getElementById('root')
);
