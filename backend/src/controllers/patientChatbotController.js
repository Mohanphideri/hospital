import Department from '../models/Department.js';
import Appointment from '../models/Appointment.js';
import Bill from '../models/Bill.js';
import Prescription from '../models/Prescription.js';
import Query from '../models/Query.js';
import QueueToken from '../models/QueueToken.js';
import Patient from '../models/Patient.js';
import { bookAppointment, cancelAppointment } from './appointmentController.js';
import { createQuery } from './queryController.js';
import { joinQueue } from './queueController.js';
import { getAvailableSlotsForBooking } from './scheduleController.js';

const MAX_MESSAGE_LENGTH = 1200;
const MAX_HISTORY_TURNS = 10;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const tools = [
  { name: 'get_departments', description: 'List hospital departments available to patients.', parameters: { type: 'object', properties: {} } },
  { name: 'get_available_slots', description: 'Find bookable appointment times for a department on a specific date. Use this before booking.', parameters: { type: 'object', properties: { department: { type: 'string', description: 'Department name' }, date: { type: 'string', description: 'Clinic date in YYYY-MM-DD format' } }, required: ['department', 'date'] } },
  { name: 'get_my_appointments', description: 'List the authenticated patient’s appointments. Never use this to access another patient.', parameters: { type: 'object', properties: {} } },
  { name: 'get_my_profile', description: 'Get the authenticated patient profile, excluding sensitive authentication data.', parameters: { type: 'object', properties: {} } },
  { name: 'get_my_bills', description: 'List bills belonging to the authenticated patient.', parameters: { type: 'object', properties: {} } },
  { name: 'get_my_prescriptions', description: 'List prescriptions belonging to the authenticated patient.', parameters: { type: 'object', properties: {} } },
  { name: 'get_my_tickets', description: 'List support tickets raised by the authenticated patient.', parameters: { type: 'object', properties: {} } },
  { name: 'get_my_queue', description: 'Get the authenticated patient’s active queue token and position.', parameters: { type: 'object', properties: {} } },
  { name: 'join_queue', description: 'Join the walk-in queue for a department. Only call when the patient explicitly asks to join the queue.', parameters: { type: 'object', properties: { department: { type: 'string', description: 'Department name' } }, required: ['department'] } },
  { name: 'book_appointment', description: 'Book an appointment for the authenticated patient. Only call after the patient has clearly requested a booking and the department, date and time are known. Use get_available_slots first. If the patient has no email on file, request one instead of guessing.', parameters: { type: 'object', properties: { department: { type: 'string', description: 'Department name' }, date: { type: 'string', description: 'Clinic date in YYYY-MM-DD format' }, time: { type: 'string', description: 'Clinic time in HH:MM 24-hour format' }, email: { type: 'string', description: 'Email only if required because the patient profile has no email' } }, required: ['department', 'date', 'time'] } },
  { name: 'cancel_appointment', description: 'Cancel one of the authenticated patient’s appointments. Only call when the patient explicitly asks to cancel. Use a valid reason.', parameters: { type: 'object', properties: { appointment_code: { type: 'string', description: 'Appointment ID/code' }, reason: { type: 'string', enum: ['Schedule conflict', 'Feeling better now', 'Found another doctor', 'Personal emergency', 'Other'] }, note: { type: 'string' } }, required: ['appointment_code', 'reason'] } },
  { name: 'raise_ticket', description: 'Create a hospital support ticket for the authenticated patient. Use for issues that require staff follow-up.', parameters: { type: 'object', properties: { subject: { type: 'string' }, message: { type: 'string' } }, required: ['subject', 'message'] } },
].map((t) => ({ functionDeclarations: [t] }));

const toolDeclarations = tools.flatMap((t) => t.functionDeclarations);

function historyForGemini(history) {
  if (!Array.isArray(history)) return [];
  return history.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content.trim().slice(0, MAX_MESSAGE_LENGTH) }] }));
}

