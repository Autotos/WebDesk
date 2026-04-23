import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
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
        /* macOS theme tokens */
        "mac-topbar": "hsl(var(--mac-topbar))",
        "mac-topbar-text": "hsl(var(--mac-topbar-text))",
        "mac-dock": "hsl(var(--mac-dock))",
        "mac-window": "hsl(var(--mac-window))",
        "mac-titlebar": "hsl(var(--mac-titlebar))",
        "mac-sidebar": "hsl(var(--mac-sidebar))",
        "mac-accent": "hsl(var(--mac-accent))",
        "mac-close": "hsl(var(--mac-close))",
        "mac-minimize": "hsl(var(--mac-minimize))",
        "mac-maximize": "hsl(var(--mac-maximize))",
        "mac-border": "hsl(var(--mac-border))",
        /* Android Material You tokens */
        "android-surface": "hsl(var(--android-surface))",
        "android-primary": "hsl(var(--android-primary))",
        "android-on-primary": "hsl(var(--android-on-primary))",
        "android-secondary": "hsl(var(--android-secondary))",
        "android-on-secondary": "hsl(var(--android-on-secondary))",
        "android-nav": "hsl(var(--android-nav))",
        "android-status": "hsl(var(--android-status))",
        "android-card": "hsl(var(--android-card))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        window: "var(--radius-window)",
        "app-icon": "var(--radius-app-icon)",
        "android-icon": "var(--radius-android-icon)",
      },
      boxShadow: {
        "window": "var(--shadow-window)",
        "window-active": "var(--shadow-window-active)",
        "dock": "var(--shadow-dock)",
        "android-card": "var(--shadow-android-card)",
        "topbar": "var(--shadow-topbar)",
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
        "window-open": {
          from: { opacity: "0", transform: "scale(0.88)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "window-close": {
          from: { opacity: "1", transform: "scale(1)" },
          to: { opacity: "0", transform: "scale(0.88)" },
        },
        "app-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "window-open": "window-open 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        "window-close": "window-close 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "app-bounce": "app-bounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "slide-up": "slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
