import { useState, useEffect } from "react";
import { useParams, useOutletContext, useNavigate, NavLink } from "react-router-dom";
import EmptyState from "../components/ui/EmptyState";
import { DataCard, DataGrid, StatusBadge, statusTone, EmptyRow, SectionToolbar, BillBreakdown } from "../components/ui/DataCard";
import { useAuth } from "../contexts/AuthContext.jsx";
import { downloadPrescriptionPdf } from "../utils/generatePrescriptionPdf";
import { downloadBillPdf } from "../utils/generateBillPdf";
import SkeletonList from "../components/ui/SkeletonList";
import { SearchInput } from "../components/ui/DataCard";
import { useAmbulanceAlerts } from "../contexts/AmbulanceAlertContext.jsx";
import { useConfirm } from "../contexts/ConfirmContext.jsx";
import { getSocket } from "../utils/socket.js";
import PatientPharmacyOrders from "./patient/PharmacyOrders.jsx";
import PharmacistPharmacyOrders from "./pharmacist/PharmacyOrdersDesk.jsx";
import PatientConsultations from "./patient/Consultations.jsx";
import DoctorConsultations from "./doctor/Consultations.jsx";
import {
  BellRing,
  CalendarDays,
  Users,
  Wallet,
  ClipboardList,
  UserCog,
  AlertTriangle,
  UserPlus,
  Stethoscope,
  Building2,
  Ambulance,
  BedDouble,
  Megaphone,
  CheckCircle2,
  XCircle,
  Clock3,
  History,
  CalendarClock,
  CalendarCheck2,
  Info,
  Receipt,
  ListChecks,
  ArrowRight,
  Mail,
} from "lucide-react";
import {
  appointmentService,
  queueService,
  pharmacyService,
  queryService,
  departmentService,
  staffService,
  leaveService,
  analyticsService,
  scheduleService,
  patientService,
  billingService,
  financeService,
  ambulanceService,
  encounterService,
  ipdService,
  auditLogService,
  messageService,
  announcementService,
} from "../services/index.js";
import { DAY_NAMES, TICKET_STATUSES, STAFF_ROLES, EMPTY_STAFF_FORM, EMPTY_MEDICINE_LINE } from "./sections/sectionShared.js";
import { renderTicketThreadImpl } from "../features/support/components/TicketThread.jsx";
import { renderMessagesBoardImpl } from "../features/staff-messaging/components/MessagesBoard.jsx";
import { renderAnnouncementsWorkspaceImpl } from "../features/announcements/components/AnnouncementsWorkspace.jsx";
import { renderIpdWorkspaceImpl } from "../features/ipd/components/IpdWorkspace.jsx";
import { renderSalarySlipsWorkspaceImpl } from "../features/finance/components/SalarySlipsWorkspace.jsx";
import { renderPatientContentImpl } from "./sections/PatientContent.jsx";
import { renderAmbulanceRequestsImpl } from "../features/ambulance/components/AmbulanceRequests.jsx";
import { renderAdminContentImpl } from "./sections/AdminContent.jsx";
import { renderProfileContentImpl } from "./sections/ProfileContent.jsx";
import { renderDoctorContentImpl } from "./sections/DoctorContent.jsx";
import { renderStaffContentImpl } from "./sections/StaffContent.jsx";
import { renderReceptionistContentImpl } from "./sections/ReceptionistContent.jsx";
import { renderPharmacistContentImpl } from "./sections/PharmacistContent.jsx";
import { renderHomeOverviewImpl } from "./sections/HomeOverview.jsx";
import { getClinicTodayString } from "../utils/clinicTime.js";

