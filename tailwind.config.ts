import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        shell: {
          bg: '#e8eaef',
          surface: '#f7f5f2',
          card: '#ffffff',
          warm: '#faf8f5',
        },
        ink: {
          900: '#1a1a1a',
          800: '#2d2d2d',
          700: '#3d3d3d',
          600: '#555555',
          500: '#717171',
          400: '#9a9a9a',
          300: '#c4c4c4',
          200: '#e0dedb',
          100: '#f0eeeb',
          50: '#f7f5f2',
        },
        accent: {
          yellow: '#e8c860',
          'yellow-soft': '#fdf6e3',
          'yellow-muted': '#f5edcf',
          'yellow-text': '#6b5c10',
          charcoal: '#2d2d2d',
          dark: '#1a1a1a',
        },
        status: {
          success: '#5a9a6b',
          'success-soft': '#eef6f0',
          danger: '#c25450',
          'danger-soft': '#fdf0ef',
          info: '#5a7fa8',
          'info-soft': '#eef3f8',
        },
      },
      borderRadius: {
        'shell': '32px',
        'card': '24px',
        'card-sm': '16px',
        'pill': '999px',
      },
      boxShadow: {
        'shell': '0 8px 60px rgba(0,0,0,0.08)',
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.06)',
        'pill': '0 1px 4px rgba(0,0,0,0.06)',
        'dark-card': '0 2px 12px rgba(0,0,0,0.15)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
