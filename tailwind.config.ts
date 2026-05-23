import type { Config } from "tailwindcss";

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
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
          pressed: "hsl(var(--primary-pressed))",
          subtle: "hsl(var(--primary-subtle))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          hover: "hsl(var(--destructive-hover))",
          pressed: "hsl(var(--destructive-pressed))",
          subtle: "hsl(var(--destructive-subtle))",
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
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          hover: "hsl(var(--success-hover))",
          pressed: "hsl(var(--success-pressed))",
          subtle: "hsl(var(--success-subtle))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          hover: "hsl(var(--warning-hover))",
          pressed: "hsl(var(--warning-pressed))",
          subtle: "hsl(var(--warning-subtle))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          hover: "hsl(var(--info-hover))",
          pressed: "hsl(var(--info-pressed))",
          subtle: "hsl(var(--info-subtle))",
        },
        ai: {
          DEFAULT: "hsl(var(--ai))",
          foreground: "hsl(var(--ai-foreground))",
          hover: "hsl(var(--ai-hover))",
          pressed: "hsl(var(--ai-pressed))",
          subtle: "hsl(var(--ai-subtle))",
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
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-secondary": "var(--gradient-secondary)",
        "gradient-hero": "var(--gradient-hero)",
      },
      fontFamily: {
        sans: ['"Geist Variable"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Geist Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        display: ['3rem',      { lineHeight: '1.1', letterSpacing: '-0.02em',  fontWeight: '600' }],
        h1:      ['1.875rem',  { lineHeight: '1.2', letterSpacing: '-0.015em', fontWeight: '600' }],
        h2:      ['1.25rem',   { lineHeight: '1.3', letterSpacing: '-0.01em',  fontWeight: '600' }],
        h3:      ['1rem',      { lineHeight: '1.4', letterSpacing: '-0.005em', fontWeight: '600' }],
        body:    ['0.875rem',  { lineHeight: '1.5', letterSpacing: '0',        fontWeight: '400' }],
        caption: ['0.75rem',   { lineHeight: '1.4', letterSpacing: '0.005em',  fontWeight: '400' }],
        micro:   ['0.6875rem', { lineHeight: '1.3', letterSpacing: '0.01em',   fontWeight: '500' }],
      },
      boxShadow: {
        xs:      'var(--shadow-xs)',
        sm:      'var(--shadow-sm)',
        md:      'var(--shadow-md)',
        lg:      'var(--shadow-lg)',
        overlay: 'var(--shadow-overlay)',
        focus:   'var(--shadow-focus)',
      },
      spacing: {
        tight:   'var(--space-tight)',
        default: 'var(--space-default)',
        loose:   'var(--space-loose)',
        section: 'var(--space-section)',
        page:    'var(--space-page)',
      },
      transitionTimingFunction: {
        snap:   'var(--ease-snap)',
        glide:  'var(--ease-glide)',
        soften: 'var(--ease-soften)',
        emerge: 'var(--ease-emerge)',
        spring: 'var(--ease-spring)',
      },
      transitionDuration: {
        instant:    'var(--duration-instant)',
        default:    'var(--duration-default)',
        deliberate: 'var(--duration-deliberate)',
        cerimonial: 'var(--duration-cerimonial)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-slow": {
          "0%, 100%": { backgroundColor: "rgb(16 185 129 / 0.05)" },
          "50%": { backgroundColor: "rgb(16 185 129 / 0.15)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.25s ease-out",
        "pulse-slow": "pulse-slow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
