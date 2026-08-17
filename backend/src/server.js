import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import staffRoutes from './routes/staff.js';
import appointmentRoutes from './routes/appointments.js';
import queueRoutes from './routes/queue.js';
import queryRoutes from './routes/queries.js';
import pharmacyRoutes from './routes/pharmacy.js';
import leaveRoutes from './routes/leave.js';
import departmentRoutes from './routes/departments.js';
import analyticsRoutes from './routes/analytics.js';
import scheduleRoutes from './routes/schedule.js';
import patientRoutes from './routes/patients.js';
import billingRoutes from './routes/billing.js';
import financeRoutes from './routes/finance.js';
import encounterRoutes from './routes/encounters.js';
import ipdRoutes from './routes/ipd.js';
import auditLogRoutes from './routes/auditLogs.js';
import ambulanceRoutes from './routes/ambulance.js';
import staffMessageRoutes from './routes/staffMessages.js';
import announcementRoutes from './routes/announcements.js';
import chatbotRoutes from './routes/chatbot.js';
import patientChatbotRoutes from './routes/patientChatbot.js';
import captchaRoutes from './routes/captcha.js';
import { startAppointmentAutoCancelJob } from './jobs/autoCancelAppointments.js';

// Middleware
import { authenticate, requirePasswordReset } from './middleware/auth.js';
import Department from './models/Department.js';
import QueueToken from './models/QueueToken.js';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// CORS middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Trust the first proxy hop (Render/Railway/nginx/etc all sit in front of
// this in real deployments) so req.ip and the Secure-cookie/rate-limit logic
// see the real client IP instead of the proxy's.
app.set('trust proxy', 1);

// --- Database connection resilience -----------------------------------
// Previously mongoose.connect() was fire-and-forget with no timeout, retry,
// or startup health check - this is exactly what caused the "Send OTP hangs
// forever" bug: if Mongo was unreachable, every request touching the DB just
// hung indefinitely instead of failing fast and loud.
let dbReady = false;
let dbLastError = null;

mongoose.set('strictQuery', true);

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/heartstone', {
    serverSelectionTimeoutMS: 8000, // fail fast instead of hanging forever
    socketTimeoutMS: 20000,
  })
  .catch((err) => {
    // connect() rejecting means we never got a working connection at all -
    // log loudly and keep dbReady=false so /healthz reports it accurately.
    dbLastError = err;
    console.error('FATAL: could not establish initial MongoDB connection:', err.message);
  });

const db = mongoose.connection;
db.on('error', (err) => {
  dbLastError = err;
  console.error('MongoDB connection error:', err);
});
db.once('open', () => {
  dbReady = true;
  dbLastError = null;
  console.log('MongoDB connected');
  // Sweeps for booked appointments whose slot time has passed and marks
  // them cancelled - see src/jobs/autoCancelAppointments.js for the grace
  // window and exact rule.
  startAppointmentAutoCancelJob();
});
db.on('disconnected', () => {
  dbReady = false;
  console.error('MongoDB disconnected');
});
db.on('reconnected', () => {
  dbReady = true;
  console.log('MongoDB reconnected');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/encounters', encounterRoutes);
app.use('/api/ipd', ipdRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/ambulance', ambulanceRoutes);
app.use('/api/messages', staffMessageRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/patient-chatbot', patientChatbotRoutes);
app.use('/api/captcha', captchaRoutes);

// Real health check: actually pings the DB rather than unconditionally
// returning 200. Section 4/9 requirement - a load balancer or uptime monitor
// pointed at this should genuinely go red if the DB is unreachable, not stay
// green while every real request 500s/hangs behind the scenes.
app.get('/healthz', async (req, res) => {
  const readyStateOk = mongoose.connection.readyState === 1; // 1 = connected
  let pingOk = false;
  if (readyStateOk) {
    try {
      await mongoose.connection.db.admin().ping();
      pingOk = true;
    } catch (err) {
      dbLastError = err;
    }
  }

  const healthy = dbReady && readyStateOk && pingOk;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'unhealthy',
    db: {
      connected: readyStateOk,
      ping: pingOk,
      error: healthy ? undefined : dbLastError?.message,
    },
    uptimeSeconds: Math.round(process.uptime()),
  });
});

// Kept as an alias for anything already pointed at the old path -
// intentionally NOT a dumb always-200: it delegates to the same real check.
app.get('/health', async (req, res) => {
  const readyStateOk = mongoose.connection.readyState === 1;
  let pingOk = false;
  if (readyStateOk) {
    try {
      await mongoose.connection.db.admin().ping();
      pingOk = true;
    } catch {
      // handled below
    }
  }
  const healthy = dbReady && readyStateOk && pingOk;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'unhealthy',
    message: healthy ? 'HeartStone API is running' : 'HeartStone API is running but the database is unreachable',
  });
});

// Socket.IO middleware - authenticate socket connections
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
});

// See socket.on('join-department', ...) below for how this is used.
async function isAuthorizedForDepartment(user, departmentId) {
  if (!user || !departmentId) return false;

  if (['admin', 'receptionist'].includes(user.role)) {
    // Still must be a real department, not an arbitrary/forged id.
    const dept = await Department.exists({ _id: departmentId });
    return Boolean(dept);
  }

  if (['doctor', 'nurse', 'pharmacist'].includes(user.role)) {
    return Boolean(user.department) && String(user.department) === String(departmentId);
  }

  if (user.role === 'patient') {
    const activeToken = await QueueToken.exists({
      patientId: user._id,
      department: departmentId,
      status: { $in: ['waiting', 'in-progress'] },
    });
    return Boolean(activeToken);
  }

  return false;
}

// Socket.IO connection
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Reception/admin get real-time ambulance alerts - a dedicated room so this
  // is never broadcast to every connected patient socket too.
  if (['receptionist', 'admin'].includes(socket.user?.role)) {
    socket.join('dispatch');
  }

  // Join department room for queue updates. A socket may only subscribe to a
  // department its authenticated user actually has a reason to see:
  //  - admin/receptionist: any real department (front-desk/ops visibility)
  //  - doctor/nurse/pharmacist: only their own assigned department
  //  - patient: only a department they currently have an active queue token in
  // This prevents an authenticated-but-unrelated user from listening in on
  // another department's real-time queue traffic.
  socket.on('join-department', async (departmentId) => {
    try {
      const authorized = await isAuthorizedForDepartment(socket.user, departmentId);
      if (!authorized) {
        console.warn(`Socket ${socket.id} (user ${socket.user?._id}) denied join for department-${departmentId}`);
        return;
      }
      socket.join(`department-${departmentId}`);
      console.log(`Socket ${socket.id} joined department-${departmentId}`);
    } catch (err) {
      console.error('join-department authorization error:', err);
    }
  });

  // Leave department room
  socket.on('leave-department', (departmentId) => {
    socket.leave(`department-${departmentId}`);
    console.log(`Socket ${socket.id} left department-${departmentId}`);
  });

  // Queue status broadcasts are no longer client-authoritative: a browser
  // can no longer forge a queue-update event that gets relayed to every
  // other client in a department room. Real queue-status-updated events are
  // now emitted server-side, from the queue controller, only after the
  // database has actually been mutated (see controllers/queueController.js).
  // This handler is intentionally not wired to any outbound broadcast.

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Export io for use in controllers if needed
app.set('io', io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`HeartStone API running on port ${PORT}`);
});
