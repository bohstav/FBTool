import React from 'react';
import { createRoot } from 'react-dom/client';
import '../sidebar/index.css';
import { Popup } from './Popup';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
