// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css'; // 전역 스타일 여기서 불러옴
import '../features/schedule/styles/Calendar.css'; // 캘린더 스타일도 여기서

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);