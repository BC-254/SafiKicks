import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Design tokens must load first, then component styling
import './design-system/tokens.css';
import './design-system/components.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