export default function Section() {
  const { section } = useParams();
  const navigate = useNavigate();
  const config = useOutletContext();
  const { user } = useAuth();
  const { incoming, consumeIncoming, clearUnread, notifPermission, requestNotificationPermission } = useAmbulanceAlerts();
  const confirm = useConfirm();
  const [searchQuery, setSearchQuery] = useState("");
  const current = config.sections.find((s) => s.path === section) ?? config.sections[0];
  // The real logged-in role (nurse / receptionist / doctor / pharmacist / admin / patient),
  // as opposed to config.role which is "staff" for the shared nurse/receptionist portal.
  const actualRole = user?.role || config.role;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);
  const [homeStats, setHomeStats] = useState(null);
  const [homeSummary, setHomeSummary] = useState(null);
  const [doctorApptDate, setDoctorApptDate] = useState(() => getClinicTodayString());
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [bookingStatus, setBookingStatus] = useState("");
  // "in-person" (default) or "online" - which kind of visit the patient is
  
  
  
  const [consultationType, setConsultationType] = useState("in-person");
  
  
  
  const [bookTypeChosen, setBookTypeChosen] = useState(false);
  
  
  const [bookEmailInput, setBookEmailInput] = useState("");

  // --- Admin-only state ---
  const [staffList, setStaffList] = useState([]);
  const [staffRoleFilter, setStaffRoleFilter] = useState("");
  const [newStaffResult, setNewStaffResult] = useState(null);
  const [staffForm, setStaffForm] = useState(EMPTY_STAFF_FORM);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [assignDoctorChoice, setAssignDoctorChoice] = useState({});
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [leaveTab, setLeaveTab] = useState("pending"); 
  const [leaveConflicts, setLeaveConflicts] = useState({}); 
  const [leaveRejectDrafts, setLeaveRejectDrafts] = useState({}); 
  const [leaveHistoryFilter, setLeaveHistoryFilter] = useState("all"); 
  const [allAppointments, setAllAppointments] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  
  
  
  
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearched, setAuditSearched] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditStaffId, setAuditStaffId] = useState("");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // --- Admin: wards & beds management ---
  const [newWardForm, setNewWardForm] = useState({ name: "", type: "general", floor: "", departmentId: "" });
  const [newWardStatus, setNewWardStatus] = useState("");
  const [newBedForm, setNewBedForm] = useState({ wardId: "", bedNumber: "", dailyCharge: "", careLevel: "normal" });
  const [newBedStatus, setNewBedStatus] = useState("");

  // --- Staff message board (all staff portals) ---
  const [staffMessages, setStaffMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [messageStatus, setMessageStatus] = useState("");

  // --- Admin: public announcements shown on the landing page ---
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncementForm, setNewAnnouncementForm] = useState({ title: "", message: "", eventDate: "" });
  const [announcementStatus, setAnnouncementStatus] = useState("");

  // --- Doctor-only state ---
  const [rxAppointmentId, setRxAppointmentId] = useState(null);
  const [rxMedicines, setRxMedicines] = useState([{ ...EMPTY_MEDICINE_LINE }]);
  const [rxNotes, setRxNotes] = useState("");
  const [rxStatus, setRxStatus] = useState("");

  // --- Clinical / EMR state (doctor records; nurse/receptionist/patient can view) ---
  const [clinicalLookupCode, setClinicalLookupCode] = useState("");
  const [clinicalLookupResult, setClinicalLookupResult] = useState(null); // { appointment, encounters }
  const [clinicalLookupSearched, setClinicalLookupSearched] = useState(false);
  const [clinicalLookupError, setClinicalLookupError] = useState("");
  const EMPTY_ENCOUNTER_FORM = {
    temperatureF: "",
    bloodPressure: "",
    pulseBpm: "",
    respiratoryRate: "",
    spo2: "",
    weightKg: "",
    heightCm: "",
    chiefComplaint: "",
    diagnosisText: "", // comma-separated, split on save
    clinicalNotes: "",
    followUpDate: "",
  };
  const [encounterForm, setEncounterForm] = useState(EMPTY_ENCOUNTER_FORM);
  const [encounterSaveStatus, setEncounterSaveStatus] = useState("");

  // --- IPD state (doctor / nurse / receptionist) ---
  const [wards, setWards] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [admissionStatusFilter, setAdmissionStatusFilter] = useState("admitted");
  const [admitForm, setAdmitForm] = useState({
    patientPhone: "",
    wardId: "",
    bedId: "",
    admittingDoctorId: "",
    reasonForAdmission: "",
    diagnosis: "",
  });
  const [admitStatus, setAdmitStatus] = useState("");
  const [transferChoice, setTransferChoice] = useState({}); // { [admissionId]: { wardId, bedId } }
  const [dischargeDrafts, setDischargeDrafts] = useState({}); // { [admissionId]: { summary, followUpInstructions } }
  const [ipdBillDrafts, setIpdBillDrafts] = useState({}); // { [admissionId]: { consultationFee, otherCharges, paymentMethod } }
  const [ipdActionStatus, setIpdActionStatus] = useState("");

  // --- Patient medical records state ---
  const [myEncounters, setMyEncounters] = useState([]);

  // --- Staff (nurse / receptionist) state ---
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "casual",
    fromDate: "",
    toDate: "",
    timeFrom: "",
    timeTo: "",
    reason: "",
    confirmed: false,
  });
  const [leaveApplyStatus, setLeaveApplyStatus] = useState("");
  const [lastRejectedLeave, setLastRejectedLeave] = useState(null);
  const [apptLookupValue, setApptLookupValue] = useState("");
  const [apptLookupResult, setApptLookupResult] = useState(null);
  const [apptLookupSearched, setApptLookupSearched] = useState(false);
  const [apptLookupError, setApptLookupError] = useState("");

  // --- Shared profile state (doctor + staff) ---
  const [profileData, setProfileData] = useState(null);
  const [profileForm, setProfileForm] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  // --- Patient: raise a new ticket ---
  const [newTicketForm, setNewTicketForm] = useState({ subject: "", message: "" });
  const [newTicketStatus, setNewTicketStatus] = useState("");

  // --- Tickets (patient queries) state - used across admin/doctor/staff/pharmacist/patient ---
  const [staffDirectory, setStaffDirectory] = useState([]); // for admin's assign-to dropdown
  const [ticketReplyDrafts, setTicketReplyDrafts] = useState({});
  const [patientReplyDrafts, setPatientReplyDrafts] = useState({});
  const [ticketActionMessage, setTicketActionMessage] = useState("");

  // --- Cancel appointment (with reason) state ---
  const [cancelReasons, setCancelReasons] = useState([]);
  const [cancelDrafts, setCancelDrafts] = useState({}); // { [appointmentId]: { reason, note } }
  const [openCancelId, setOpenCancelId] = useState(null);

  // --- Admin doctor-schedule management state ---
  const [scheduleDoctorId, setScheduleDoctorId] = useState("");
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(new Date().getDay());
  const [scheduleTimes, setScheduleTimes] = useState([]); // times already saved for doctor+day
  const [scheduleNewTime, setScheduleNewTime] = useState("09:00");
  
  
  
  const [scheduleNewCapacity, setScheduleNewCapacity] = useState(1);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState("");
  const [myWeeklySchedule, setMyWeeklySchedule] = useState(null); // doctor's own read-only view

  // --- Patient profile state ---
  const [patientProfile, setPatientProfile] = useState(null);
  const [patientProfileForm, setPatientProfileForm] = useState({ name: "", age: "", gender: "", email: "" });
  const [patientProfileSaving, setPatientProfileSaving] = useState(false);
  const [patientProfileMessage, setPatientProfileMessage] = useState("");

  // --- Pharmacist-only state ---
  const [lookupType, setLookupType] = useState("appointment");
  const [lookupValue, setLookupValue] = useState("");
  const [lookupResults, setLookupResults] = useState(null);
  const [lookupSearched, setLookupSearched] = useState(false);
  const [medicineCatalog, setMedicineCatalog] = useState([]); // full catalog, used to link a prescription line to real stock
  const [linkedMedicineChoice, setLinkedMedicineChoice] = useState({}); // { "rxId:index": medicineId }
  const [dispenseDrafts, setDispenseDrafts] = useState({}); 
  const [batchDrafts, setBatchDrafts] = useState({}); 
  const [expiringBatches, setExpiringBatches] = useState(null);
  const [addMedicineForm, setAddMedicineForm] = useState({
    name: "",
    unit: "tablets",
    batchNumber: "",
    quantity: "",
    price: "",
    expiryDate: "",
  });

  // --- Receptionist-only state ---
  const [receptionAppointments, setReceptionAppointments] = useState([]);
  const [receptionStatusFilter, setReceptionStatusFilter] = useState("");
  const [receptionDateFilter, setReceptionDateFilter] = useState(""); // "" = auto/default (today)
  const [receptionDoctorFilter, setReceptionDoctorFilter] = useState("");
  const [billLookupCode, setBillLookupCode] = useState("");
  const [billLookupResult, setBillLookupResult] = useState(null);
  const [billLookupSearched, setBillLookupSearched] = useState(false);
  const [billLookupError, setBillLookupError] = useState("");
  const [billMedicineChoices, setBillMedicineChoices] = useState({}); // { medicineIndex: bool }
  const [billAppointmentFee, setBillAppointmentFee] = useState("500");
  const [billConsultationFee, setBillConsultationFee] = useState("");
  const [billApplicationFee, setBillApplicationFee] = useState("");
  const [billOtherCharges, setBillOtherCharges] = useState([]); // [{ type, amount }]
  const [billDiscountAmount, setBillDiscountAmount] = useState("");
  const [billPaymentMethod, setBillPaymentMethod] = useState("cash");
  const [billGenerateStatus, setBillGenerateStatus] = useState("");
  const [billsList, setBillsList] = useState([]);
  const [receptionHome, setReceptionHome] = useState(null);
  const [adminHome, setAdminHome] = useState(null);
  const [doctorHome, setDoctorHome] = useState(null);
  const [nurseHome, setNurseHome] = useState(null);
  const [onBehalfTicketForm, setOnBehalfTicketForm] = useState({ patientPhone: "", subject: "", message: "" });
  const [onBehalfTicketStatus, setOnBehalfTicketStatus] = useState("");
  const [doctorReassignChoice, setDoctorReassignChoice] = useState({}); // { [appointmentId]: doctorId }

  // --- Book appointment (receptionist) state ---
  const [bookPatientMode, setBookPatientMode] = useState("existing"); 
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [patientSearchResults, setPatientSearchResults] = useState(null);
  const [patientSearchStatus, setPatientSearchStatus] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  // Only used when an existing patient (selected for booking) has no email
  // on file yet - an email is required to book (see submitBookAppointment).
  const [existingPatientEmailInput, setExistingPatientEmailInput] = useState("");
  const [newPatientForm, setNewPatientForm] = useState({
    name: "", phone: "", dob: "", gender: "", email: "", address: "", emergencyContactName: "", emergencyContactPhone: "",
  });
  const [bookDetails, setBookDetails] = useState({ departmentId: "", date: "", time: "" });
  const [availableDoctorsForSlot, setAvailableDoctorsForSlot] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState("");
  const [bookAppointmentStatus, setBookAppointmentStatus] = useState("");

  // Pending General-consultation requests (booked with no doctor/time yet)
  // and the front desk's in-progress draft for assigning each one a
  // doctor + time. Keyed by appointment id.
  const [pendingGeneralRequests, setPendingGeneralRequests] = useState([]);
  const [assignDraft, setAssignDraft] = useState({}); // { [appointmentId]: { doctorId, date, time } }
  const [assignStatus, setAssignStatus] = useState({}); // { [appointmentId]: string }

  // Receptionist Overview: which day's appointment count/list is shown.
  // Defaults to today until the receptionist picks a different date.
  const [overviewDate, setOverviewDate] = useState(() => getClinicTodayString());

  // --- Accountant-only state ---
  const [cashFlow, setCashFlow] = useState(null);
  const [salarySlips, setSalarySlips] = useState([]);
  const [salaryStaffList, setSalaryStaffList] = useState([]);
  const [salaryForm, setSalaryForm] = useState({ staffId: "", month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), basicSalary: "", bonus: "", deductions: "", notes: "" });
  const [salaryFormStatus, setSalaryFormStatus] = useState("");

  useEffect(() => {
    setError("");
    setPayload(null);
    setActionMessage("");
    setRxAppointmentId(null);
    setRxMedicines([{ ...EMPTY_MEDICINE_LINE }]);
    setRxNotes("");
    setRxStatus("");
    setConsultationType("in-person");
    setBookTypeChosen(false);
    setLeaveApplyStatus("");
    setProfileMessage("");
    setLookupResults(null);
    setLookupSearched(false);
    setApptLookupResult(null);
    setApptLookupSearched(false);
    setApptLookupError("");
    setBillLookupResult(null);
    setBillLookupSearched(false);
    setBillLookupError("");
    setBillMedicineChoices({});
    setBillGenerateStatus("");
    setOnBehalfTicketStatus("");
    setSalaryFormStatus("");
    setClinicalLookupResult(null);
    setClinicalLookupSearched(false);
    setClinicalLookupError("");
    setEncounterSaveStatus("");
    setAdmitStatus("");
    setIpdActionStatus("");
    setNewWardStatus("");
    setNewBedStatus("");
    setMessageStatus("");
    setAnnouncementStatus("");
    setSearchQuery("");
    setReceptionHome(null);
    setAdminHome(null);
    setDoctorHome(null);
    setNurseHome(null);
    setLeaveTab("pending");
    setLeaveHistoryFilter("all");
    setLoading(true);

    const fetchData = async () => {
      try {
        if (section === "my-salary") {
          const response = await financeService.getMySalarySlips();
          setPayload(response.data);
        } else if (section === "ambulance-requests") {
          const response = await ambulanceService.getAll();
          setPayload(response.data);
        } else if (section === "messages") {
          const response = await messageService.getAll();
          setStaffMessages(response.data || []);
        } else if (section === "announcements") {
          const response = await announcementService.getAll();
          setAnnouncements(response.data || []);
        } else if (section === "home" && config.role === "patient") {
          const [apptRes, ticketRes, announcementRes] = await Promise.all([
            appointmentService.getMyAppointments(),
            queryService.getMine(),
            announcementService.getPublic().catch(() => ({ data: [] })),
          ]);
          setHomeStats({ appointments: apptRes.data || [], tickets: ticketRes.data || [] });
          setAnnouncements(announcementRes.data || []);
        } else if (section === "home" && config.role === "receptionist") {
          
          
          
          
          
          
          const now = new Date();
          const [apptRes, admissionRes, ambulanceRes, billRes, deptRes] = await Promise.all([
            appointmentService.getAllAppointments({ date: overviewDate }).catch(() => ({ data: [] })),
            ipdService.getAdmissions().catch(() => ({ data: [] })),
            ambulanceService.getAll("pending").catch(() => ({ data: [] })),
            billingService.getBills().catch(() => ({ data: [] })),
            departmentService.getAll().catch(() => ({ data: [] })),
          ]);

          const todaysAppointments = (apptRes.data || []).sort(
            (a, b) => new Date(a.slotTime) - new Date(b.slotTime)
          );
          const admissionsToday = (admissionRes.data || []).filter((a) => {
            if (!a.admissionDate) return false;
            const d = new Date(a.admissionDate);
            return (
              d.getFullYear() === now.getFullYear() &&
              d.getMonth() === now.getMonth() &&
              d.getDate() === now.getDate()
            );
          });

          const departments = deptRes.data || [];
          const queueResults = await Promise.all(
            departments.map((d) =>
              queueService
                .getQueueStatus(d._id)
                .then((r) => ({ deptName: d.name, ...r.data }))
                .catch(() => null)
            )
          );
          const queueTokens = queueResults
            .filter(Boolean)
            .flatMap((r) => (r.tokens || []).map((t) => ({ ...t, department: r.department, deptName: r.deptName })))
            .filter((t) => t.status !== "done")
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

          setReceptionHome({
            todaysAppointments,
            queueTokens,
            admissionsTodayCount: admissionsToday.length,
            emergencyRequests: ambulanceRes.data || [],
            pendingBills: (billRes.data || []).filter((b) => b.status === "unpaid"),
          });
        } else if (section === "home" && config.role === "admin") {
          
          
          
          
          
          const [overviewRes, ambulanceRes, leaveRes, announcementRes] = await Promise.all([
            analyticsService.getOverview().catch(() => ({ data: null })),
            ambulanceService.getAll("pending").catch(() => ({ data: [] })),
            leaveService.getPending().catch(() => ({ data: [] })),
            announcementService.getAll().catch(() => ({ data: [] })),
          ]);
          setAdminHome({
            overview: overviewRes.data,
            emergencyRequests: ambulanceRes.data || [],
            pendingLeave: leaveRes.data || [],
          });
          setAnnouncements(announcementRes.data || []);
        } else if (section === "home" && config.role === "doctor") {
          
          
          
          const now = new Date();
          const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
          const [apptRes, admissionRes, ticketRes, leaveRes, announcementRes] = await Promise.all([
            appointmentService.getMyAppointments(todayStr).catch(() => ({ data: [] })),
            ipdService.getAdmissions("admitted").catch(() => ({ data: [] })),
            queryService.getAssigned().catch(() => ({ data: [] })),
            leaveService.getMine().catch(() => ({ data: [] })),
            announcementService.getPublic().catch(() => ({ data: [] })),
          ]);
          const todaysAppointments = (apptRes.data || []).sort(
            (a, b) => new Date(a.slotTime) - new Date(b.slotTime)
          );
          const myAdmissions = (admissionRes.data || []).filter(
            (a) => String(a.admittingDoctorId?._id || a.admittingDoctorId) === String(user?._id)
          );
          setDoctorHome({
            todaysAppointments,
            myAdmissions,
            openTickets: (ticketRes.data || []).filter((t) => t.status !== "closed"),
            pendingLeaveCount: (leaveRes.data || []).filter((l) => l.status === "pending").length,
          });
          setAnnouncements(announcementRes.data || []);
        } else if (section === "home" && config.role === "nurse") {
          
          
          const [admissionRes, wardRes, ticketRes, leaveRes, announcementRes] = await Promise.all([
            ipdService.getAdmissions("admitted").catch(() => ({ data: [] })),
            ipdService.getWards().catch(() => ({ data: [] })),
            queryService.getAssigned().catch(() => ({ data: [] })),
            leaveService.getMine().catch(() => ({ data: [] })),
            announcementService.getPublic().catch(() => ({ data: [] })),
          ]);
          const wards = wardRes.data || [];
          const allBeds = wards.flatMap((w) => (w.beds || []).map((b) => ({ ...b, wardName: w.name })));
          setNurseHome({
            admissions: admissionRes.data || [],
            totalBeds: allBeds.length,
            occupiedBeds: allBeds.filter((b) => b.status === "occupied").length,
            availableBeds: allBeds.filter((b) => b.status === "available" || b.status === "vacant").length,
            openTickets: (ticketRes.data || []).filter((t) => t.status !== "closed"),
            pendingLeaveCount: (leaveRes.data || []).filter((l) => l.status === "pending").length,
          });
          setAnnouncements(announcementRes.data || []);
        } else if (section === "home") {
          
          
          
          const [ticketRes, leaveRes, announcementRes] = await Promise.all([
            queryService.getAssigned().catch(() => ({ data: [] })),
            leaveService.getMine().catch(() => ({ data: [] })),
            announcementService.getPublic().catch(() => ({ data: [] })),
          ]);
          setHomeSummary({
            openTickets: (ticketRes.data || []).filter((t) => t.status !== "closed").length,
            pendingLeave: (leaveRes.data || []).filter((l) => l.status === "pending").length,
          });
          setAnnouncements(announcementRes.data || []);
        } else if (config.role === "patient") {
          if (section === "appointments") {
            const response = await appointmentService.getMyAppointments();
            setPayload(response.data);
          } else if (section === "queue") {
            
            
            
            
            
            
            const response = await queueService.getMyToken();
            setPayload(response.data?.token || null);
          } else if (section === "prescriptions") {
            const response = await pharmacyService.getMyPrescriptions();
            setPayload(response.data);
          } else if (section === "bills") {
            const response = await billingService.getMyBills();
            setPayload(response.data || []);
          } else if (section === "queries") {
            const response = await queryService.getMine();
            setPayload(response.data);
          } else if (section === "book") {
            const [deptResponse, profileResponse] = await Promise.all([
              departmentService.getAll(),
              patientService.getMyProfile().catch(() => ({ data: null })),
            ]);
            setDepartments(deptResponse.data || []);
            setPatientProfile(profileResponse.data);
            setBookEmailInput("");
          } else if (section === "profile") {
            const response = await patientService.getMyProfile();
            setPatientProfile(response.data);
          } else if (section === "medical-records") {
            const response = await encounterService.getMine();
            setMyEncounters(response.data || []);
          }
        } else if (config.role === "admin") {
          if (section === "staff") {
            const response = await staffService.getStaff(staffRoleFilter || undefined);
            setStaffList(response.data || []);
          } else if (section === "add-staff") {
            const deptResponse = await departmentService.getAll();
            setDepartments(deptResponse.data || []);
          } else if (section === "departments") {
            const [deptResponse, doctorResponse] = await Promise.all([
              departmentService.getAll(),
              staffService.getStaff("doctor"),
            ]);
            setDepartments(deptResponse.data || []);
            setDoctors(doctorResponse.data || []);
          } else if (section === "doctor-schedule") {
            const [deptResponse, doctorResponse] = await Promise.all([
              departmentService.getAll(),
              staffService.getStaff("doctor"),
            ]);
            setDepartments(deptResponse.data || []);
            setDoctors(doctorResponse.data || []);
          } else if (section === "leave-requests") {
            const [pendingRes, historyRes] = await Promise.all([
              leaveService.getPending(),
              leaveService.getHistory().catch(() => ({ data: [] })),
            ]);
            setLeaveRequests(pendingRes.data || []);
            setLeaveHistory(historyRes.data || []);
          } else if (section === "appointments") {
            const response = await appointmentService.getAllAppointments();
            setAllAppointments(response.data || []);
          } else if (section === "tickets") {
            const [queryResponse, staffResponse] = await Promise.all([
              queryService.getAll(),
              staffService.getStaff(),
            ]);
            setPayload(queryResponse.data);
            setStaffDirectory(staffResponse.data || []);
          } else if (section === "analytics") {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
            const [overviewRes, cashflowRes, ambulanceRes, staffRes] = await Promise.all([
              analyticsService.getOverview(),
              financeService.getCashFlow(startOfDay, endOfDay).catch(() => null),
              ambulanceService.getAll("pending").catch(() => null),
              
              
              staffDirectory.length === 0 ? staffService.getStaff().catch(() => null) : Promise.resolve(null),
            ]);
            setAnalytics({
              ...overviewRes.data,
              revenueToday: cashflowRes?.data?.totalCollected ?? null,
              criticalAlerts: ambulanceRes?.data?.length ?? null,
            });
            if (staffRes?.data) setStaffDirectory(staffRes.data);
          } else if (section === "wards") {
            const [wardResponse, deptResponse] = await Promise.all([
              ipdService.getWards(),
              departmentService.getAll(),
            ]);
            setWards(wardResponse.data || []);
            setDepartments(deptResponse.data || []);
          } else if (section === "salary-slips") {
            const [slipResponse, staffResponse] = await Promise.all([
              financeService.getSalarySlips(),
              staffService.getStaff(),
            ]);
            setSalarySlips(slipResponse.data || []);
            setSalaryStaffList(staffResponse.data || []);
          }
        } else if (config.role === "doctor") {
          if (section === "appointments") {
            const response = await appointmentService.getMyAppointments(doctorApptDate);
            setPayload(response.data);
          } else if (section === "prescriptions") {
            const response = await pharmacyService.getPrescriptions({ doctorId: user?._id });
            setPayload(response.data);
          } else if (section === "schedule") {
            const response = await scheduleService.getMine();
            setMyWeeklySchedule(response.data);
          } else if (section === "tickets") {
            const response = await queryService.getAssigned();
            setPayload(response.data);
          } else if (section === "leave-history") {
            const response = await leaveService.getMine();
            setPayload(response.data);
          } else if (section === "profile") {
            const response = await staffService.getMyProfile();
            setProfileData(response.data);
          } else if (section === "ipd") {
            const [wardResponse, admissionResponse] = await Promise.all([
              ipdService.getWards(),
              ipdService.getAdmissions(admissionStatusFilter || undefined),
            ]);
            setWards(wardResponse.data || []);
            setAdmissions(
              (admissionResponse.data || []).filter(
                (a) => String(a.admittingDoctorId?._id) === String(user?._id)
              )
            );
          }
        } else if (config.role === "nurse") {
          if (section === "leave-history") {
            const response = await leaveService.getMine();
            setPayload(response.data);
          } else if (section === "tickets") {
            const response = await queryService.getAssigned();
            setPayload(response.data);
          } else if (section === "profile") {
            const response = await staffService.getMyProfile();
            setProfileData(response.data);
          } else if (section === "ipd") {
            const [wardResponse, admissionResponse] = await Promise.all([
              ipdService.getWards(),
              ipdService.getAdmissions("admitted"),
            ]);
            setWards(wardResponse.data || []);
            setAdmissions(admissionResponse.data || []);
          }
        } else if (config.role === "receptionist") {
          if (section === "book-appointment") {
            const deptResponse = await departmentService.getAll();
            setDepartments(deptResponse.data || []);
          } else if (section === "appointments") {
            const filters = {};
            if (receptionStatusFilter) filters.status = receptionStatusFilter;
            if (receptionDateFilter) filters.date = receptionDateFilter;
            if (receptionDoctorFilter) filters.doctorId = receptionDoctorFilter;
            const [apptResponse, doctorResponse, pendingResponse] = await Promise.all([
              appointmentService.getAllAppointments(filters),
              staffService.getDoctors(),
              appointmentService.getAllAppointments({ pending: true }).catch(() => ({ data: [] })),
            ]);
            setReceptionAppointments(apptResponse.data || []);
            setDoctors(doctorResponse.data || []);
            setPendingGeneralRequests(pendingResponse.data || []);
          } else if (section === "ipd") {
            const [wardResponse, admissionResponse, doctorResponse] = await Promise.all([
              ipdService.getWards(),
              ipdService.getAdmissions(admissionStatusFilter || undefined),
              staffService.getDoctors(),
            ]);
            setWards(wardResponse.data || []);
            setAdmissions(admissionResponse.data || []);
            setDoctors(doctorResponse.data || []);
          } else if (section === "bills") {
            const response = await billingService.getBills();
            setBillsList(response.data || []);
          } else if (section === "leave-history") {
            const response = await leaveService.getMine();
            setPayload(response.data);
          } else if (section === "tickets") {
            const response = await queryService.getAssigned();
            setPayload(response.data);
          } else if (section === "profile") {
            const response = await staffService.getMyProfile();
            setProfileData(response.data);
          }
        } else if (config.role === "pharmacist") {
          if (section === "inventory") {
            const response = await pharmacyService.getMedicines();
            setPayload(response.data);
          } else if (section === "lookup") {
            const response = await pharmacyService.getMedicines();
            setMedicineCatalog(response.data || []);
          } else if (section === "expiry-alerts") {
            const response = await pharmacyService.getExpiringBatches(30);
            setExpiringBatches(response.data);
          } else if (section === "tickets") {
            const response = await queryService.getAssigned();
            setPayload(response.data);
          }
        }
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load section data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [config.role, section, staffRoleFilter, actualRole, receptionStatusFilter, receptionDateFilter, receptionDoctorFilter, admissionStatusFilter, doctorApptDate, overviewDate]);

  
  
  
  const [queueRefreshing, setQueueRefreshing] = useState(false);
  const refreshQueueStatus = async () => {
    setQueueRefreshing(true);
    try {
      const response = await queueService.getMyToken();
      setPayload(response.data?.token || null);
    } catch {
      
    } finally {
      setQueueRefreshing(false);
    }
  };

  
  
  
  
  
  
  
  
  useEffect(() => {
    if (config.role !== "patient" || section !== "queue") return undefined;
    const departmentId = payload?.department?._id;
    if (!departmentId) return undefined;

    let cancelled = false;
    let attempts = 0;
    let handler;
    let joinedDepartmentId = null;

    const attach = () => {
      if (cancelled) return;
      const socket = getSocket();
      if (!socket) {
        
        
        
        if (attempts++ < 20) setTimeout(attach, 250);
        return;
      }

      socket.emit("join-department", departmentId);
      joinedDepartmentId = departmentId;

      handler = (evt) => {
        if (String(evt?.departmentId) !== String(departmentId)) return;
        queueService
          .getMyToken()
          .then((response) => setPayload(response.data?.token || null))
          .catch(() => {
            
            
          });
      };
      socket.on("queue-status-updated", handler);
    };

    attach();

    return () => {
      cancelled = true;
      const socket = getSocket();
      if (socket) {
        if (handler) socket.off("queue-status-updated", handler);
        if (joinedDepartmentId) socket.emit("leave-department", joinedDepartmentId);
      }
    };
  }, [config.role, section, payload?.department?._id]);

  
  
  
  
  
  useEffect(() => {
    if (config.role !== "receptionist" || section !== "home") return undefined;

    let cancelled = false;
    let attempts = 0;
    let handler;
    let joinedDepartmentIds = [];

    const attach = async () => {
      if (cancelled) return;
      const socket = getSocket();
      if (!socket) {
        if (attempts++ < 20) setTimeout(attach, 250);
        return;
      }

      let depts = [];
      try {
        const deptRes = await departmentService.getAll();
        depts = deptRes.data || [];
      } catch {
        return; 
      }
      if (cancelled) return;

      joinedDepartmentIds = depts.map((d) => d._id);
      joinedDepartmentIds.forEach((id) => socket.emit("join-department", id));

      const deptNameById = new Map(depts.map((d) => [String(d._id), d.name]));

      handler = (evt) => {
        const departmentId = evt?.departmentId;
        if (!departmentId || !joinedDepartmentIds.some((id) => String(id) === String(departmentId))) return;
        queueService
          .getQueueStatus(departmentId)
          .then((res) => {
            const deptName = deptNameById.get(String(departmentId));
            const freshTokens = (res.data?.tokens || [])
              .filter((t) => t.status !== "done")
              .map((t) => ({ ...t, department: departmentId, deptName }));
            setReceptionHome((prev) => {
              if (!prev) return prev;
              const otherDeptTokens = prev.queueTokens.filter((t) => String(t.department) !== String(departmentId));
              return {
                ...prev,
                queueTokens: [...otherDeptTokens, ...freshTokens].sort(
                  (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
                ),
              };
            });
          })
          .catch(() => {
            
            
          });
      };
      socket.on("queue-status-updated", handler);
    };

    attach();

    return () => {
      cancelled = true;
      const socket = getSocket();
      if (socket) {
        if (handler) socket.off("queue-status-updated", handler);
        joinedDepartmentIds.forEach((id) => socket.emit("leave-department", id));
      }
    };
  }, [config.role, section]);

  
  
  
  useEffect(() => {
    if (section !== "ambulance-requests") return;
    clearUnread();
  }, [section, clearUnread]);

  useEffect(() => {
    if (section !== "ambulance-requests" || incoming.length === 0) return;
    setPayload((prev) => {
      const existingIds = new Set((prev || []).map((r) => r._id));
      const fresh = incoming.filter((r) => !existingIds.has(r._id));
      if (fresh.length === 0) return prev;
      return [...fresh, ...(prev || [])];
    });
    consumeIncoming();
  }, [section, incoming, consumeIncoming]);

  
  useEffect(() => {
    if (config.role !== "patient" && config.role !== "admin") return;
    appointmentService
      .getCancelReasons()
      .then((response) => setCancelReasons(response.data || []))
      .catch(() => setCancelReasons(["Schedule conflict", "Feeling better now", "Found another doctor", "Personal emergency", "Other"]));
  }, [config.role]);

  
  useEffect(() => {
    if (config.role !== "admin" || section !== "doctor-schedule" || !scheduleDoctorId) {
      setScheduleTimes([]);
      return;
    }
    scheduleService
      .getForDoctor(scheduleDoctorId)
      .then((response) => {
        const day = response.data?.schedule?.[scheduleDayOfWeek] || [];
        
        
        
        
        setScheduleTimes(day.map((t) => ({ time: t.time, capacity: t.capacity || 1 })));
      })
      .catch(() => setScheduleTimes([]));
  }, [config.role, section, scheduleDoctorId, scheduleDayOfWeek]);

  useEffect(() => {
    if (patientProfile) {
      setPatientProfileForm({
        name: patientProfile.name || "",
        age: patientProfile.age ?? "",
        gender: patientProfile.gender || "",
        email: patientProfile.email || "",
      });
    }
  }, [patientProfile]);

  useEffect(() => {
    if (profileData) {
      setProfileForm({
        contactNumber: profileData.contactNumber || "",
        email: profileData.email || "",
        address: profileData.address || "",
        emergencyContactName: profileData.emergencyContactName || "",
        emergencyContactNumber: profileData.emergencyContactNumber || "",
        bloodGroup: profileData.bloodGroup || "",
      });
    }
  }, [profileData]);

  const fetchSlots = async () => {
    if (!selectedDepartment || !selectedDate) {
      setError("Select a department and date to see available slots.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      const response = await scheduleService.getAvailable(selectedDepartment, selectedDate);
      setSlots((response.data || []).filter((s) => s.available));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load available slots");
    } finally {
      setLoading(false);
    }
  };

  
  
  
  
  const bookGeneralAppointment = async () => {
    if (!patientProfile?.email && !EMAIL_REGEX_BOOK.test(bookEmailInput.trim())) {
      setError("Please enter a valid email address — we'll send your appointment confirmation there.");
      return;
    }
    try {
      setError("");
      setBookingStatus("Sending your request...");
      const response = await appointmentService.bookAppointment({
        departmentId: selectedDepartment,
        consultationType: "in-person",
        ...(patientProfile?.email ? {} : { email: bookEmailInput.trim() }),
      });
      const code = response.data?.appointment?.appointmentCode;
      setBookingStatus(
        code
          ? `Request received. Your appointment ID is ${code} — our front desk will confirm a doctor and time shortly.`
          : "Request received — our front desk will confirm a doctor and time shortly."
      );
      if (!patientProfile?.email && bookEmailInput.trim()) {
        setPatientProfile((prev) => (prev ? { ...prev, email: bookEmailInput.trim() } : prev));
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send request");
      setBookingStatus("");
    }
  };

  const bookAppointment = async (time) => {
    // time is an "HH:MM" string; combine it with the selected date into a full Date.
    const [hh, mm] = time.split(":").map(Number);
    const slotDate = new Date(selectedDate);
    slotDate.setHours(hh, mm, 0, 0);

    try {
      setError("");
      setBookingStatus("Booking appointment...");
      const response = await appointmentService.bookAppointment({
        departmentId: selectedDepartment,
        slotTime: slotDate.toISOString(),
        consultationType,
        ...(patientProfile?.email ? {} : { email: bookEmailInput.trim() }),
      });
      const code = response.data?.appointment?.appointmentCode;
      const doctorName = response.data?.appointment?.doctorId?.name;
      setBookingStatus(
        code
          ? `Appointment booked with ${doctorName || "your assigned doctor"}. Your appointment ID is ${code} — keep it handy for pharmacy pickup and check-in.`
          : "Appointment booked successfully."
      );
      setSlots((prev) => prev.filter((slot) => slot.time !== time));
      if (!patientProfile?.email && bookEmailInput.trim()) {
        setPatientProfile((prev) => (prev ? { ...prev, email: bookEmailInput.trim() } : prev));
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to book appointment");
      setBookingStatus("");
    }
  };

  // Nothing books the instant a slot is clicked - a "confirm this
  // appointment?" dialog (shared confirm() from ConfirmContext) has to be
  // answered "Yes" first.
  const EMAIL_REGEX_BOOK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const confirmAndBookSlot = async (time) => {
    if (!patientProfile?.email && !EMAIL_REGEX_BOOK.test(bookEmailInput.trim())) {
      setError("Please enter a valid email address — we'll send your appointment confirmation there.");
      return;
    }
    const ok = await confirm({
      title: "Confirm your appointment",
      message: `Book ${consultationType === "online" ? "an online consultation" : "an in-person visit"} at ${time} on ${new Date(selectedDate).toLocaleDateString([], { dateStyle: "medium" })}? HeartStone will assign you the doctor available for that slot.`,
      confirmLabel: "Yes, confirm",
      cancelLabel: "No, go back",
    });
    if (!ok) return;
    await bookAppointment(time);
  };

  const submitNewTicket = async (e) => {
    e.preventDefault();
    if (!newTicketForm.subject.trim() || !newTicketForm.message.trim()) {
      setNewTicketStatus("Subject and message are required.");
      return;
    }
    try {
      setNewTicketStatus("Submitting...");
      const response = await queryService.create(newTicketForm.subject.trim(), newTicketForm.message.trim());
      setPayload((prev) => [response.data.query, ...(prev || [])]);
      setNewTicketStatus(`Ticket ${response.data.query.ticketId} raised successfully.`);
      setNewTicketForm({ subject: "", message: "" });
    } catch (err) {
      setNewTicketStatus(err.response?.data?.error || "Failed to raise ticket");
    }
  };

  const cancelMyAppointment = async (id) => {
    const draft = cancelDrafts[id] || {};
    if (!draft.reason) return;
    try {
      setError("");
      const response = await appointmentService.cancel(id, draft.reason, draft.note);
      setPayload((prev) => prev.map((a) => (a._id === id ? response.data.appointment : a)));
      setOpenCancelId(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to cancel appointment");
    }
  };

  // --- Patient profile actions ---

  const submitPatientProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setPatientProfileSaving(true);
      setPatientProfileMessage("");
      const response = await patientService.updateMyProfile(patientProfileForm);
      setPatientProfile(response.data.patient);
      setPatientProfileMessage("Profile updated.");
    } catch (err) {
      setPatientProfileMessage(err.response?.data?.error || "Failed to update profile");
    } finally {
      setPatientProfileSaving(false);
    }
  };

  // --- Admin actions ---

  const handleStaffFormChange = (field, value) => {
    setStaffForm((prev) => ({ ...prev, [field]: value }));
  };

  // Signature files are small (a cropped scan/photo of a signature) so a
  // plain base64 data URL - the same pattern already used for staff photos -
  // is simplest; no separate file-storage/CDN exists in this app.
  const handleSignatureFileChange = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => handleStaffFormChange("signatureUrl", reader.result);
    reader.readAsDataURL(file);
  };

  const resetStaffForm = () => {
    setStaffForm(EMPTY_STAFF_FORM);
    setEditingStaffId(null);
  };

  // Prefills the (shared) staff form from an existing staff record and
  // switches it into edit mode, then jumps to the add-staff screen which
  // doubles as the edit screen when editingStaffId is set.
  const startEditStaff = (staff) => {
    setEditingStaffId(staff._id);
    setNewStaffResult(null);
    setError("");
    setStaffForm({
      name: staff.name || "",
      role: staff.role || "nurse",
      contactNumber: staff.contactNumber || "",
      email: staff.email || "",
      designation: staff.designation || "",
      degree: staff.degree || "",
      registrationNo: staff.registrationNo || "",
      departmentId: staff.department?._id || staff.department || "",
      consultationFee: staff.consultationFee ?? "",
      dateOfBirth: staff.dateOfBirth ? staff.dateOfBirth.slice(0, 10) : "",
      gender: staff.gender || "",
      bloodGroup: staff.bloodGroup || "",
      address: staff.address || "",
      emergencyContactName: staff.emergencyContactName || "",
      emergencyContactNumber: staff.emergencyContactNumber || "",
      qualification: staff.qualification || "",
      experienceYears: staff.experienceYears ?? "",
      joiningDate: staff.joiningDate ? staff.joiningDate.slice(0, 10) : "",
      shiftTiming: staff.shiftTiming || "",
      employeeIdProof: staff.employeeIdProof || "",
      salary: staff.salary ?? "",
      signatureUrl: staff.signatureUrl || "",
    });
    navigate(`/${config.role}/add-staff`);
  };

  const submitAddStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.name || !staffForm.role) {
      setError("Name and role are required.");
      return;
    }
    if (!staffForm.contactNumber) {
      setError("Contact number is required (it's used to generate the username).");
      return;
    }
    try {
      setError("");
      setLoading(true);
      const body = {
        name: staffForm.name,
        role: staffForm.role,
        contactNumber: staffForm.contactNumber,
        email: staffForm.email || undefined,
        dateOfBirth: staffForm.dateOfBirth || undefined,
        gender: staffForm.gender || undefined,
        bloodGroup: staffForm.bloodGroup || undefined,
        address: staffForm.address || undefined,
        emergencyContactName: staffForm.emergencyContactName || undefined,
        emergencyContactNumber: staffForm.emergencyContactNumber || undefined,
        qualification: staffForm.qualification || undefined,
        experienceYears: staffForm.experienceYears || undefined,
        joiningDate: staffForm.joiningDate || undefined,
        shiftTiming: staffForm.shiftTiming || undefined,
        employeeIdProof: staffForm.employeeIdProof || undefined,
        salary: staffForm.salary || undefined,
        signatureUrl: staffForm.signatureUrl || undefined,
      };
      if (staffForm.role === "doctor") {
        body.designation = staffForm.designation || undefined;
        body.degree = staffForm.degree || undefined;
        body.registrationNo = staffForm.registrationNo || undefined;
        body.departmentId = staffForm.departmentId || undefined;
        body.consultationFee = staffForm.consultationFee ? Number(staffForm.consultationFee) : undefined;
      }

      if (editingStaffId) {
        const response = await staffService.updateStaff(editingStaffId, body);
        setStaffList((prev) => prev.map((s) => (s._id === editingStaffId ? response.data.staff : s)));
        setActionMessage("Staff member updated.");
        resetStaffForm();
        navigate(`/${config.role}/staff`);
        return;
      }

      const response = await staffService.addStaff(body);
      setNewStaffResult(response.data);
      setStaffForm(EMPTY_STAFF_FORM);
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${editingStaffId ? "update" : "add"} staff member`);
    } finally {
      setLoading(false);
    }
  };

  const deactivateStaff = async (id) => {
    try {
      setError("");
      await staffService.deleteStaff(id);
      setStaffList((prev) => prev.filter((s) => s._id !== id));
      setActionMessage("Staff member deactivated.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to deactivate staff member");
    }
  };

  const createDepartment = async (e) => {
    e.preventDefault();
    if (!newDepartmentName.trim()) return;
    try {
      setError("");
      const response = await departmentService.create(newDepartmentName.trim());
      setDepartments((prev) => [...prev, response.data.department]);
      setNewDepartmentName("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create department");
    }
  };

  const assignDoctor = async (departmentId) => {
    const doctorId = assignDoctorChoice[departmentId];
    if (!doctorId) return;
    try {
      setError("");
      const response = await departmentService.assignDoctor(departmentId, doctorId);
      setDepartments((prev) =>
        prev.map((d) => (d._id === departmentId ? response.data.department : d))
      );
    } catch (err) {
      setError(err.response?.data?.error || "Failed to assign doctor");
    }
  };

  const removeDoctor = async (departmentId, doctorId, doctorName) => {
    const ok = await confirm({
      title: "Remove doctor from department?",
      message: `${doctorName ? doctorName : "This doctor"} will no longer be assignable to appointments in this department. Their existing weekly schedule for it will also stop applying.`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      setError("");
      const response = await departmentService.removeDoctor(departmentId, doctorId);
      setDepartments((prev) =>
        prev.map((d) => (d._id === departmentId ? response.data.department : d))
      );
    } catch (err) {
      setError(err.response?.data?.error || "Failed to remove doctor");
    }
  };

  const approveLeave = async (id, force = false) => {
    try {
      setError("");
      const response = await leaveService.approve(id, force);
      setLeaveRequests((prev) => prev.filter((l) => l._id !== id));
      setLeaveConflicts((prev) => ({ ...prev, [id]: null }));
      if (response.data?.leaveRequest) {
        setLeaveHistory((prev) => [response.data.leaveRequest, ...prev]);
      }
    } catch (err) {
      if (err.response?.status === 409) {
        // Conflicting appointments - show them so the admin can decide whether to force through.
        setLeaveConflicts((prev) => ({ ...prev, [id]: err.response.data.conflicts || [] }));
      } else {
        setError(err.response?.data?.error || "Failed to approve leave request");
      }
    }
  };

  const rejectLeave = async (id) => {
    const reason = (leaveRejectDrafts[id] || "").trim();
    if (!reason) {
      setError("A rejection reason is required.");
      return;
    }
    try {
      setError("");
      const response = await leaveService.reject(id, reason);
      setLeaveRequests((prev) => prev.filter((l) => l._id !== id));
      if (response.data?.leaveRequest) {
        setLeaveHistory((prev) => [response.data.leaveRequest, ...prev]);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reject leave request");
    }
  };

  const updateAppointmentStatusAdmin = async (id, status) => {
    try {
      setError("");
      const response = await appointmentService.updateStatus(id, status);
      setAllAppointments((prev) =>
        prev.map((a) => (a._id === id ? response.data.appointment : a))
      );
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update appointment");
    }
  };

  const cancelAppointmentAdmin = async (id) => {
    const draft = cancelDrafts[id] || {};
    if (!draft.reason) return;
    try {
      setError("");
      const response = await appointmentService.cancel(id, draft.reason, draft.note);
      setAllAppointments((prev) => prev.map((a) => (a._id === id ? response.data.appointment : a)));
      setOpenCancelId(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to cancel appointment");
    }
  };

  const assignTicket = async (id, assignedToId) => {
    try {
      setError("");
      const response = await queryService.manage(id, { assignedToId: assignedToId || null });
      setPayload((prev) => prev.map((q) => (q._id === id ? response.data.query : q)));
      setTicketActionMessage("Ticket redirected.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to redirect ticket");
    }
  };

  const setTicketStatus = async (id, status) => {
    try {
      setError("");
      const response = await queryService.manage(id, { status });
      setPayload((prev) => prev.map((q) => (q._id === id ? response.data.query : q)));
      setTicketActionMessage("Ticket status updated.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update ticket status");
    }
  };

  const updateAmbulanceStatus = async (id, status) => {
    try {
      setError("");
      const response = await ambulanceService.updateStatus(id, status);
      setPayload((prev) => prev.map((r) => (r._id === id ? response.data.request : r)));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update request");
    }
  };

  const replyToTicket = async (id) => {
    const reply = (ticketReplyDrafts[id] || "").trim();
    if (!reply) return;
    try {
      setError("");
      const response = await queryService.reply(id, reply);
      setPayload((prev) => prev.map((q) => (q._id === id ? response.data.query : q)));
      setTicketReplyDrafts((prev) => ({ ...prev, [id]: "" }));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send reply");
    }
  };

  const patientReplyToTicket = async (id) => {
    const message = (patientReplyDrafts[id] || "").trim();
    if (!message) return;
    try {
      setError("");
      const response = await queryService.patientReply(id, message);
      setPayload((prev) => prev.map((q) => (q._id === id ? response.data.query : q)));
      setPatientReplyDrafts((prev) => ({ ...prev, [id]: "" }));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send reply");
    }
  };

  
  
  
  const renderTicketThread = (query) => renderTicketThreadImpl(query, { user });

  const saveDoctorSchedule = async () => {
    const doctor = doctors.find((d) => d._id === scheduleDoctorId);
    if (!doctor?.department) return;
    const departmentId = doctor.department._id || doctor.department;
    try {
      setScheduleSaving(true);
      setScheduleMessage("");
      await scheduleService.setForDoctor(scheduleDoctorId, departmentId, scheduleDayOfWeek, scheduleTimes);
      // scheduleTimes is always an array of { time, capacity } objects (see
      // AdminContent.jsx's doctor-schedule editor) - summarize by time, and
      // call out any slot that takes more than one patient so it's obvious
      // the capacity actually saved.
      const summary =
        scheduleTimes
          .map((t) => (t.capacity > 1 ? `${t.time} (up to ${t.capacity})` : t.time))
          .join(", ") || "no times";
      setScheduleMessage(`Saved. ${doctor.name} is now available on ${DAY_NAMES[scheduleDayOfWeek]} at: ${summary}.`);
    } catch (err) {
      setScheduleMessage(err.response?.data?.error || "Failed to save schedule");
    } finally {
      setScheduleSaving(false);
    }
  };

  

  const updateDoctorAppointmentStatus = async (id, status) => {
    try {
      setError("");
      const response = await appointmentService.updateStatus(id, status);
      setPayload((prev) => prev.map((a) => (a._id === id ? response.data.appointment : a)));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update appointment");
    }
  };

  const updateRxMedicineLine = (index, field, value) => {
    setRxMedicines((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  const addRxMedicineLine = () => {
    setRxMedicines((prev) => [...prev, { ...EMPTY_MEDICINE_LINE }]);
  };

  const removeRxMedicineLine = (index) => {
    setRxMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const submitPrescription = async (appt) => {
    const validLines = rxMedicines.filter((m) => m.name.trim());
    if (validLines.length === 0) {
      setRxStatus("Add at least one medicine.");
      return;
    }
    try {
      setRxStatus("Saving prescription...");
      await pharmacyService.createPrescription({
        appointmentId: appt._id,
        patientId: appt.patientId?._id,
        medicines: validLines.map((m) => ({
          name: m.name,
          dosage: m.dosage,
          quantity: m.quantity ? Number(m.quantity) : undefined,
        })),
        notes: rxNotes.trim() || undefined,
      });
      setRxStatus("Prescription saved.");
      setRxMedicines([{ ...EMPTY_MEDICINE_LINE }]);
      setRxNotes("");
      setRxAppointmentId(null);
    } catch (err) {
      setRxStatus(err.response?.data?.error || "Failed to save prescription");
    }
  };

  

  const leaveTotalDays = () => {
    if (!leaveForm.fromDate || !leaveForm.toDate) return 0;
    const from = new Date(leaveForm.fromDate);
    const to = new Date(leaveForm.toDate);
    const diff = Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  const submitLeaveApplication = async (e) => {
    e.preventDefault();
    if (!leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason.trim()) {
      setLeaveApplyStatus("Type of leave, dates, and purpose are all required.");
      return;
    }
    if (!leaveForm.confirmed) {
      setLeaveApplyStatus("Please confirm the acknowledgement checkbox before submitting.");
      return;
    }
    try {
      setLeaveApplyStatus("Submitting...");
      await leaveService.apply(leaveForm.fromDate, leaveForm.toDate, leaveForm.reason.trim(), {
        leaveType: leaveForm.leaveType,
        timeFrom: leaveForm.timeFrom || undefined,
        timeTo: leaveForm.timeTo || undefined,
      });
      setLeaveApplyStatus("Leave request submitted.");
      setLeaveForm({ leaveType: "casual", fromDate: "", toDate: "", timeFrom: "", timeTo: "", reason: "", confirmed: false });
    } catch (err) {
      setLeaveApplyStatus(err.response?.data?.error || "Failed to submit leave request");
    }
  };

  const runAppointmentLookup = async (e) => {
    e.preventDefault();
    if (!apptLookupValue.trim()) return;
    try {
      setApptLookupError("");
      setApptLookupSearched(true);
      const response = await appointmentService.getByCode(apptLookupValue.trim());
      setApptLookupResult(response.data);
    } catch (err) {
      setApptLookupResult(null);
      setApptLookupError(err.response?.data?.error || "No appointment found for that code");
    }
  };

  const updateApptLookupStatus = async (status) => {
    if (!apptLookupResult) return;
    try {
      setApptLookupError("");
      const response = await appointmentService.updateStatus(apptLookupResult._id, status);
      setApptLookupResult(response.data.appointment);
    } catch (err) {
      setApptLookupError(err.response?.data?.error || "Failed to update appointment");
    }
  };

  

  const submitProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setProfileSaving(true);
      setProfileMessage("");
      const response = await staffService.updateMyProfile(profileForm);
      setProfileData(response.data.staff);
      setProfileMessage("Profile updated.");
    } catch (err) {
      setProfileMessage(err.response?.data?.error || "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  

  
  
  
  const findCatalogMatch = (medicineName, catalog) => {
    const needle = String(medicineName || "").trim().toLowerCase();
    if (!needle) return null;
    return (
      catalog.find((m) => m.name.trim().toLowerCase() === needle) ||
      catalog.find(
        (m) =>
          m.name.trim().toLowerCase().includes(needle) ||
          needle.includes(m.name.trim().toLowerCase())
      ) ||
      null
    );
  };

  // Accepts an explicit `codeOverride` for the same reason as
  // runBillLookup/runClinicalLookup above.
  const runLookup = async (e, codeOverride) => {
    e?.preventDefault();
    const value = (codeOverride ?? lookupValue).trim();
    if (!value) return;
    try {
      setError("");
      setLoading(true);
      setLookupSearched(true);
      const params = (codeOverride || lookupType === "appointment") ? { appointmentCode: value } : { patientName: value };
      const response = await pharmacyService.getPrescriptions(params);
      const results = response.data || [];
      setLookupResults(results);

      
      
      
      const linkUpdates = {};
      const draftUpdates = {};
      results.forEach((rx) => {
        (rx.medicines || []).forEach((med, i) => {
          if (med.dispenseStatus === "dispensed") return;
          const match = findCatalogMatch(med.name, medicineCatalog);
          if (!match) return; 
          const key = `${rx._id}:${i}`;
          linkUpdates[key] = match._id;
          const inStock = Number(match.totalQuantity || 0);
          const prescribedQty = Number(med.quantity || 0);
          const unitPrice = Number(match.nextBatch?.price || 0);
          draftUpdates[key] = {
            status: inStock >= prescribedQty && prescribedQty > 0 ? "dispensed" : "pending",
            quantity: String(Math.min(inStock, prescribedQty || inStock) || ""),
            price: unitPrice ? String(unitPrice) : "",
          };
        });
      });
      if (Object.keys(linkUpdates).length > 0) {
        setLinkedMedicineChoice((prev) => ({ ...prev, ...linkUpdates }));
        setDispenseDrafts((prev) => ({ ...prev, ...draftUpdates }));
      }
    } catch (err) {
      setError(err.response?.data?.error || "Lookup failed");
      setLookupResults([]);
    } finally {
      setLoading(false);
    }
  };

  const updateLookupMedicineAvailability = async (prescriptionId, medicineIndex, availability, extra = {}) => {
    try {
      setError("");
      const medicineId = linkedMedicineChoice[`${prescriptionId}:${medicineIndex}`] || undefined;
      const response = await pharmacyService.updateMedicineAvailability(
        prescriptionId,
        medicineIndex,
        availability,
        medicineId,
        extra
      );
      setLookupResults((prev) =>
        prev.map((p) => (p._id === prescriptionId ? response.data.prescription : p))
      );
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update availability");
    }
  };

  const getDispenseDraft = (rxId, index) => {
    const key = `${rxId}:${index}`;
    return dispenseDrafts[key] || { status: "pending", quantity: "", price: "" };
  };

  const setDispenseDraft = (rxId, index, field, value) => {
    const key = `${rxId}:${index}`;
    setDispenseDrafts((prev) => ({
      ...prev,
      [key]: { ...getDispenseDraft(rxId, index), [field]: value },
    }));
  };

  const saveDispenseDraft = async (rx, index, med) => {
    const draft = getDispenseDraft(rx._id, index);
    const parsedQuantity = draft.quantity === "" ? Number(med.dispensedQuantity || 0) : Number(draft.quantity);
    const parsedPrice = draft.price === "" ? Number(med.dispensedPrice || 0) : Number(draft.price);
    const normalizedStatus = String(draft.status || (med.dispensedQuantity > 0 ? "dispensed" : "pending")).toLowerCase();
    const statusValue =
      normalizedStatus === "dispensed"
        ? "dispensed"
        : normalizedStatus === "partially-dispensed"
          ? "partially-dispensed"
          : normalizedStatus === "not-dispensed"
            ? "not-dispensed"
            : "pending";
    await updateLookupMedicineAvailability(rx._id, index, statusValue, {
      dispensedQuantity: statusValue === "dispensed" ? Number(med.quantity || parsedQuantity || 0) : statusValue === "partially-dispensed" ? parsedQuantity : 0,
      dispensedPrice: parsedPrice,
      dispenseStatus: statusValue,
    });
  };

  const getBatchDraft = (medicineId) =>
    batchDrafts[medicineId] || { batchNumber: "", quantity: "", price: "", expiryDate: "" };

  const setBatchDraft = (medicineId, field, value) => {
    setBatchDrafts((prev) => ({
      ...prev,
      [medicineId]: { ...getBatchDraft(medicineId), [field]: value },
    }));
  };

  const submitRestock = async (medicineId) => {
    const draft = getBatchDraft(medicineId);
    if (!draft.batchNumber || !draft.quantity || !draft.price || !draft.expiryDate) {
      setError("Batch number, quantity, price, and expiry date are all required to restock.");
      return;
    }
    try {
      setError("");
      const response = await pharmacyService.addBatch(medicineId, {
        batchNumber: draft.batchNumber,
        quantity: Number(draft.quantity),
        price: Number(draft.price),
        expiryDate: draft.expiryDate,
      });
      setPayload((prev) => prev.map((m) => (m._id === medicineId ? response.data.medicine : m)));
      setBatchDrafts((prev) => ({ ...prev, [medicineId]: { batchNumber: "", quantity: "", price: "", expiryDate: "" } }));
      setActionMessage("Batch added.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add batch");
    }
  };

  const deleteMedicineRow = async (id) => {
    try {
      setError("");
      await pharmacyService.deleteMedicine(id);
      setPayload((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete medicine");
    }
  };

  const submitAddMedicine = async (e) => {
    e.preventDefault();
    if (!addMedicineForm.name || !addMedicineForm.batchNumber || !addMedicineForm.quantity || !addMedicineForm.price || !addMedicineForm.expiryDate) {
      setError("Name, batch number, quantity, price, and expiry date are all required.");
      return;
    }
    try {
      setError("");
      setLoading(true);
      await pharmacyService.addMedicine({
        name: addMedicineForm.name,
        unit: addMedicineForm.unit,
        batchNumber: addMedicineForm.batchNumber,
        quantity: Number(addMedicineForm.quantity),
        price: Number(addMedicineForm.price),
        expiryDate: addMedicineForm.expiryDate,
      });
      setActionMessage(`${addMedicineForm.name} added to inventory.`);
      setAddMedicineForm({ name: "", unit: "tablets", batchNumber: "", quantity: "", price: "", expiryDate: "" });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add medicine");
    } finally {
      setLoading(false);
    }
  };

  
  
  

  const updateReceptionApptStatus = async (id, status) => {
    try {
      setError("");
      const response = await appointmentService.updateStatus(id, status);
      setReceptionAppointments((prev) => prev.map((a) => (a._id === id ? response.data.appointment : a)));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update appointment");
    }
  };

  const submitReassignDoctor = async (id) => {
    const doctorId = doctorReassignChoice[id];
    if (!doctorId) return;
    try {
      setError("");
      const response = await appointmentService.reassignDoctor(id, doctorId);
      setReceptionAppointments((prev) => prev.map((a) => (a._id === id ? response.data.appointment : a)));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reassign doctor");
    }
  };

  
  
  
  const submitAssignSlot = async (id) => {
    const draft = assignDraft[id] || {};
    if (!draft.doctorId || !draft.date || !draft.time) {
      setAssignStatus((prev) => ({ ...prev, [id]: "Pick a doctor, date, and time first." }));
      return;
    }
    const slotTime = new Date(`${draft.date}T${draft.time}:00`);
    try {
      setAssignStatus((prev) => ({ ...prev, [id]: "Assigning..." }));
      const response = await appointmentService.assignSlot(id, draft.doctorId, slotTime.toISOString());
      setPendingGeneralRequests((prev) => prev.filter((a) => a._id !== id));
      setReceptionAppointments((prev) => [response.data.appointment, ...prev]);
      setAssignStatus((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      setAssignStatus((prev) => ({ ...prev, [id]: err.response?.data?.error || "Failed to assign" }));
    }
  };

  
  
  
  
  const runBillLookup = async (e, codeOverride) => {
    e?.preventDefault();
    const code = (codeOverride ?? billLookupCode).trim();
    if (!code) return;
    try {
      setBillLookupError("");
      setBillLookupSearched(true);
      setBillMedicineChoices({});
      const response = await billingService.getBillableItems(code);
      setBillLookupResult(response.data);
      const doctorFee = response.data?.appointment?.doctorId?.consultationFee;
      setBillConsultationFee(doctorFee !== undefined && doctorFee !== null ? String(doctorFee) : "");
      setBillApplicationFee("");
      setBillAppointmentFee("500");
      setBillOtherCharges([]);
      setBillDiscountAmount("");
    } catch (err) {
      setBillLookupResult(null);
      setBillLookupError(err.response?.data?.error || "No appointment found for that code");
    }
  };

  const toggleBillMedicine = (index) => {
    setBillMedicineChoices((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const OTHER_CHARGE_PRESETS = ["Registration", "Room Service", "Ambulance", "Equipment Usage", "Other"];

  const addBillOtherCharge = () => {
    setBillOtherCharges((prev) => [...prev, { type: OTHER_CHARGE_PRESETS[0], amount: "" }]);
  };

  const removeBillOtherCharge = (index) => {
    setBillOtherCharges((prev) => prev.filter((_, i) => i !== index));
  };

  const updateBillOtherCharge = (index, field, value) => {
    setBillOtherCharges((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  // Selected medicine line items, priced from inventory (auto-filled by the
  // backend - never entered manually by the receptionist).
  const getSelectedBillItems = () => {
    const medicines = billLookupResult?.prescription?.medicines || [];
    return medicines
      .map((med, i) => ({ med, i }))
      .filter(({ med, i }) => {
        const isBillable = med.isBillable || (Number(med.dispensedQuantity || med.quantity) > 0 && Number(med.dispensedPrice || 0) > 0);
        const isSelected = billMedicineChoices[i] !== false;
        return isBillable && isSelected;
      })
      .map(({ med }) => ({
        description: `${med.name}${med.dosage ? ` (${med.dosage})` : ""}`,
        quantity: Number(med.dispensedQuantity || med.quantity || 1),
        unitPrice: Number(med.dispensedPrice || med.unitPrice || 0),
      }));
  };

  const billMedicinesTotal = () =>
    getSelectedBillItems().reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);

  const billOtherChargesTotal = () =>
    billOtherCharges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  // Live subtotal/total shown in the form as the receptionist fills it in -
  // mirrors the exact formula the backend applies at creation time.
  const billLiveSubtotal = () => {
    const items = getSelectedBillItems();
    const appt = billAppointmentFee ? Number(billAppointmentFee) || 0 : 0;
    const consult = billConsultationFee ? Number(billConsultationFee) || 0 : 0;
    const flatFee = items.length === 0 ? Number(billApplicationFee) || 0 : 0;
    return appt + consult + billMedicinesTotal() + flatFee + billOtherChargesTotal();
  };

  const billLiveDiscount = () => Math.max(0, Number(billDiscountAmount) || 0);
  const billLiveTotal = () => Math.max(0, billLiveSubtotal() - billLiveDiscount());
  const billDiscountTooHigh = () => billLiveDiscount() > billLiveSubtotal();

  const submitGenerateBill = async () => {
    if (!billLookupResult?.appointment) return;
    if (billDiscountTooHigh()) {
      setBillGenerateStatus("Discount cannot exceed the bill subtotal");
      return;
    }
    const items = getSelectedBillItems();
    const otherCharges = billOtherCharges
      .filter((c) => c.type && c.type.trim())
      .map((c) => ({ type: c.type.trim(), amount: Number(c.amount) || 0 }));

    try {
      setBillGenerateStatus("Generating bill...");
      const response = await billingService.create({
        appointmentId: billLookupResult.appointment._id,
        prescriptionId: billLookupResult.prescription?._id,
        items,
        consultationFee: billConsultationFee ? Number(billConsultationFee) : 0,
        applicationFee: items.length === 0 ? (billApplicationFee ? Number(billApplicationFee) : 0) : 0,
        appointmentFee: billAppointmentFee ? Number(billAppointmentFee) : 0,
        otherCharges,
        discountAmount: billDiscountAmount ? Number(billDiscountAmount) : 0,
        paymentMethod: billPaymentMethod,
      });
      setBillGenerateStatus(`Bill ${response.data.bill.billNumber} generated for ₹${response.data.bill.totalAmount}.`);
      setBillLookupResult((prev) => ({ ...prev, alreadyBilled: true, bill: response.data.bill }));
    } catch (err) {
      setBillGenerateStatus(err.response?.data?.error || "Failed to generate bill");
    }
  };

  const markBillPaidAction = async (id, method) => {
    try {
      setError("");
      const response = await billingService.markPaid(id, method);
      setBillsList((prev) => prev.map((b) => (b._id === id ? response.data.bill : b)));
      if (billLookupResult?.bill?._id === id) {
        setBillLookupResult((prev) => ({ ...prev, bill: response.data.bill }));
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update bill");
    }
  };

  const submitOnBehalfTicket = async (e) => {
    e.preventDefault();
    const { patientPhone, subject, message } = onBehalfTicketForm;
    if (!patientPhone.trim() || !subject.trim() || !message.trim()) {
      setOnBehalfTicketStatus("Patient phone, subject, and message are all required.");
      return;
    }
    try {
      setOnBehalfTicketStatus("Submitting...");
      const response = await queryService.createOnBehalf(patientPhone.trim(), subject.trim(), message.trim());
      setOnBehalfTicketStatus(`Ticket ${response.data.query.ticketId} raised for this patient.`);
      setOnBehalfTicketForm({ patientPhone: "", subject: "", message: "" });
    } catch (err) {
      setOnBehalfTicketStatus(err.response?.data?.error || "Failed to raise ticket");
    }
  };

  
  
  

  const searchExistingPatients = async (e) => {
    e.preventDefault();
    if (!patientSearchTerm.trim()) return;
    try {
      setPatientSearchStatus("Searching...");
      const response = await patientService.search(patientSearchTerm.trim());
      setPatientSearchResults(response.data || []);
      setPatientSearchStatus(response.data?.length ? "" : "No matching patients found.");
    } catch (err) {
      setPatientSearchResults([]);
      setPatientSearchStatus(err.response?.data?.error || "Search failed");
    }
  };

  const checkSlotAvailability = async () => {
    const { departmentId, date, time } = bookDetails;
    if (!departmentId || !date || !time) {
      setBookAppointmentStatus("Choose a department, date, and time first.");
      return;
    }
    try {
      setCheckingAvailability(true);
      setBookAppointmentStatus("");
      const response = await appointmentService.getAvailableDoctors(departmentId, date, time);
      setAvailableDoctorsForSlot(response.data.doctors || []);
      setSelectedDoctorForBooking("");
    } catch (err) {
      setAvailableDoctorsForSlot([]);
      setBookAppointmentStatus(err.response?.data?.error || "Failed to check availability");
    } finally {
      setCheckingAvailability(false);
    }
  };

  const EMAIL_REGEX_RECEPTION = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const submitBookAppointment = async () => {
    const { departmentId, date, time } = bookDetails;
    if (!departmentId || !date) {
      setBookAppointmentStatus("Choose a department and date first.");
      return;
    }
    if (bookPatientMode === "existing" && !selectedPatient) {
      setBookAppointmentStatus("Select an existing patient first.");
      return;
    }
    if (bookPatientMode === "new" && (!newPatientForm.name.trim() || !newPatientForm.phone.trim())) {
      setBookAppointmentStatus("New patient needs at least a name and phone number.");
      return;
    }
    if (bookPatientMode === "new" && !EMAIL_REGEX_RECEPTION.test(newPatientForm.email.trim())) {
      setBookAppointmentStatus("An email address is required to book an appointment.");
      return;
    }
    if (bookPatientMode === "existing" && !selectedPatient.email && !EMAIL_REGEX_RECEPTION.test(existingPatientEmailInput.trim())) {
      setBookAppointmentStatus("An email address is required to book an appointment.");
      return;
    }

    const slotTime = time ? new Date(`${date}T${time}:00`) : null;

    try {
      setBookAppointmentStatus("Booking...");
      const payload = {
        departmentId,
        date,
        doctorId: selectedDoctorForBooking || undefined,
        ...(slotTime ? { slotTime: slotTime.toISOString() } : {}),
      };
      if (bookPatientMode === "existing") {
        payload.patientId = selectedPatient._id;
        if (!selectedPatient.email) payload.email = existingPatientEmailInput.trim();
      } else {
        payload.newPatient = newPatientForm;
      }

      const response = await appointmentService.bookForPatient(payload);
      setBookAppointmentStatus(
        `Appointment ${response.data.appointment.appointmentCode} booked with Dr. ${response.data.appointment.doctorId?.name || ""}.`
      );
      
      setSelectedPatient(null);
      setExistingPatientEmailInput("");
      setPatientSearchResults(null);
      setPatientSearchTerm("");
      setNewPatientForm({ name: "", phone: "", dob: "", gender: "", email: "", address: "", emergencyContactName: "", emergencyContactPhone: "" });
      setAvailableDoctorsForSlot(null);
      setSelectedDoctorForBooking("");
    } catch (err) {
      setBookAppointmentStatus(err.response?.data?.error || "Failed to book appointment");
    }
  };

  
  
  
  const submitGeneralBooking = async () => {
    const { departmentId } = bookDetails;
    if (!departmentId) {
      setBookAppointmentStatus("Choose a department first.");
      return;
    }
    if (bookPatientMode === "existing" && !selectedPatient) {
      setBookAppointmentStatus("Select an existing patient first.");
      return;
    }
    if (bookPatientMode === "new" && (!newPatientForm.name.trim() || !newPatientForm.phone.trim())) {
      setBookAppointmentStatus("New patient needs at least a name and phone number.");
      return;
    }
    if (bookPatientMode === "new" && !EMAIL_REGEX_RECEPTION.test(newPatientForm.email.trim())) {
      setBookAppointmentStatus("An email address is required to book an appointment.");
      return;
    }
    if (bookPatientMode === "existing" && !selectedPatient.email && !EMAIL_REGEX_RECEPTION.test(existingPatientEmailInput.trim())) {
      setBookAppointmentStatus("An email address is required to book an appointment.");
      return;
    }

    try {
      setBookAppointmentStatus("Booking...");
      const payload = { departmentId };
      if (bookPatientMode === "existing") {
        payload.patientId = selectedPatient._id;
        if (!selectedPatient.email) payload.email = existingPatientEmailInput.trim();
      } else {
        payload.newPatient = newPatientForm;
      }

      const response = await appointmentService.bookForPatient(payload);
      setBookAppointmentStatus(
        `Consultation request ${response.data.appointment.appointmentCode} received — assign a doctor and time from the Appointments tab whenever you're ready.`
      );
      setSelectedPatient(null);
      setExistingPatientEmailInput("");
      setPatientSearchResults(null);
      setPatientSearchTerm("");
      setNewPatientForm({ name: "", phone: "", dob: "", gender: "", email: "", address: "", emergencyContactName: "", emergencyContactPhone: "" });
    } catch (err) {
      setBookAppointmentStatus(err.response?.data?.error || "Failed to submit consultation request");
    }
  };

  
  
  

  const markSalaryPaidAction = async (id) => {
    try {
      setError("");
      const response = await financeService.markSalaryPaid(id);
      setSalarySlips((prev) => prev.map((s) => (s._id === id ? response.data.slip : s)));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update salary slip");
    }
  };

  const submitSalarySlip = async (e) => {
    e.preventDefault();
    if (!salaryForm.staffId || !salaryForm.basicSalary) {
      setSalaryFormStatus("Staff member and basic salary are required.");
      return;
    }
    try {
      setSalaryFormStatus("Generating...");
      const response = await financeService.createSalarySlip({
        staffId: salaryForm.staffId,
        month: Number(salaryForm.month),
        year: Number(salaryForm.year),
        basicSalary: Number(salaryForm.basicSalary),
        bonus: salaryForm.bonus ? Number(salaryForm.bonus) : 0,
        deductions: salaryForm.deductions ? Number(salaryForm.deductions) : 0,
        notes: salaryForm.notes || undefined,
      });
      setSalarySlips((prev) => [response.data.slip, ...prev]);
      setSalaryFormStatus("Salary slip generated.");
      setSalaryForm((prev) => ({ ...prev, basicSalary: "", bonus: "", deductions: "", notes: "" }));
    } catch (err) {
      setSalaryFormStatus(err.response?.data?.error || "Failed to generate salary slip");
    }
  };

  
  
  

  
  
  
  const runClinicalLookup = async (e, codeOverride) => {
    e?.preventDefault();
    const code = (codeOverride ?? clinicalLookupCode).trim();
    if (!code) return;
    try {
      setClinicalLookupError("");
      setClinicalLookupSearched(true);
      setEncounterForm(EMPTY_ENCOUNTER_FORM);
      setEncounterSaveStatus("");
      const apptResponse = await appointmentService.getByCode(code);
      const encResponse = await encounterService.getForAppointment(apptResponse.data._id);
      setClinicalLookupResult({ appointment: apptResponse.data, encounters: encResponse.data || [] });
    } catch (err) {
      setClinicalLookupResult(null);
      setClinicalLookupError(err.response?.data?.error || "No appointment found for that ID");
    }
  };

  const submitEncounter = async () => {
    if (!clinicalLookupResult?.appointment) return;
    const diagnosis = encounterForm.diagnosisText
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean)
      .map((description) => ({ description }));

    try {
      setEncounterSaveStatus("Saving...");
      const response = await encounterService.create({
        appointmentId: clinicalLookupResult.appointment._id,
        vitals: {
          temperatureF: encounterForm.temperatureF ? Number(encounterForm.temperatureF) : undefined,
          bloodPressure: encounterForm.bloodPressure || undefined,
          pulseBpm: encounterForm.pulseBpm ? Number(encounterForm.pulseBpm) : undefined,
          respiratoryRate: encounterForm.respiratoryRate ? Number(encounterForm.respiratoryRate) : undefined,
          spo2: encounterForm.spo2 ? Number(encounterForm.spo2) : undefined,
          weightKg: encounterForm.weightKg ? Number(encounterForm.weightKg) : undefined,
          heightCm: encounterForm.heightCm ? Number(encounterForm.heightCm) : undefined,
        },
        chiefComplaint: encounterForm.chiefComplaint,
        diagnosis,
        clinicalNotes: encounterForm.clinicalNotes,
        followUpDate: encounterForm.followUpDate || undefined,
      });
      setClinicalLookupResult((prev) => ({
        ...prev,
        encounters: [response.data.encounter, ...(prev.encounters || [])],
      }));
      setEncounterForm(EMPTY_ENCOUNTER_FORM);
      setEncounterSaveStatus("Encounter recorded.");
    } catch (err) {
      setEncounterSaveStatus(err.response?.data?.error || "Failed to record encounter");
    }
  };

  
  
  

  const submitAdmitPatient = async (e) => {
    e.preventDefault();
    const { patientPhone, wardId, bedId, admittingDoctorId, reasonForAdmission, diagnosis } = admitForm;
    if (!patientPhone.trim() || !wardId || !bedId || !admittingDoctorId || !reasonForAdmission.trim()) {
      setAdmitStatus("Patient phone, ward, bed, doctor, and reason are all required.");
      return;
    }
    try {
      setAdmitStatus("Admitting...");
      const patientLookup = await patientService.findByPhone(patientPhone.trim());
      const patientId = patientLookup?.data?._id;
      if (!patientId) {
        setAdmitStatus("Could not find a patient with that phone number.");
        return;
      }
      const response = await ipdService.admit({
        patientId,
        wardId,
        bedId,
        admittingDoctorId,
        reasonForAdmission: reasonForAdmission.trim(),
        diagnosis: diagnosis.trim() || undefined,
      });
      setAdmissions((prev) => [response.data.admission, ...prev]);
      setWards((prev) =>
        prev.map((w) => (w._id === wardId ? { ...w, beds: w.beds.map((b) => (b._id === bedId ? { ...b, status: "occupied" } : b)) } : w))
      );
      setAdmitStatus(`Patient admitted to bed ${response.data.admission.wardId?.name || ""}.`);
      setAdmitForm({ patientPhone: "", wardId: "", bedId: "", admittingDoctorId: "", reasonForAdmission: "", diagnosis: "" });
    } catch (err) {
      setAdmitStatus(err.response?.data?.error || "Failed to admit patient");
    }
  };

  const submitTransferBed = async (admissionId) => {
    const choice = transferChoice[admissionId];
    if (!choice?.wardId || !choice?.bedId) return;
    try {
      setIpdActionStatus("");
      const response = await ipdService.transfer(admissionId, { toWardId: choice.wardId, toBedId: choice.bedId });
      setAdmissions((prev) => prev.map((a) => (a._id === admissionId ? response.data.admission : a)));
      setIpdActionStatus("Patient transferred.");
    } catch (err) {
      setIpdActionStatus(err.response?.data?.error || "Failed to transfer patient");
    }
  };

  const submitDischarge = async (admissionId) => {
    const draft = dischargeDrafts[admissionId] || {};
    if (!draft.summary?.trim()) {
      setIpdActionStatus("A discharge summary is required.");
      return;
    }
    const ok = await confirm({
      title: "Discharge this patient?",
      message: "This will free up their bed and close the admission. Make sure the discharge summary is complete first.",
      confirmLabel: "Discharge patient",
      danger: true,
    });
    if (!ok) return;
    try {
      const response = await ipdService.discharge(admissionId, {
        summary: draft.summary.trim(),
        followUpInstructions: draft.followUpInstructions?.trim() || "",
      });
      setAdmissions((prev) => prev.map((a) => (a._id === admissionId ? response.data.admission : a)));
      setIpdActionStatus("Patient discharged.");
    } catch (err) {
      setIpdActionStatus(err.response?.data?.error || "Failed to discharge patient");
    }
  };

  const submitIpdBill = async (admissionId) => {
    const draft = ipdBillDrafts[admissionId] || {};
    try {
      setIpdActionStatus("Generating bill...");
      const response = await ipdService.createBill(admissionId, {
        consultationFee: draft.consultationFee ? Number(draft.consultationFee) : 0,
        otherCharges: draft.otherCharges ? Number(draft.otherCharges) : 0,
        paymentMethod: draft.paymentMethod || "cash",
      });
      setIpdActionStatus(`Bill ${response.data.bill.billNumber} generated for ₹${response.data.bill.totalAmount}.`);
    } catch (err) {
      setIpdActionStatus(err.response?.data?.error || "Failed to generate IPD bill");
    }
  };

  
  
  

  const submitCreateWard = async (e) => {
    e.preventDefault();
    const { name, type, floor, departmentId } = newWardForm;
    if (!name.trim()) {
      setNewWardStatus("Ward name is required.");
      return;
    }
    try {
      setNewWardStatus("Creating...");
      const response = await ipdService.createWard({
        name: name.trim(),
        type,
        floor: floor.trim() || undefined,
        department: departmentId || undefined,
      });
      setWards((prev) => [...prev, response.data.ward]);
      setNewWardStatus(`Ward "${response.data.ward.name}" created.`);
      setNewWardForm({ name: "", type: "general", floor: "", departmentId: "" });
    } catch (err) {
      setNewWardStatus(err.response?.data?.error || "Failed to create ward");
    }
  };

  const submitDeleteWard = async (wardId) => {
    const ok = await confirm({
      title: "Remove this ward?",
      message: "This only works while the ward has no beds left. This can't be undone.",
      confirmLabel: "Remove ward",
      danger: true,
    });
    if (!ok) return;
    try {
      await ipdService.deleteWard(wardId);
      setWards((prev) => prev.filter((w) => w._id !== wardId));
      setNewWardStatus("Ward removed.");
    } catch (err) {
      setNewWardStatus(err.response?.data?.error || "Failed to remove ward");
    }
  };

  const submitAddBed = async (e) => {
    e.preventDefault();
    const { wardId, bedNumber, dailyCharge, careLevel } = newBedForm;
    if (!wardId || !bedNumber.trim() || dailyCharge === "") {
      setNewBedStatus("Ward, bed number, and daily charge are required.");
      return;
    }
    try {
      setNewBedStatus("Adding...");
      const response = await ipdService.addBed(wardId, {
        bedNumber: bedNumber.trim(),
        dailyCharge: Number(dailyCharge),
        careLevel,
      });
      setWards((prev) => prev.map((w) => (w._id === wardId ? response.data.ward : w)));
      setNewBedStatus(`Bed ${bedNumber.trim()} added.`);
      setNewBedForm((prev) => ({ ...prev, bedNumber: "", dailyCharge: "" }));
    } catch (err) {
      setNewBedStatus(err.response?.data?.error || "Failed to add bed");
    }
  };

  const submitDeleteBed = async (wardId, bedId) => {
    const ok = await confirm({
      title: "Remove this bed?",
      message: "Only vacant beds can be removed. This can't be undone.",
      confirmLabel: "Remove bed",
      danger: true,
    });
    if (!ok) return;
    try {
      const response = await ipdService.deleteBed(wardId, bedId);
      setWards((prev) => prev.map((w) => (w._id === wardId ? response.data.ward : w)));
      setIpdActionStatus("Bed removed.");
    } catch (err) {
      setIpdActionStatus(err.response?.data?.error || "Failed to remove bed");
    }
  };

  
  const submitSetBedStatus = async (wardId, bedId, status) => {
    try {
      const response = await ipdService.updateBedStatus(wardId, bedId, status);
      setWards((prev) => prev.map((w) => (w._id === wardId ? response.data.ward : w)));
      setIpdActionStatus(status === "maintenance" ? "Bed marked under maintenance." : "Bed marked vacant.");
    } catch (err) {
      setIpdActionStatus(err.response?.data?.error || "Failed to update bed status");
    }
  };

  
  
  

  const submitStaffMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim()) {
      setMessageStatus("Write something before posting.");
      return;
    }
    try {
      setMessageStatus("Posting...");
      const response = await messageService.create(newMessageText.trim());
      setStaffMessages((prev) => [response.data.staffMessage, ...prev]);
      setNewMessageText("");
      setMessageStatus("");
    } catch (err) {
      setMessageStatus(err.response?.data?.error || "Failed to post message");
    }
  };

  const deleteStaffMessageAction = async (id) => {
    const ok = await confirm({
      title: "Remove this message?",
      message: "This can't be undone.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      await messageService.delete(id);
      setStaffMessages((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      setMessageStatus(err.response?.data?.error || "Failed to remove message");
    }
  };

  
  
  

  const submitAnnouncement = async (e) => {
    e.preventDefault();
    const { title, message, eventDate } = newAnnouncementForm;
    if (!title.trim() || !message.trim()) {
      setAnnouncementStatus("Title and message are required.");
      return;
    }
    try {
      setAnnouncementStatus("Posting...");
      const response = await announcementService.create({
        title: title.trim(),
        message: message.trim(),
        eventDate: eventDate || undefined,
      });
      setAnnouncements((prev) => [response.data.announcement, ...prev]);
      setNewAnnouncementForm({ title: "", message: "", eventDate: "" });
      setAnnouncementStatus(`"${response.data.announcement.title}" posted.`);
    } catch (err) {
      setAnnouncementStatus(err.response?.data?.error || "Failed to post announcement");
    }
  };

  const toggleAnnouncementAction = async (id) => {
    try {
      const response = await announcementService.toggle(id);
      setAnnouncements((prev) => prev.map((a) => (a._id === id ? response.data.announcement : a)));
    } catch (err) {
      setAnnouncementStatus(err.response?.data?.error || "Failed to update announcement");
    }
  };

  const deleteAnnouncementAction = async (id) => {
    const ok = await confirm({
      title: "Remove this announcement?",
      message: "It will no longer show on the homepage. This can't be undone.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      await announcementService.delete(id);
      setAnnouncements((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      setAnnouncementStatus(err.response?.data?.error || "Failed to remove announcement");
    }
  };

  
  const renderMessagesBoard = () => renderMessagesBoardImpl({ config, deleteStaffMessageAction, loading, messageStatus, newMessageText, setNewMessageText, staffMessages, submitStaffMessage, user });

  
  const renderAnnouncementsWorkspace = () => renderAnnouncementsWorkspaceImpl({ announcementStatus, announcements, deleteAnnouncementAction, loading, newAnnouncementForm, setNewAnnouncementForm, submitAnnouncement, toggleAnnouncementAction });

  
  
  

  const renderIpdWorkspace = (role) => renderIpdWorkspaceImpl(role, { admissionStatusFilter, admissions, admitForm, admitStatus, departments, dischargeDrafts, doctors, ipdActionStatus, ipdBillDrafts, loading, newBedForm, newBedStatus, newWardForm, newWardStatus, setAdmissionStatusFilter, setAdmitForm, setDischargeDrafts, setIpdBillDrafts, setNewBedForm, setNewWardForm, setTransferChoice, submitAddBed, submitAdmitPatient, submitCreateWard, submitDeleteBed, submitDeleteWard, submitDischarge, submitIpdBill, submitSetBedStatus, submitTransferBed, transferChoice, wards });

  
  
  

  
  
  
  
  

  const renderSalarySlipsWorkspace = () => renderSalarySlipsWorkspaceImpl({ loading, markSalaryPaidAction, salaryForm, salaryFormStatus, salarySlips, salaryStaffList, setSalaryForm, submitSalarySlip });

  const renderPatientContent = () => {
    if (section === "pharmacy-orders") {
      return <PatientPharmacyOrders user={user} />;
    }
    if (section === "consultations") {
      return <PatientConsultations user={user} />;
    }
    return renderPatientContentImpl({ bookEmailInput, bookGeneralAppointment, bookingStatus, bookTypeChosen, cancelDrafts, cancelMyAppointment, cancelReasons, config, confirmAndBookSlot, consultationType, current, departments, error, fetchSlots, loading, myEncounters, newTicketForm, newTicketStatus, openCancelId, patientProfile, patientProfileForm, patientProfileMessage, patientProfileSaving, patientReplyDrafts, patientReplyToTicket, payload, queueRefreshing, refreshQueueStatus, renderTicketThread, searchQuery, section, selectedDate, selectedDepartment, setBookEmailInput, setBookingStatus, setBookTypeChosen, setCancelDrafts, setConsultationType, setError, setNewTicketForm, setOpenCancelId, setPatientProfileForm, setPatientReplyDrafts, setPayload, setSearchQuery, setSelectedDate, setSelectedDepartment, setSlots, slots, submitNewTicket, submitPatientProfileUpdate, user });
  };

  
  
  
  const AMBULANCE_STATUS_TONE = { pending: "warning", dispatched: "info", completed: "success", cancelled: "danger" };
  const AMBULANCE_NEXT_ACTIONS = {
    pending: [
      { status: "dispatched", label: "Mark dispatched", cls: "bg-primary text-white hover:bg-primary-dark" },
      { status: "cancelled", label: "Cancel", cls: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100" },
    ],
    dispatched: [
      { status: "completed", label: "Mark completed", cls: "bg-emerald-600 text-white hover:bg-emerald-700" },
      { status: "cancelled", label: "Cancel", cls: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100" },
    ],
    completed: [],
    cancelled: [],
  };

  const renderAmbulanceRequests = () => renderAmbulanceRequestsImpl({ AMBULANCE_NEXT_ACTIONS, AMBULANCE_STATUS_TONE, error, loading, payload, updateAmbulanceStatus });

  const renderAdminContent = () => renderAdminContentImpl({ actionMessage, allAppointments, analytics, approveLeave, assignDoctor, assignDoctorChoice, assignTicket, auditFrom, auditLoading, auditLogs, auditSearched, auditStaffId, auditTo, cancelAppointmentAdmin, cancelDrafts, cancelReasons, config, createDepartment, current, deactivateStaff, departments, doctors, editingStaffId, error, handleSignatureFileChange, handleStaffFormChange, leaveConflicts, leaveHistory, leaveHistoryFilter, leaveRejectDrafts, leaveRequests, leaveTab, loading, newDepartmentName, newStaffResult, openCancelId, payload, rejectLeave, removeDoctor, renderAmbulanceRequests, renderAnnouncementsWorkspace, renderIpdWorkspace, renderMessagesBoard, renderSalarySlipsWorkspace, renderTicketThread, replyToTicket, resetStaffForm, saveDoctorSchedule, scheduleDayOfWeek, scheduleDoctorId, scheduleMessage, scheduleNewCapacity, scheduleNewTime, scheduleSaving, scheduleTimes, searchQuery, section, setAssignDoctorChoice, setAuditFrom, setAuditLoading, setAuditLogs, setAuditSearched, setAuditStaffId, setAuditTo, setCancelDrafts, setLeaveHistoryFilter, setLeaveRejectDrafts, setLeaveTab, setNewDepartmentName, setOpenCancelId, setScheduleDayOfWeek, setScheduleDoctorId, setScheduleMessage, setScheduleNewCapacity, setScheduleNewTime, setScheduleTimes, setSearchQuery, setStaffRoleFilter, setTicketReplyDrafts, setTicketStatus, staffDirectory, staffForm, staffList, staffRoleFilter, startEditStaff, submitAddStaff, ticketActionMessage, ticketReplyDrafts, updateAppointmentStatusAdmin });

  const renderProfileContent = () => renderProfileContentImpl({ error, loading, profileData, profileForm, profileMessage, profileSaving, setProfileForm, submitProfileUpdate });

  const renderDoctorContent = () => {
    if (section === "consultations") {
      return <DoctorConsultations user={user} />;
    }
    return renderDoctorContentImpl({ addRxMedicineLine, clinicalLookupCode, clinicalLookupError, clinicalLookupResult, config, current, doctorApptDate, encounterForm, encounterSaveStatus, error, loading, myWeeklySchedule, payload, removeRxMedicineLine, renderIpdWorkspace, renderMessagesBoard, renderProfileContent, renderStaffContent, renderTicketThread, replyToTicket, runClinicalLookup, rxAppointmentId, rxMedicines, rxNotes, rxStatus, section, setClinicalLookupCode, setDoctorApptDate, setEncounterForm, setRxAppointmentId, setRxMedicines, setRxNotes, setRxStatus, setTicketReplyDrafts, submitEncounter, submitPrescription, ticketReplyDrafts, updateDoctorAppointmentStatus, updateRxMedicineLine });
  };

  const renderStaffContent = () => renderStaffContentImpl({ apptLookupError, apptLookupResult, apptLookupSearched, apptLookupValue, config, current, error, leaveApplyStatus, leaveForm, leaveTotalDays, loading, payload, renderIpdWorkspace, renderMessagesBoard, renderProfileContent, renderTicketThread, replyToTicket, runAppointmentLookup, section, setApptLookupValue, setLeaveForm, setTicketReplyDrafts, submitLeaveApplication, ticketReplyDrafts, updateApptLookupStatus });

  const renderReceptionistContent = () => renderReceptionistContentImpl({ OTHER_CHARGE_PRESETS, addBillOtherCharge, assignDraft, assignStatus, availableDoctorsForSlot, billApplicationFee, billAppointmentFee, billConsultationFee, billDiscountAmount, billDiscountTooHigh, billGenerateStatus, billLiveTotal, billLookupCode, billLookupError, billLookupResult, billLookupSearched, billMedicineChoices, billMedicinesTotal, billOtherCharges, billPaymentMethod, billsList, bookAppointmentStatus, bookDetails, bookPatientMode, checkSlotAvailability, checkingAvailability, config, current, departments, doctorReassignChoice, doctors, error, existingPatientEmailInput, loading, markBillPaidAction, newPatientForm, onBehalfTicketForm, onBehalfTicketStatus, patientSearchResults, patientSearchStatus, patientSearchTerm, pendingGeneralRequests, receptionAppointments, receptionDateFilter, receptionDoctorFilter, receptionStatusFilter, removeBillOtherCharge, renderAmbulanceRequests, renderIpdWorkspace, renderMessagesBoard, renderProfileContent, renderStaffContent, runBillLookup, searchExistingPatients, section, selectedDoctorForBooking, selectedPatient, setAssignDraft, setBillApplicationFee, setBillAppointmentFee, setBillConsultationFee, setBillDiscountAmount, setBillLookupCode, setBillPaymentMethod, setBookDetails, setBookPatientMode, setDoctorReassignChoice, setExistingPatientEmailInput, setNewPatientForm, setOnBehalfTicketForm, setPatientSearchResults, setPatientSearchTerm, setReceptionDateFilter, setReceptionDoctorFilter, setReceptionStatusFilter, setSelectedDoctorForBooking, setSelectedPatient, submitAssignSlot, submitBookAppointment, submitGeneralBooking, submitGenerateBill, submitOnBehalfTicket, submitReassignDoctor, toggleBillMedicine, updateBillOtherCharge, updateReceptionApptStatus });

  const renderPharmacistContent = () => {
    if (section === "pharmacy-orders") {
      return <PharmacistPharmacyOrders />;
    }
    return renderPharmacistContentImpl({ actionMessage, addMedicineForm, config, current, deleteMedicineRow, error, expiringBatches, getBatchDraft, getDispenseDraft, linkedMedicineChoice, loading, lookupResults, lookupSearched, lookupType, lookupValue, medicineCatalog, payload, renderMessagesBoard, renderTicketThread, replyToTicket, runLookup, saveDispenseDraft, section, setAddMedicineForm, setBatchDraft, setDispenseDraft, setLinkedMedicineChoice, setLookupType, setLookupValue, setTicketReplyDrafts, submitAddMedicine, submitRestock, ticketReplyDrafts });
  };

  const renderHomeOverview = () => renderHomeOverviewImpl({ adminHome, announcements, config, doctorHome, homeStats, homeSummary, loading, nurseHome, overviewDate, receptionHome, setOverviewDate, user });

  let content;
  if (section === "home") content = renderHomeOverview();
  else if (config.role === "patient") content = renderPatientContent();
  else if (config.role === "admin") content = renderAdminContent();
  else if (config.role === "doctor") content = renderDoctorContent();
  else if (config.role === "nurse") content = renderStaffContent();
  else if (config.role === "receptionist") content = renderReceptionistContent();
  else if (config.role === "pharmacist") content = renderPharmacistContent();
  else
    content = (
      <EmptyState
        title={current.label}
        description={current.desc}
        accent={config.accent === "crimson" ? "crimson" : "navy"}
      />
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title text-ink">{current.label}</h1>
        <p className="text-slate-soft mt-1 text-sm">{current.desc}</p>
      </div>

      {content}
    </div>
  );
}
