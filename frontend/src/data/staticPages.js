import {
  Building2,
  Phone,
  Lock,
  Cookie,
  FileText,
  Receipt,
  Accessibility,
  ShieldCheck,
  Handshake,
  Briefcase,
  Users,
  ClipboardList,
  ClipboardCheck,
  HelpCircle,
} from "lucide-react";

// Content for HeartStone's public informational/legal pages.
// Each entry: { title, eyebrow, icon, intro, updated (optional), sections: [{ heading, body }] }
// `body` can be a string (rendered as a paragraph) or an array of strings
// (rendered as a checklist). `intro` is a short summary shown in the page's
// hero banner, above the detailed sections below it.

export const staticPages = {
  "about-us": {
    title: "About HeartStone Hospital",
    eyebrow: "About us",
    icon: Building2,
    intro:
      "A multi-specialty hospital in Ludhiana, Punjab, bringing registered specialists, modern diagnostics, and round-the-clock emergency care together under one roof.",
    sections: [
      {
        heading: "Who we are",
        body: "HeartStone Hospital is a multi-specialty hospital serving Ludhiana and the surrounding region with outpatient consultations, in-patient care, diagnostics, and 24×7 emergency services. Every department is led by a registered specialist, backed by a nursing and support team trained to keep your visit organized from check-in to follow-up.",
      },
      {
        heading: "Our mission",
        body: "To deliver timely, compassionate, and affordable healthcare to every patient who walks through our doors — supported by a modern hospital management system that keeps reception, your treating doctor, the pharmacy, and billing coordinated, so you're never asked to repeat yourself at every desk.",
      },
      {
        heading: "Our values",
        body: [
          "Patient dignity and privacy come first, in every department",
          "Specialist-led care, not general treatment for specialist problems",
          "Clear communication about diagnosis, cost, and next steps",
          "No patient turned away in a genuine medical emergency",
        ],
      },
      {
        heading: "Our facilities",
        body: [
          "Outpatient (OPD) consultations across cardiology, neurology, orthopedics, pediatrics, and more",
          "In-patient wards with structured bed management and dedicated nursing care",
          "24×7 emergency department with hospital-dispatched ambulance service",
          "On-site pharmacy with live stock checked against every prescription",
          "In-house diagnostic laboratory for routine and specialist testing",
        ],
      },
      {
        heading: "Where to find us",
        body: "HeartStone Hospital is located at 123 Wellness Avenue, Ludhiana, Punjab, India. See our Contact Us page for directions, phone numbers, and email.",
      },
    ],
  },

  "contact-us": {
    title: "Contact Us",
    eyebrow: "Get in touch",
    icon: Phone,
    intro:
      "Reach reception for appointments and billing, or use the emergency line any time of day or night — no account or login required for either.",
    sections: [
      {
        heading: "Reception & general enquiries",
        body: [
          "Phone: +91-161-000-0000",
          "Email: care@heartstone.com",
          "Address: 123 Wellness Avenue, Ludhiana, Punjab, India",
          "Front desk hours: 7:00 AM – 9:00 PM, every day",
        ],
      },
      {
        heading: "Appointments & billing",
        body: "For booking, rescheduling, or billing questions, call reception or sign in to the patient portal, where appointments, prescriptions, and bills are all in one place. Registered patients can also message their care team directly from the portal.",
      },
      {
        heading: "Medical emergencies",
        body: "For a medical emergency, please don't email — use the Emergency button on the home page to request a hospital-dispatched ambulance, or call our emergency line directly. It's staffed 24 hours a day, every day, and no account or login is needed.",
      },
      {
        heading: "Emergency line",
        body: "+91-161-000-0911 — open 24 hours, every day.",
      },
    ],
  },

  "privacy-policy": {
    title: "Privacy Policy",
    eyebrow: "Legal",
    icon: Lock,
    updated: "Last updated: January 2026",
    intro:
      "How HeartStone Hospital collects, uses, and protects the personal and medical information you share with us.",
    sections: [
      {
        heading: "Information we collect",
        body: [
          "Identity and contact details — name, phone number, email, and address provided at registration or booking",
          "Medical information — history, diagnoses, prescriptions, and test results relevant to your treatment",
          "Billing information — details needed to process payments and insurance claims",
          "Usage information — basic technical data (such as login activity) needed to keep the patient portal secure",
        ],
      },
      {
        heading: "How we use your information",
        body: "Your information is used to provide medical care, manage appointments and admissions, process billing and insurance claims, and communicate with you about your treatment. We do not use your medical information for marketing, and we do not sell patient data to third parties.",
      },
      {
        heading: "Who can access your information",
        body: "Access to your medical record is limited to hospital staff directly involved in your care — your treating doctors, nurses, pharmacy, and billing — plus system administrators who maintain the platform. Each staff login is individually audited.",
      },
      {
        heading: "Data protection",
        body: "We take reasonable administrative and technical measures to protect patient data, including access controls tied to staff roles, encrypted transmission of login credentials, and OTP-based verification for patient accounts. No online system can guarantee absolute security, but we continually review our safeguards as the hospital's systems evolve.",
      },
      {
        heading: "Your rights",
        body: [
          "Request a copy of your medical records held by the hospital",
          "Ask us to correct inaccurate contact or demographic details",
          "Ask how your information has been used or shared with your consent",
        ],
      },
      {
        heading: "Retention",
        body: "Medical records are retained for as long as required by applicable healthcare regulations and hospital policy, after which they are securely archived or disposed of.",
      },
      {
        heading: "Contact us about privacy",
        body: "For any privacy-related question or request, contact reception at +91-161-000-0000 or care@heartstone.com, and we'll direct it to the right team.",
      },
    ],
  },

  "cookie-policy": {
    title: "Cookie Policy",
    eyebrow: "Legal",
    icon: Cookie,
    updated: "Last updated: January 2026",
    intro: "What cookies this website uses, why, and how you can control them.",
    sections: [
      {
        heading: "What are cookies",
        body: "Cookies are small files stored on your device that help a website function correctly — for example, keeping you signed in to your patient portal between page visits, instead of asking you to log in again on every page.",
      },
      {
        heading: "How we use cookies",
        body: [
          "Essential cookies — keep you securely signed in to your patient or staff portal session",
          "Preference cookies — remember display settings, such as light or dark mode",
          "We do not use third-party advertising or tracking cookies on this website",
        ],
      },
      {
        heading: "Managing cookies",
        body: "You can control or delete cookies at any time through your browser's settings. Disabling essential cookies will prevent portal login from working correctly, since the session cookie is what keeps you signed in between pages.",
      },
    ],
  },

  "terms-conditions": {
    title: "Terms & Conditions",
    eyebrow: "Legal",
    icon: FileText,
    updated: "Last updated: January 2026",
    intro: "The terms that apply when you use the HeartStone Hospital website and patient portal.",
    sections: [
      {
        heading: "Use of this website",
        body: "This website and patient portal are provided by HeartStone Hospital for booking appointments, viewing medical records and bills, and accessing general hospital information. By using it, you agree to provide accurate information and to use the portal only for your own care, or on behalf of a patient you're authorized to act for.",
      },
      {
        heading: "Appointments",
        body: "Booking an appointment through the portal reserves a specific time slot but does not guarantee immediate treatment on arrival — please arrive on time, bring valid identification, and allow for reasonable waiting time during high-demand periods. Appointments can be cancelled or rescheduled from the portal or by contacting reception.",
      },
      {
        heading: "Account & OTP security",
        body: "Patient accounts are secured with one-time password (OTP) verification tied to your phone number. You're responsible for keeping your phone and any device you're signed in on secure, and for notifying us if you believe your account has been accessed without authorization.",
      },
      {
        heading: "Medical information disclaimer",
        body: "Information on this website — including department descriptions, FAQs, and the automated assistant — is provided for general guidance only and does not replace professional medical advice, diagnosis, or treatment given during an in-person consultation with your doctor.",
      },
      {
        heading: "Limitation of liability",
        body: "While we take reasonable care to keep this website and portal accurate and available, HeartStone Hospital is not liable for any indirect loss arising from reliance on general website content, or from temporary unavailability of the portal due to maintenance or factors outside our control.",
      },
      {
        heading: "Changes to these terms",
        body: 'We may update these terms from time to time to reflect changes in our services or applicable regulations. The "last updated" date at the top of this page reflects the most recent revision.',
      },
    ],
  },

  "refund-policy": {
    title: "Refund & Cancellation Policy",
    eyebrow: "Legal",
    icon: Receipt,
    updated: "Last updated: January 2026",
    intro: "How appointment cancellations and refund requests are handled at HeartStone Hospital.",
    sections: [
      {
        heading: "Appointment cancellations",
        body: "Appointments can be cancelled or rescheduled free of charge from the patient portal or by contacting reception, provided this is done before your scheduled time. Cancelling in advance also frees up the slot for another patient.",
      },
      {
        heading: "Consultation fee refunds",
        body: [
          "Cancelled with reasonable notice before the appointment — eligible for a full refund of the consultation fee",
          "No-show, or cancellation after the scheduled time — generally not eligible for a refund",
          "Appointment cancelled or rescheduled by the hospital (for example, doctor unavailability) — always eligible for a full refund or free rebooking, whichever you prefer",
        ],
      },
      {
        heading: "Billing & pharmacy refunds",
        body: "Refunds for billed services or pharmacy purchases are assessed case by case by our billing desk, depending on the service and whether it has already been delivered. Please raise a request with billing as soon as possible after the issue arises.",
      },
      {
        heading: "How to request a refund",
        body: "Contact our billing desk at reception, or call +91-161-000-0000, with your appointment code or bill number. We'll confirm eligibility and the expected processing time for your specific case.",
      },
      {
        heading: "Processing time",
        body: "Approved refunds are processed back to the original payment method within a standard banking timeframe, typically 5–10 business days depending on your bank or card issuer.",
      },
    ],
  },

  "accessibility-statement": {
    title: "Accessibility Statement",
    eyebrow: "Legal",
    icon: Accessibility,
    intro: "Our commitment to making both this website and our physical facility usable by patients of all abilities.",
    sections: [
      {
        heading: "Our commitment",
        body: "HeartStone Hospital is committed to making our website and physical facilities accessible to patients of all abilities. We treat accessibility as an ongoing responsibility, not a one-time checklist.",
      },
      {
        heading: "Website accessibility",
        body: [
          "Clear text sizing and color contrast across the site and patient portal",
          "Keyboard-navigable forms for booking appointments and signing in",
          "Descriptive labels on interactive elements for screen reader users",
        ],
      },
      {
        heading: "Physical accessibility",
        body: [
          "Wheelchair-accessible entrances, corridors, and wards",
          "Accessible restrooms on patient care floors",
          "Assistance available at reception on request, including help reaching a department or ward",
        ],
      },
      {
        heading: "Feedback",
        body: "If you encounter an accessibility barrier on this website or at our facility, please let reception know, either in person or at +91-161-000-0000 — we treat every report as an opportunity to fix a real barrier for the next patient.",
      },
    ],
  },

  "patient-rights": {
    title: "Patient Rights & Responsibilities",
    eyebrow: "For patients",
    icon: ShieldCheck,
    intro: "What you can expect from us as a patient, and what we ask of you in return, so your care runs smoothly for everyone.",
    sections: [
      {
        heading: "Your rights",
        body: [
          "Receive respectful, non-discriminatory care regardless of background, condition, or ability to pay in an emergency",
          "Be informed about your diagnosis, treatment options, and their risks in plain language",
          "Give or withhold informed consent for procedures, other than in a genuine emergency",
          "Access your own medical records and request corrections to inaccurate details",
          "Privacy and confidentiality of your health information, as described in our Privacy Policy",
          "Seek a second opinion, and request a transfer of care where medically appropriate",
        ],
      },
      {
        heading: "Your responsibilities",
        body: [
          "Provide accurate and complete information about your health, history, and medications",
          "Follow the treatment plan agreed with your doctor, and ask questions if anything is unclear",
          "Keep scheduled appointments, or cancel with reasonable notice if you can't attend",
          "Treat hospital staff, other patients, and visitors with courtesy and respect",
          "Settle billing matters promptly, or raise concerns with billing directly if there's a dispute",
        ],
      },
      {
        heading: "Raising a concern",
        body: "If you feel your rights as a patient haven't been respected, please raise it with the ward or department in charge, or contact reception so it can be escalated to hospital administration.",
      },
    ],
  },

  "insurance-partners": {
    title: "Insurance Partners",
    eyebrow: "Billing & insurance",
    icon: Handshake,
    intro: "How cashless and reimbursement claims work at HeartStone Hospital, and what to bring for a smooth billing experience.",
    sections: [
      {
        heading: "Cashless & reimbursement claims",
        body: "HeartStone works with a number of insurance providers and third-party administrators (TPAs) to support both cashless treatment and reimbursement claims. Coverage varies by insurer and policy, so please check with our billing desk ahead of a planned admission to confirm your specific policy is supported.",
      },
      {
        heading: "For planned (non-emergency) admissions",
        body: [
          "Contact billing at least 48 hours ahead to begin pre-authorization with your insurer",
          "Bring your insurance card and policy number to registration",
          "Bring a government-issued photo ID matching your policy details",
          "Bring any referral letter or prior medical records related to the admission",
        ],
      },
      {
        heading: "For emergency admissions",
        body: "In an emergency, treatment is never delayed for insurance paperwork. Our billing desk will coordinate with your insurer once you're stabilized — a family member or attendant can help provide policy details when convenient.",
      },
      {
        heading: "Questions about coverage",
        body: "For the current list of supported insurers and TPAs, or help understanding what your specific policy covers, speak with our billing desk at reception or call +91-161-000-0000.",
      },
    ],
  },

  careers: {
    title: "Careers at HeartStone",
    eyebrow: "Join us",
    icon: Briefcase,
    intro: "We're always glad to hear from qualified doctors, nurses, technicians, and administrative staff who share our commitment to patient care.",
    sections: [
      {
        heading: "Why work with us",
        body: [
          "Specialist-led departments with real clinical autonomy",
          "A modern hospital management system, not paper charts and spreadsheets",
          "Structured onboarding and ongoing training for clinical and support staff",
          "A culture that treats patient dignity as non-negotiable, at every level",
        ],
      },
      {
        heading: "Areas we hire for",
        body: [
          "Physicians and specialists across our clinical departments",
          "Nursing and ward care staff",
          "Pharmacy and laboratory technicians",
          "Reception, billing, and hospital administration",
        ],
      },
      {
        heading: "How to apply",
        body: "Send your CV and a short cover letter to our HR team at careers@heartstone.com, noting the department or role you're interested in. We review every application and will reach out directly if there's a fit — for a current opening or a future one.",
      },
    ],
  },

  "visitor-guidelines": {
    title: "Visitor Guidelines",
    eyebrow: "For visitors",
    icon: Users,
    intro: "A few simple guidelines that keep wards calm, safe, and comfortable for every patient — not just the one you're visiting.",
    sections: [
      {
        heading: "Before you visit",
        body: [
          "Check in at reception before heading to a ward",
          "Carry a valid photo ID — it may be requested at the ward desk",
          "If you have any cold, flu, or infectious symptoms, please postpone your visit",
        ],
      },
      {
        heading: "While on the ward",
        body: [
          "Keep noise to a minimum out of respect for other patients",
          "Limit visits to the recommended number of visitors per patient at a time",
          "Follow any specific instructions from ward staff, including on personal items or food brought in",
          "Wash or sanitize your hands before and after visiting",
        ],
      },
      {
        heading: "Restricted areas",
        body: "The ICU, isolation wards, and operation theatres have limited or no visitor access to protect patient safety and infection control. Please ask ward staff about specific arrangements if your family member is in one of these areas.",
      },
      {
        heading: "Visiting hours",
        body: "General visiting hours are typically mid-morning to early evening. Exact timings can vary by ward — please confirm with the ward desk when you arrive, or call reception ahead of your visit.",
      },
    ],
  },

  "admission-process": {
    title: "Admission Process",
    eyebrow: "Patient information",
    icon: ClipboardList,
    intro: "What to expect if you or a family member is being admitted to HeartStone Hospital, whether planned or through the emergency department.",
    sections: [
      {
        heading: "Before admission",
        body: "Admission is usually recommended by your treating doctor after an outpatient consultation, or arranged directly through the emergency department for urgent cases. For planned admissions, our billing desk can help confirm insurance coverage in advance — see our Insurance Partners page.",
      },
      {
        heading: "Steps on the day",
        body: [
          "Doctor recommends admission and the receiving department",
          "Reception registers the patient and completes admission paperwork",
          "A ward bed is assigned based on availability and the level of care needed",
          "Nursing staff complete an initial assessment and orient you to the ward",
        ],
      },
      {
        heading: "What to bring",
        body: [
          "A valid government-issued photo ID",
          "Any referral letter or previous medical records relevant to this admission",
          "A list of current medications, including dosages",
          "Insurance card and policy details, if applicable",
          "Comfortable personal items for your stay — the ward desk can advise on what's practical to bring",
        ],
      },
    ],
  },

  "discharge-process": {
    title: "Discharge Process",
    eyebrow: "Patient information",
    icon: ClipboardCheck,
    intro: "What happens on the day you're discharged, so you leave with everything you need for recovery at home.",
    sections: [
      {
        heading: "Before discharge",
        body: "Discharge happens once your treating doctor confirms you're medically ready to leave. They'll walk you through any follow-up care, medication changes, and further appointments needed before you go.",
      },
      {
        heading: "Steps on the day",
        body: [
          "Doctor signs off on discharge and documents follow-up instructions",
          "Reception prepares the final bill for your stay, including any insurance adjustments",
          "Pharmacy dispenses any take-home medication and explains dosage",
          "You receive a discharge summary covering your diagnosis, treatment, and follow-up plan",
        ],
      },
      {
        heading: "After you go home",
        body: "Keep your discharge summary somewhere accessible — you'll need it for follow-up appointments, and it's useful if you see another doctor in the meantime. If anything in your recovery doesn't match what you were told to expect, contact reception or your treating department rather than waiting for your next scheduled visit.",
      },
    ],
  },

  faq: {
    title: "Frequently Asked Questions",
    eyebrow: "FAQ",
    icon: HelpCircle,
    intro: "Quick answers to the questions we hear most often from patients — booking, fees, records, and emergencies.",
    sections: [
      {
        heading: "How do I book an appointment?",
        body: 'Use the "Book an appointment" button on the home page — verify your phone number with a one-time password (OTP), then pick a department and an available time slot. No separate account setup is needed. You can also book by contacting reception directly, or from within the patient portal once you\'re registered.',
      },
      {
        heading: "What is the appointment fee?",
        body: "The standard outpatient consultation fee is ₹500. Any further consultations, tests, procedures, or medicines are billed separately after your visit, and itemized on your bill in the patient portal.",
      },
      {
        heading: "How do I request an ambulance?",
        body: "Use the Emergency button available on every page of this website — it works instantly with no login required. You can also call our emergency line at +91-161-000-0911, open 24 hours a day, every day.",
      },
      {
        heading: "Can I access my medical reports online?",
        body: "Yes. Once you sign in to your patient portal with your phone number, your prescriptions, test results, and billing history are all available there, organized by visit.",
      },
      {
        heading: "Do you accept insurance?",
        body: "We work with a number of insurance providers and TPAs for both cashless and reimbursement claims. See our Insurance Partners page, or contact our billing desk to confirm whether your specific policy is supported.",
      },
      {
        heading: "How do I cancel or reschedule an appointment?",
        body: "You can cancel or reschedule directly from the patient portal, or by contacting reception, provided it's done before your scheduled time. See our Refund & Cancellation Policy for how this affects the consultation fee.",
      },
      {
        heading: "Who do I contact if I have a complaint?",
        body: "Please raise it with the relevant department or ward first, so it can be addressed quickly. If you'd like it escalated further, contact reception and ask for hospital administration.",
      },
    ],
  },
};
