const express = require('express');
const cors = require('cors');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

// Security middleware imports
const { securityHeaders, httpsRedirect, preventParamPollution, xssProtection, suspiciousActivityLogger } = require('./middleware/security');
const { apiLimiter, loginLimiter } = require('./middleware/rateLimiter');
const { sanitizeInputs } = require('./middleware/inputValidation');

// Route imports
const studentRoutes = require('./routes/studentRoutes');
const studentListRoutes = require('./routes/studentListRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const viewStudentAttendanceRoutes = require('./routes/viewStudentAttendanceRoutes');
const studentFaultsRoutes = require('./routes/studentFaultsRoutes');
const markListRoutes = require('./routes/markListRoutes');
const evaluationRoutes = require('./routes/evaluations');
const staffRoutes = require('./routes/staffRoutes');
const postRoutes = require('./routes/postRoutes');
const chatRoutes = require('./routes/chatRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const schoolSetupRoutes = require('./routes/schoolSetupRoutes');
const task6Routes = require('./routes/task6Routes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const adminRoutes = require('./routes/adminRoutes');
const guardianListRoutes = require('./routes/guardianListRoutes');
const studentAttendanceRoutes = require('./routes/studentAttendanceRoutes');
const classTeacherRoutes = require('./routes/classTeacherRoutes');
const adminAttendanceRoutes = require('./routes/adminAttendanceRoutes');
const classCommunicationRoutes = require('./routes/classCommunicationRoutes');
const guardianAttendanceRoutes = require('./routes/guardianAttendanceRoutes');
const evaluationBookRoutes = require('./routes/evaluationBookRoutes');
const subAccountRoutes = require('./routes/subAccountRoutes');
const reportsRoutes = require('./routes/reportsRoutes');

const app = express();

// Create HTTP or HTTPS server based on environment
let server;
if (process.env.NODE_ENV === 'production' && process.env.HTTPS_ENABLED === 'true') {
  // HTTPS configuration for production
  const sslOptions = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH || './ssl/private.key'),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH || './ssl/certificate.crt')
  };
  server = https.createServer(sslOptions, app);
  console.log('HTTPS server created');
} else {
  server = http.createServer(app);
  console.log('HTTP server created (development mode)');
}
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      process.env.FRONTEND_URL
    ].filter(Boolean),
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization'],
    credentials: true
  }
});
app.set('socketio', io);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room (socket: ${socket.id})`);
    // Log all rooms this socket is in
    console.log(`Socket ${socket.id} is now in rooms:`, Array.from(socket.rooms));
  });
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// ===========================================
// SECURITY MIDDLEWARE (Order matters!)
// ===========================================

// 1. HTTPS redirect (production only)
app.use(httpsRedirect);

// 2. Security headers (helmet)
app.use(securityHeaders);

// 3. CORS configuration
// Allow both localhost (dev) and production URLs
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, health checks)
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  methods: 'GET,POST,PUT,DELETE,PATCH',
  credentials: true,
  maxAge: 86400 // Cache preflight for 24 hours
}));

// 4. Rate limiting - apply to all API routes
app.use('/api/', apiLimiter);

// 5. Apply stricter rate limiting to login routes
app.use('/api/admin/login', loginLimiter);
app.use('/api/staff/login', loginLimiter);

// 6. Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 7. Input sanitization
app.use(sanitizeInputs);

// 8. Prevent parameter pollution
app.use(preventParamPollution);

// 9. XSS protection for JSON responses
app.use(xssProtection);

// 10. Log suspicious activity
app.use(suspiciousActivityLogger);

// ===========================================
// STATIC FILES
// ===========================================
// Serve static files - support both uppercase and lowercase paths
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));
app.use('/Uploads/posts', express.static(path.join(__dirname, 'Uploads/posts')));
app.use('/uploads/posts', express.static(path.join(__dirname, 'Uploads/posts')));
app.use('/uploads/branding', express.static(path.join(__dirname, 'uploads/branding')));

// Test route to check if server is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Database health check endpoint
const pool = require('./config/db');
app.get('/api/db-health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, current_database() as database');
    res.json({ 
      status: 'OK', 
      message: 'Database connected successfully',
      database: result.rows[0].database,
      serverTime: result.rows[0].current_time
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Database connection failed',
      error: error.message,
      code: error.code,
      hint: error.code === '28000' ? 'PostgreSQL authentication failed. Check pg_hba.conf or database credentials.' :
            error.code === 'ECONNREFUSED' ? 'Cannot connect to PostgreSQL server. Is it running?' :
            'Check database configuration in .env file'
    });
  }
});

// Routes - IMPORTANT: Remove duplicate '/dashboard' from the path
app.use('/api/students', studentRoutes);
app.use('/api/student-list', studentListRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/view-attendance', viewStudentAttendanceRoutes);
app.use('/api/faults', studentFaultsRoutes);
app.use('/api/mark-list', markListRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/chats', chatRoutes); 
app.use('/api/schedule', scheduleRoutes);
app.use('/api/school-setup', schoolSetupRoutes);
app.use('/api/task6', task6Routes);
app.use('/api/dashboard', dashboardRoutes); // This is CORRECT - dashboardRoutes will have routes like '/stats'
app.use('/api/admin', adminRoutes);
app.use('/api/guardian-list', guardianListRoutes);
app.use('/api/student-attendance', studentAttendanceRoutes);
app.use('/api/class-teacher', classTeacherRoutes);
app.use('/api/admin-attendance', adminAttendanceRoutes);
app.use('/api/class-communication', classCommunicationRoutes);
app.use('/api/guardian-attendance', guardianAttendanceRoutes);
app.use('/api/evaluation-book', evaluationBookRoutes);
app.use('/api/admin/sub-accounts', subAccountRoutes);
app.use('/api/reports', reportsRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Dashboard endpoints available at:`);
  console.log(`  http://localhost:${PORT}/api/dashboard/stats`);
  console.log(`  http://localhost:${PORT}/api/dashboard/recent-faults`);
  console.log(`  http://localhost:${PORT}/api/dashboard/top-offenders`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});