function jsonSafe(value) {
  return JSON.parse(JSON.stringify(value, (_k, v) => (v instanceof Date ? v.toISOString() : v)));
}

async function findDepartment(name) {
  const departments = await Department.find().select('name isGeneral').lean();
  const needle = String(name || '').trim().toLowerCase();
  return departments.find((d) => d.name.toLowerCase() === needle) || departments.find((d) => d.name.toLowerCase().includes(needle) || needle.includes(d.name.toLowerCase()));
}

function mockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function runTool(name, args, req) {
  switch (name) {
    case 'get_departments':
      return jsonSafe(await Department.find().select('name isGeneral').sort({ name: 1 }).lean());
    case 'get_available_slots': {
      const dept = await findDepartment(args.department);
      if (!dept) return { error: `Department '${args.department}' was not found.` };
      const toolReq = { query: { departmentId: dept._id.toString(), date: args.date } };
      const res = mockResponse();
      await getAvailableSlotsForBooking(toolReq, res);
      return { department: dept.name, date: args.date, slots: res.body || [] };
    }
    case 'get_my_appointments':
      return jsonSafe(await Appointment.find({ patientId: req.user._id }).populate('doctorId', 'name consultationFee').populate('department', 'name').sort({ slotTime: -1 }).lean());
    case 'get_my_profile':
      return jsonSafe(await Patient.findById(req.user._id).select('name age gender email phone address').lean());
    case 'get_my_bills':
      return jsonSafe(await Bill.find({ patientId: req.user._id }).populate({ path: 'appointmentId', populate: [{ path: 'doctorId', select: 'name' }, { path: 'department', select: 'name' }] }).sort({ createdAt: -1 }).lean());
    case 'get_my_prescriptions':
      return jsonSafe(await Prescription.find({ patientId: req.user._id }).populate('doctorId', 'name').populate('appointmentId', 'appointmentCode slotTime').sort({ createdAt: -1 }).lean());
    case 'get_my_tickets':
      return jsonSafe(await Query.find({ patientId: req.user._id }).select('ticketId subject message status messages createdAt').sort({ createdAt: -1 }).lean());
    case 'get_my_queue':
      return jsonSafe(await QueueToken.findOne({ patientId: req.user._id, status: { $in: ['waiting', 'in-progress'] } }).populate('department', 'name').lean() || { token: null, message: 'Not in any queue' });
    case 'join_queue': {
      const dept = await findDepartment(args.department);
      if (!dept) return { error: `Department '${args.department}' was not found.` };
      const toolReq = { user: req.user, body: { departmentId: dept._id }, app: req.app };
      const res = mockResponse();
      await joinQueue(toolReq, res);
      return jsonSafe(res.body);
    }
    case 'book_appointment': {
      const dept = await findDepartment(args.department);
      if (!dept) return { error: `Department '${args.department}' was not found.` };
      const patient = await Patient.findById(req.user._id).lean();
      const email = args.email || patient?.email;
      if (!email) return { needs_email: true, message: 'The patient profile has no email address. Ask the patient for an email address before booking.' };
      const [year, month, day] = String(args.date).split('-').map(Number);
      const [hour, minute] = String(args.time).split(':').map(Number);
      if (![year, month, day, hour, minute].every(Number.isFinite)) return { error: 'Invalid date or time.' };
      // Convert clinic-local IST time to an ISO instant, matching the existing booking flow.
      const utcMs = Date.UTC(year, month - 1, day, hour, minute) - (5 * 60 + 30) * 60 * 1000;
      const toolReq = { user: req.user, body: { departmentId: dept._id.toString(), slotTime: new Date(utcMs).toISOString(), email }, ip: req.ip, headers: req.headers, app: req.app };
      const res = mockResponse();
      await bookAppointment(toolReq, res);
      return jsonSafe(res.body);
    }
    case 'cancel_appointment': {
      const appointment = await Appointment.findOne({ appointmentCode: String(args.appointment_code || '').trim().toUpperCase(), patientId: req.user._id }).lean();
      if (!appointment) return { error: 'That appointment ID was not found among your appointments.' };
      const toolReq = { user: req.user, params: { id: appointment._id.toString() }, body: { reason: args.reason, note: args.note || '' }, ip: req.ip, headers: req.headers, app: req.app };
      const res = mockResponse();
      await cancelAppointment(toolReq, res);
      return jsonSafe(res.body);
    }
    case 'raise_ticket': {
      const toolReq = { user: req.user, body: { subject: args.subject, message: args.message }, ip: req.ip, headers: req.headers, app: req.app };
      const res = mockResponse();
      await createQuery(toolReq, res);
      return jsonSafe(res.body);
    }
    default:
      return { error: `Unknown tool ${name}` };
  }
}

