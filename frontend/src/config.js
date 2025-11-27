// frontend/src/config.js
const config = {
  // Detectar ambiente automáticamente
  API_BASE_URL: window.location.hostname === 'localhost' 
    ? 'http://https://puntoventa-happi.onrender.com//api'
    : 'https://dashboard-backend.onrender.com/api'  // ← TU URL REAL
};

export default config;