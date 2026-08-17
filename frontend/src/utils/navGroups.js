import {
  LayoutDashboard,
  CalendarDays,
  Stethoscope,
  BedDouble,
  ClipboardList,
  Receipt,
  Pill,
  PackagePlus,
  AlertTriangle,
  Users,
  UserPlus,
  Building2,
  ShieldCheck,
  LifeBuoy,
  Ambulance,
  UserCircle,
  Search,
  ListChecks,
  Wallet2,
  FileText,
  Circle,
  MessageSquare,
  Megaphone,
} from "lucide-react";

// Per-path icon (falls back to a generic dot). Purely cosmetic - does not affect routing.
const ICONS = {
  home: LayoutDashboard,
  analytics: LayoutDashboard,
  appointments: CalendarDays,
  "book-appointment": CalendarDays,
  book: CalendarDays,
  "appointment-lookup": Search,
  queue: ListChecks,
  clinical: Stethoscope,
  schedule: Stethoscope,
  "doctor-schedule": Stethoscope,
  ipd: BedDouble,
  prescriptions: FileText,
  lookup: Search,
  "medical-records": ClipboardList,
  billing: Receipt,
  bills: Receipt,
  cashflow: Wallet2,
  inventory: Pill,
  "add-medicine": PackagePlus,
  "expiry-alerts": AlertTriangle,
  staff: Users,
  "add-staff": UserPlus,
  departments: Building2,
  "leave-requests": ClipboardList,
  leave: CalendarDays,
  "leave-history": CalendarDays,
  "ambulance-requests": Ambulance,
  tickets: LifeBuoy,
  "create-query": LifeBuoy,
  queries: LifeBuoy,
  "audit-logs": ShieldCheck,
  profile: UserCircle,
  messages: MessageSquare,
  announcements: Megaphone,
};

export const iconForSection = (path) => ICONS[path] || Circle;

// Ordered workflow groups. Each section is bucketed by keyword match on its path,
// so this works across every role's existing (unmodified) portals.js section list.
const GROUP_DEFS = [
  { key: "dashboard", label: "Dashboard", match: (p) => p === "home" || p === "analytics" },
  {
    key: "patients",
    label: "Patients & Care",
    match: (p) =>
      [
        "appointments",
        "book-appointment",
        "book",
        "appointment-lookup",
        "queue",
        "clinical",
        "schedule",
        "doctor-schedule",
        "ipd",
        "prescriptions",
        "lookup",
        "medical-records",
      ].includes(p),
  },
  {
    key: "operations",
    label: "Operations",
    match: (p) => ["billing", "bills", "cashflow", "inventory", "add-medicine", "expiry-alerts", "departments"].includes(p),
  },
  {
    key: "hr",
    label: "HR & Staff",
    match: (p) => ["staff", "add-staff", "leave-requests", "leave", "leave-history"].includes(p),
  },
  {
    key: "support",
    label: "Support & Alerts",
    match: (p) => ["ambulance-requests", "tickets", "create-query", "queries", "audit-logs", "messages", "announcements"].includes(p),
  },
  { key: "settings", label: "Settings", match: (p) => p === "profile" },
];

// Receptionist gets a bespoke grouping (Front Desk workflow) instead of the
// generic keyword-matched buckets below, so the sidebar mirrors how a real
// front-desk shift actually works: check people in, handle money, handle
// comms, handle admin - in that order.
const RECEPTIONIST_GROUPS = [
  { key: "dashboard", label: "Dashboard", match: (p) => p === "home" },
  { key: "patients", label: "Patients & Care", match: (p) => ["book-appointment", "appointments", "ipd"].includes(p) },
  { key: "operations", label: "Operations", match: (p) => ["billing", "bills"].includes(p) },
  { key: "communication", label: "Communication", match: (p) => ["ambulance-requests", "messages"].includes(p) },
  { key: "support", label: "Support", match: (p) => ["leave", "leave-history", "create-query", "tickets"].includes(p) },
  { key: "settings", label: "Settings", match: (p) => p === "profile" },
];

// Every other staff role gets the same bespoke, workflow-first treatment as
// reception rather than the generic keyword buckets - a doctor's sidebar
// reads like a clinical day (patients, then schedule, then admin), a nurse's
// like a ward shift, a pharmacist's like a dispensing counter, and admin's
// like hospital-wide oversight.
const DOCTOR_GROUPS = [
  { key: "dashboard", label: "Dashboard", match: (p) => p === "home" },
  { key: "patients", label: "Patients & Care", match: (p) => ["appointments", "clinical", "ipd"].includes(p) },
  { key: "schedule", label: "Schedule & Records", match: (p) => ["schedule", "prescriptions"].includes(p) },
  { key: "communication", label: "Communication", match: (p) => p === "messages" },
  { key: "support", label: "Support", match: (p) => ["leave", "leave-history", "tickets", "my-salary"].includes(p) },
  { key: "settings", label: "Settings", match: (p) => p === "profile" },
];

const NURSE_GROUPS = [
  { key: "dashboard", label: "Dashboard", match: (p) => p === "home" },
  { key: "patients", label: "Ward & Patients", match: (p) => ["appointment-lookup", "ipd"].includes(p) },
  { key: "schedule", label: "Schedule", match: (p) => p === "schedule" },
  { key: "communication", label: "Communication", match: (p) => p === "messages" },
  { key: "support", label: "Support", match: (p) => ["leave", "leave-history", "tickets", "my-salary"].includes(p) },
  { key: "settings", label: "Settings", match: (p) => p === "profile" },
];

const PHARMACIST_GROUPS = [
  { key: "dashboard", label: "Dashboard", match: (p) => p === "home" },
  { key: "pharmacy", label: "Pharmacy", match: (p) => ["lookup", "inventory", "add-medicine", "expiry-alerts"].includes(p) },
  { key: "communication", label: "Communication", match: (p) => p === "messages" },
  { key: "support", label: "Support", match: (p) => ["tickets"].includes(p) },
  { key: "settings", label: "Settings", match: (p) => p === "profile" },
];

const ADMIN_GROUPS = [
  { key: "dashboard", label: "Dashboard", match: (p) => p === "home" || p === "analytics" },
  { key: "people", label: "People", match: (p) => ["staff", "add-staff", "departments"].includes(p) },
  { key: "facilities", label: "Facilities & Scheduling", match: (p) => ["wards", "doctor-schedule"].includes(p) },
  { key: "operations", label: "Operations", match: (p) => ["appointments", "ambulance-requests"].includes(p) },
  { key: "hr", label: "HR & Payroll", match: (p) => ["leave-requests"].includes(p) },
  { key: "communication", label: "Communication", match: (p) => ["tickets", "messages", "announcements"].includes(p) },
  { key: "settings", label: "Settings", match: (p) => p === "profile" },
];

const ROLE_GROUP_OVERRIDES = {
  receptionist: RECEPTIONIST_GROUPS,
  doctor: DOCTOR_GROUPS,
  nurse: NURSE_GROUPS,
  pharmacist: PHARMACIST_GROUPS,
  admin: ADMIN_GROUPS,
};

export function groupSections(sections, role) {
  const defs = ROLE_GROUP_OVERRIDES[role] || GROUP_DEFS;
  const buckets = defs.map((g) => ({ ...g, items: [] }));
  const fallback = { key: "general", label: "General", items: [] };

  sections.forEach((s) => {
    const bucket = buckets.find((g) => g.match(s.path));
    (bucket || fallback).items.push(s);
  });

  return [...buckets, fallback].filter((g) => g.items.length > 0);
}
