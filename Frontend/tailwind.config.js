/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light-mode canvas.
        paper: {
          50:  '#FCF9F4',
          100: '#F7F1E8',
          200: '#EFE5D7',
          300: '#E2D4C0',
          400: '#C9B79D',
        },
        // Text and hairlines.
        ink: {
          50:  '#F8F4EE',
          100: '#F0E9DF',
          200: '#E3D9CC',
          300: '#C4B5A5',
          400: '#9C8B7B',
          500: '#7A6A5C',
          600: '#584A3F',
          700: '#3A2F27',
          800: '#241D18',
          900: '#17130F',
        },
        // Primary accent.
        ember: {
          50:  '#FDF2EE',
          100: '#FBE1D8',
          200: '#F6C0AF',
          300: '#EE9779',
          400: '#E36F4A',
          500: '#D2542C',
          600: '#B4411F',
          700: '#93341A',
          800: '#762C18',
          900: '#5F2615',
        },
        // Secondary accent.
        sage: {
          100: '#E8EDE2',
          300: '#B4C2A4',
          500: '#6F8259',
          700: '#4A5940',
          900: '#2E3728',
        },
        // Dark-mode surfaces.
        night: {
          900: '#12100D',
          800: '#1A1713',
          700: '#241F1A',
          600: '#332B24',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      letterSpacing: {
        'ultra': '0.28em',
      },
      boxShadow: {
        card: '0 1px 2px rgb(23 19 15 / 0.04), 0 10px 30px -18px rgb(23 19 15 / 0.30)',
        lift: '0 2px 6px rgb(23 19 15 / 0.06), 0 28px 50px -26px rgb(23 19 15 / 0.40)',
      },
      backgroundImage: {
        grain:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        drift: {
          '0%, 100%': { transform: 'translateY(0) rotate(var(--tw-rotate, 0deg))' },
          '50%':      { transform: 'translateY(-12px) rotate(var(--tw-rotate, 0deg))' },
        },
        // Indeterminate loading bar.
        progress: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.8s ease-out both',
        drift: 'drift 9s ease-in-out infinite',
        progress: 'progress 1.1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
