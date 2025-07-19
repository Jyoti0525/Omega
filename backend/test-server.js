// // Create this as backend/test-server.js
// const express = require('express');
// const cors = require('cors');
// require('dotenv').config();

// const app = express();

// // Basic middleware
// app.use(cors({
//   origin: ['http://localhost:3000', 'http://localhost:8000'],
//   credentials: true
// }));

// app.use(express.json());

// // Test routes
// app.get('/test', (req, res) => {
//   console.log('✅ /test route hit');
//   res.json({
//     success: true,
//     message: 'Backend server is working perfectly!',
//     timestamp: new Date().toISOString(),
//     port: process.env.PORT || 8000
//   });
// });

// app.get('/api/test', (req, res) => {
//   console.log('✅ /api/test route hit');
//   res.json({
//     success: true,
//     message: 'API endpoint is working perfectly!',
//     timestamp: new Date().toISOString(),
//     port: process.env.PORT || 8000
//   });
// });

// app.get('/', (req, res) => {
//   res.json({
//     success: true,
//     message: 'Minimal server is running',
//     routes: ['/test', '/api/test']
//   });
// });

// // Catch all
// app.use('*', (req, res) => {
//   console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
//   res.status(404).json({
//     success: false,
//     message: 'Route not found',
//     requestedUrl: req.originalUrl,
//     availableRoutes: ['/', '/test', '/api/test']
//   });
// });

// const PORT = process.env.PORT || 8000;

// app.listen(PORT, () => {
//   console.log(`🚀 Minimal server running on http://localhost:${PORT}`);
//   console.log(`Test: http://localhost:${PORT}/test`);
//   console.log(`API Test: http://localhost:${PORT}/api/test`);
// });