import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

import authRoutes from './routes/auth.js';
import staffRoutes from './routes/staff.js';
import appointmentRoutes from './routes/appointments.js';
import queueRoutes from './routes/queue.js';
import queryRoutes from './routes/queries.js';
import pharmacyRoutes from './routes/pharmacy.js';
import pharmacyOrderRoutes from './routes/pharmacyOrders.js';
import leaveRoutes from './routes/leave.js';
import departmentRoutes from './routes/departments.js';
import analyticsRoutes from './routes/analytics.js';
import scheduleRoutes from './routes/schedule.js';
import patientRoutes from './routes/patients.js';
import billingRoutes from './routes/billing.js';
import financeRoutes from './routes/finance.js';
import encounterRoutes from './routes/encounters.js';
import consultationRoutes from './routes/consultations.js';
import ipdRoutes from './routes/ipd.js';
import auditLogRoutes from './routes/auditLogs.js';
import ambulanceRoutes from './routes/ambulance.js';
import staffMessageRoutes from './routes/staffMessages.js';
import announcementRoutes from './routes/announcements.js';
import chatbotRoutes from './routes/chatbot.js';
import patientChatbotRoutes from './routes/patientChatbot.js';
import captchaRoutes from './routes/captcha.js';
import { startAppointmentAutoCancelJob } from './jobs/autoCancelAppointments.js';

import { authenticate, requirePasswordReset } from './middleware/auth.js';
import Department from './models/Department.js';
import QueueToken from './models/QueueToken.js';
import { verifyConsultationMembership } from './utils/consultationAuth.js';

const app = express();
const server = createServer(app);

const explicitOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const isProd = process.env.NODE_ENV === 'production';
const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function isAllowedOrigin(origin) {
  if (!origin) return true; 
  if (explicitOrigins.includes(origin)) return true;
  if (!isProd && localOriginPattern.test(origin)) return true;
  return false;
}

const corsOriginDelegate = (origin, callback) => {
  callback(null, isAllowedOrigin(origin));
};

const io = new SocketIOServer(server, {
  cors: {
    origin: corsOriginDelegate,
    credentials: true,
  },
});

app.use(
  cors({
    origin: corsOriginDelegate,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.set('trust proxy', 1);

let dbReady = false;
let dbLastError = null;

mongoose.set('strictQuery', true);

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/heartstone', {
    serverSelectionTimeoutMS: 8000, 
    socketTimeoutMS: 20000,
  })
  .catch((err) => {
    
    
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

app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/pharmacy-orders', pharmacyOrderRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/encounters', encounterRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/ipd', ipdRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/ambulance', ambulanceRoutes);
app.use('/api/messages', staffMessageRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/patient-chatbot', patientChatbotRoutes);
app.use('/api/captcha', captchaRoutes);

app.get('/healthz', async (req, res) => {
  const readyStateOk = mongoose.connection.readyState === 1; 
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

app.get('/health', async (req, res) => {
  const readyStateOk = mongoose.connection.readyState === 1;
  let pingOk = false;
  if (readyStateOk) {
    try {
      await mongoose.connection.db.admin().ping();
      pingOk = true;
    } catch {
      
    }
  }
  const healthy = dbReady && readyStateOk && pingOk;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'unhealthy',
    message: healthy ? 'HeartStone API is running' : 'HeartStone API is running but the database is unreachable',
  });
});

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

async function isAuthorizedForDepartment(user, departmentId) {
  if (!user || !departmentId) return false;

  if (['admin', 'receptionist'].includes(user.role)) {
    
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

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  
  
  if (['receptionist', 'admin'].includes(socket.user?.role)) {
    socket.join('dispatch');
  }

  
  
  if (['pharmacist', 'admin'].includes(socket.user?.role)) {
    socket.join('pharmacy');
  }

  
  
  
  
  if (socket.user?.role === 'patient') {
    socket.join(`patient-${socket.user._id}`);
  }

  
  
  
  
  
  
  
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

  
  socket.on('leave-department', (departmentId) => {
    socket.leave(`department-${departmentId}`);
    console.log(`Socket ${socket.id} left department-${departmentId}`);
  });

  
  
  
  
  
  

  
  
  
  
  
  
  
  
  
  const consultationRooms = new Set();

  socket.on('consultation:join-room', async ({ appointmentId } = {}) => {
    try {
      const { error, appointment, role } = await verifyConsultationMembership(appointmentId, socket.user);
      if (error) {
        console.warn(`Socket ${socket.id} (user ${socket.user?._id}) denied consultation room ${appointmentId}: ${error}`);
        socket.emit('consultation:error', { error });
        return;
      }
      const room = `consultation-${appointment._id}`;
      socket.join(room);
      consultationRooms.add(room);
      
      
      socket.to(room).emit('consultation:peer-joined', { role });
    } catch (err) {
      console.error('consultation:join-room error:', err);
    }
  });

  
  
  
  
  socket.on('consultation:signal', async ({ appointmentId, data } = {}) => {
    try {
      const room = `consultation-${appointmentId}`;
      if (!socket.rooms.has(room)) {
        
        return;
      }
      socket.to(room).emit('consultation:signal', { from: socket.user._id, role: socket.user.role, data });
    } catch (err) {
      console.error('consultation:signal error:', err);
    }
  });

  socket.on('consultation:leave-room', ({ appointmentId } = {}) => {
    const room = `consultation-${appointmentId}`;
    socket.leave(room);
    consultationRooms.delete(room);
    socket.to(room).emit('consultation:peer-left', { role: socket.user?.role });
  });

  
  
  
  
  socket.on('consultation:chat-message', async ({ appointmentId, text } = {}) => {
    try {
      const room = `consultation-${appointmentId}`;
      if (!socket.rooms.has(room)) return;
      const trimmed = String(text || '').trim().slice(0, 2000);
      if (!trimmed) return;
      const message = {
        id: `${socket.id}-${Date.now()}`,
        from: socket.user._id,
        role: socket.user.role,
        text: trimmed,
        at: new Date().toISOString(),
      };
      io.to(room).emit('consultation:chat-message', message);
    } catch (err) {
      console.error('consultation:chat-message error:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    
    
    for (const room of consultationRooms) {
      socket.to(room).emit('consultation:peer-left', { role: socket.user?.role, reason: 'disconnected' });
    }
  });
});

app.set('io', io);

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`HeartStone API running on port ${PORT}`);
});
