import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter Tight', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Fraunces', 'Georgia', 'serif'],
        display: ['var(--font-display)', 'Fraunces', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Eyebrow / micro
        'eyebrow': ['10.5px', { lineHeight: '1', letterSpacing: '0.22em', fontWeight: '500' }],
        // Body 13px
        'body': ['13px', { lineHeight: '1.55' }],
        // Label
        'label': ['12px', { lineHeight: '1.4', fontWeight: '500' }],
        // Mono
        'mono-sm': ['11px', { lineHeight: '1.3' }],
        'mono-base': ['12px', { lineHeight: '1.3' }],
        // Display
        'display-kpi': ['40px', { lineHeight: '1', letterSpacing: '-0.03em', fontWeight: '600' }],
        'display-h1': ['40px', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '600' }],
        'display-h2': ['26px', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-h3': ['19px', { lineHeight: '1.25', letterSpacing: '-0.015em', fontWeight: '600' }],
      },
      letterSpacing: {
        'eyebrow': '0.22em',
        'eyebrow-tight': '0.18em',
        'eyebrow-wide': '0.24em',
      },
      colors: {
        // shadcn aliases
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
          ink: "hsl(var(--sidebar-ink))",
          "ink-mute": "hsl(var(--sidebar-ink-mute))",
          active: "hsl(var(--sidebar-active))",
          "active-ink": "hsl(var(--sidebar-active-ink))",
        },
        risk: {
          high: "hsl(var(--risk-high))",
          "high-foreground": "hsl(var(--risk-high-foreground))",
          medium: "hsl(var(--risk-medium))",
          "medium-foreground": "hsl(var(--risk-medium-foreground))",
          low: "hsl(var(--risk-low))",
          "low-foreground": "hsl(var(--risk-low-foreground))",
        },
        status: {
          pending: "hsl(var(--status-pending))",
          active: "hsl(var(--status-active))",
          completed: "hsl(var(--status-completed))",
          expired: "hsl(var(--status-expired))",
        },

        // === CCA Legal Hub — design tokens nomeados ===
        bg: "hsl(var(--bg))",
        "bg-alt": "hsl(var(--bg-alt))",
        surface: "hsl(var(--surface))",
        ink: {
          DEFAULT: "hsl(var(--ink))",
          soft: "hsl(var(--ink-soft))",
          mute: "hsl(var(--ink-mute))",
        },
        line: {
          DEFAULT: "hsl(var(--line))",
          soft: "hsl(var(--line-soft))",
        },
        brand: {
          DEFAULT: "hsl(var(--accent-brand))",
          soft: "hsl(var(--accent-brand-soft))",
          strong: "hsl(var(--accent-brand-strong))",
        },
        positive: "hsl(var(--positive))",
        warn: "hsl(var(--warn))",
        danger: "hsl(var(--danger))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "var(--radius-control)",
        sm: "calc(var(--radius-control) - 1px)",
        card: "var(--radius-card)",
        control: "var(--radius-control)",
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'elevated': 'var(--shadow-elevated)',
      },
      backgroundImage: {
        'gradient-hero': 'var(--gradient-hero)',
        'gradient-card': 'var(--gradient-card)',
        'gradient-sidebar': 'var(--gradient-sidebar)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
