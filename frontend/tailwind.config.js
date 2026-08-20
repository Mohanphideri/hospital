export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        crimson: {
          DEFAULT: "#C8102E",
          dark: "#8C0F22",
          light: "#E63950",
        },
        navy: {
          DEFAULT: "#0F1F3D",
          light: "#1E3A66",
          mid: "#16264D",
        },
        
        
        
        gold: {
          DEFAULT: "#C9973A",
          dark: "#9C7423",
          light: "#E3BD73",
        },
        teal: {
          DEFAULT: "#0E7C6B",
          dark: "#0A5C4F",
          light: "#3FA593",
        },
        
        
        
        void: {
          DEFAULT: "#05070E",
          deep: "#02030A",
          soft: "#0B0F1F",
        },
        aqua: {
          DEFAULT: "#22D3EE",
          dark: "#0891B2",
          light: "#7DE8F8",
        },
        paper: "#FFFFFF",
        mist: "#EEF1F6",
        ink: "#14213D",
        slate: {
          soft: "#5B6478",
        },
        
        sidebar: {
          DEFAULT: "#0F172A",
          hover: "#1E293B",
          active: "#1D2A44",
        },
        
        
        
        
        primary: {
          DEFAULT: "#0F1F3D",
          dark: "#0A1428",
          light: "#1E3A66",
          soft: "#EEF1F6",
        },
        surface: "#F8FAFC",
        card: "#FFFFFF",
        success: { DEFAULT: "#22C55E", soft: "#DCFCE7" },
        warning: { DEFAULT: "#F59E0B", soft: "#FEF3C7" },
        error: { DEFAULT: "#EF4444", soft: "#FEE2E2" },
        "text-primary": "#0F172A",
        "text-secondary": "#64748B",
      },
      fontFamily: {
        display: ["'Inter'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        sans: ["'Inter'", "sans-serif"],
        
        
        editorial: ["'Fraunces'", "serif"],
      },
      fontSize: {
        "page-title": ["28px", { lineHeight: "36px", fontWeight: "700" }],
        "section-title": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "card-title": ["16px", { lineHeight: "24px", fontWeight: "600" }],
        body: ["14px", { lineHeight: "20px", fontWeight: "400" }],
        small: ["12px", { lineHeight: "16px", fontWeight: "500" }],
      },
      spacing: {
        "sp-1": "8px",
        "sp-2": "12px",
        "sp-3": "16px",
        "sp-4": "24px",
        "sp-5": "32px",
        "sp-6": "48px",
      },
      borderRadius: {
        card: "16px",
        control: "10px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(15,23,42,0.05)",
        card: "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
        "card-hover": "0 8px 24px -4px rgba(15,23,42,0.12), 0 2px 6px rgba(15,23,42,0.06)",
        popover: "0 12px 32px -8px rgba(15,23,42,0.18)",
        
        
        
        glow: "0 0 60px -12px rgba(34,211,238,0.55)",
        glowCrimson: "0 0 60px -12px rgba(200,16,46,0.55)",
        glassEdge: "inset 0 1px 0 0 rgba(255,255,255,0.08)",
      },
      letterSpacing: {
        widest2: "0.28em",
      },
      transitionDuration: {
        150: "150ms",
        200: "200ms",
        250: "250ms",
      },
      keyframes: {
        pulseLine: {
          "0%": { strokeDashoffset: "1000" },
          "100%": { strokeDashoffset: "0" },
        },
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        heartbeatLine: {
          "0%": { strokeDashoffset: "500" },
          "80%": { strokeDashoffset: "0" },
          "100%": { strokeDashoffset: "-40" },
        },
        scaleIn: {
          "0%": { opacity: 0, transform: "scale(0.96) translateY(6px)" },
          "100%": { opacity: 1, transform: "scale(1) translateY(0)" },
        },
        orbFloat: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(-3%, 4%) scale(1.06)" },
        },
        gridPan: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "0 -64px" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
      },
      animation: {
        pulseLine: "pulseLine 2.4s ease-out forwards",
        fadeUp: "fadeUp 0.6s ease-out forwards",
        heartbeatLine: "heartbeatLine 1.6s linear infinite",
        scaleIn: "scaleIn 0.18s ease-out forwards",
        orbFloat: "orbFloat 9s ease-in-out infinite",
        gridPan: "gridPan 14s linear infinite",
        shimmer: "shimmer 3.2s linear infinite",
      },
    },
  },
  plugins: [],
};