function systemInstruction() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  return `You are HeartStone Hospital's authenticated Patient Portal AI assistant. Today is ${today} in Asia/Kolkata.

You are an action-oriented hospital concierge. You can answer hospital/general-health questions and, through tools, help the logged-in patient manage their own care.

Rules:
- You may only access or change data belonging to the authenticated patient. Never ask for passwords, OTPs, tokens, payment card details, or another patient's information.
- For appointment booking: identify department, exact clinic date and time; check availability first. Never invent availability. If a requested time is unavailable, offer the returned alternatives. If email is missing, ask for it.
- For cancellation: only cancel when explicitly requested and use a valid reason. If the appointment ID is unclear, show the patient's appointments and ask which one.
- You may read appointments, bills, prescriptions, support tickets, profile, and queue status through tools. Summarize them without exposing internal IDs other than useful appointment/ticket identifiers.
- You may join a walk-in queue only when explicitly asked.
- You may raise a support ticket when the patient asks to contact hospital staff or reports an issue requiring staff action.
- General medical information is educational only. Do not diagnose, prescribe, or claim to replace a clinician. For possible emergencies, advise immediate emergency medical care and keep it concise.
- Never claim an action succeeded unless the tool result confirms it.
- Be concise, natural, and clear. Ask only for information actually missing from a requested action.`;
}

export const sendPatientChatbotMessage = async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'Gemini is not configured.' });
    const { message, history } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) return res.status(400).json({ error: 'A message is required' });
    if (message.trim().length > MAX_MESSAGE_LENGTH) return res.status(400).json({ error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)` });

    let contents = [...historyForGemini(history), { role: 'user', parts: [{ text: message.trim() }] }];
    for (let turn = 0; turn < 4; turn += 1) {
      const response = await fetch(`${GEMINI_API_URL}/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: systemInstruction() }] }, contents, tools: [{ functionDeclarations: toolDeclarations }], generationConfig: { temperature: 0.25, maxOutputTokens: 700 } }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('Patient Gemini API Error:', response.status, data?.error?.message || data);
        return res.status(502).json({ error: 'The patient assistant is temporarily unavailable. Please try again.' });
      }
      const modelContent = data?.candidates?.[0]?.content;
      const calls = (modelContent?.parts || []).filter((p) => p.functionCall).map((p) => p.functionCall);
      if (!calls.length) {
        const reply = (modelContent?.parts || []).map((p) => p.text || '').join('').trim();
        return res.json({ reply, model: GEMINI_MODEL });
      }

      contents.push(modelContent);
      for (const call of calls) {
        const result = await runTool(call.name, call.args || {}, req);
        contents.push({ role: 'user', parts: [{ functionResponse: { name: call.name, response: result } }] });
      }
    }
    return res.status(502).json({ error: 'The assistant could not complete that request. Please try again.' });
  } catch (error) {
    console.error('Patient Chatbot Error:', error);
    return res.status(500).json({ error: 'Failed to get a response from the patient assistant' });
  }
};
