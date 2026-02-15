import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        pixie: {
          // LIGHT MODE
          sage: {
            50:  "#f3f7f5",
            100: "#e2ece8",
            200: "#c5d8d0",
            300: "#a8c4b8",
            400: "#8FAF9D",
            500: "#7b9d8b",
            600: "#537061", // Darkened for WCAG AA compliance (was #648474)
            700: "#3d5449", // Darkened for better contrast (was #4f685c)
            800: "#3a4d45",
            900: "#27332e"
          },
          cream: {
            50:  "#fdfbf8",
            100: "#F4EFE6",
            200: "#e6dfd4",
            300: "#d6cbbd",
            400: "#c3b6a6"
          },
          charcoal: {
            100: "#4a4a4a",
            200: "#3a3a3a",
            300: "#2B2B2B",
            400: "#1f1f1f"
          },

          // DARK MODE BASES
          dusk: {
            50:  "#1E2220",
            100: "#242826",
            200: "#2E3431",
            300: "#3A423F"
          },

          mist: {
            100: "#C9D3CE",
            200: "#AEB9B3",
            300: "#8F9A94"
          },

          glow: {
            sage: "#7FAF9B",
            gold: "#E6C97A",
            lavender: "#C6C1F2"
          }
        }
      },

      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ],
        display: [
          "Plus Jakarta Sans",
          "Inter",
          "sans-serif"
        ]
      },

      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '28px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['32px', { lineHeight: '40px' }],
      },

      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem"
      },

      boxShadow: {
        pixie: "0 8px 24px rgba(0, 0, 0, 0.06)",
        "pixie-soft": "0 4px 16px rgba(0, 0, 0, 0.04)",
        "pixie-dark": "0 8px 24px rgba(0, 0, 0, 0.4)"
      },

      animation: {
        sparkle: "sparkle 1.8s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        breathe: "breathe 3s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "confetti-pop": "confetti-pop 0.6s ease-out",
        bounce: "bounce 1s infinite",
      },

      keyframes: {
        sparkle: {
          "0%, 100%": { opacity: "0.4", transform: "scale(0.95)" },
          "50%": { opacity: "1", transform: "scale(1.05)" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-4px)" }
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        "confetti-pop": {
          "0%": { opacity: "0", transform: "scale(0) rotate(0deg)" },
          "50%": { opacity: "1", transform: "scale(1.2) rotate(180deg)" },
          "100%": { opacity: "0", transform: "scale(0.8) rotate(360deg)" }
        },
        bounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-25%)" }
        },
        "check-pop": {
          "0%": { transform: "scale(1)" },
          "30%": { transform: "scale(1.3)" },
          "60%": { transform: "scale(0.9)" },
          "100%": { transform: "scale(1)" }
        },
        "check-draw": {
          "0%": { opacity: "0", transform: "scale(0) rotate(-45deg)" },
          "50%": { opacity: "1", transform: "scale(1.2) rotate(0deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(0deg)" }
        },
        "check-ripple": {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(2)", opacity: "0" }
        }
      }
    }
  },
  plugins: []
} satisfies Config;
