const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import configurations and handlers
const { connectDB, checkDBHealth } = require('./config/db');
const socketHandler = require('./socket/socketHandler');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chat');
const uploadRoutes = require('./routes/upload');

// Create Express app
const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Basic middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logging middleware
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path}`);
  next();
});

// =================== ROUTES (BEFORE 404 HANDLER) ===================

// Test routes
app.get('/test', (req, res) => {
  console.log('✅ /test route hit');
  res.json({
    success: true,
    message: 'Backend server is working perfectly!',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 8000
  });
});

app.get('/api/test', (req, res) => {
  console.log('✅ /api/test route hit');
  res.json({
    success: true,
    message: 'API endpoint is working perfectly!',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 8000
  });
});

// Health check
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkDBHealth();
    res.json({
      success: true,
      message: 'Server is running',
      data: {
        server: 'healthy',
        database: dbHealth,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 8000
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Server health check failed',
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MERN Chat Application API',
    version: '1.0.0',
    port: process.env.PORT || 8000,
    endpoints: {
      test: '/test',
      apiTest: '/api/test',
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      chat: '/api/chat',
      upload: '/api/upload'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);

// Test upload endpoint
app.post('/api/upload/test', (req, res) => {
  console.log('✅ Upload test endpoint hit');
  res.json({
    success: true,
    message: 'Upload endpoint is working!',
    timestamp: new Date().toISOString()
  });
});

// =================== 404 HANDLER (MUST BE LAST) ===================
app.use('*', (req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    requestedUrl: req.originalUrl,
    availableEndpoints: [
      '/',
      '/test',
      '/api/test',
      '/health',
      '/api/auth/login',
      '/api/auth/signup'
    ]
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('❌ Error:', error.message);
  res.status(500).json({
    success: false,
    message: error.message
  });
});

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:8000'],
    methods: ["GET", "POST"],
    credentials: true
  }
});

socketHandler(io);

// Start server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log('\n🚀 ========================================');
  console.log(`🌟 MERN Chat App Server Running`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🔗 Test: http://localhost:${PORT}/test`);
  console.log(`🔗 API Test: http://localhost:${PORT}/api/test`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log('🚀 ========================================\n');
});

module.exports = { app, server, io };