import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.tsx';

// 這裡使用 document.getElementById('root') 來找到 public/index.html 中的根元素
const container = document.getElementById('root');

if (container) {
  // 使用 React 18 的新 API 建立根
  const root = ReactDOM.createRoot(container);

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Failed to find the root element with ID 'root' in the document.");
}
