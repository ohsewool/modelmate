/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Inter"', '"Segoe UI"', 'system-ui', 'sans-serif'] },
      colors: {
        bg: {
          DEFAULT: '#07091a',
          card:    '#0d1427',
          elevated:'#121e3a',
          border:  'rgba(99,102,241,0.12)',
        },
        primary: {
          DEFAULT: '#6366f1',
          hover:   '#818cf8',
          light:   'rgba(99,102,241,0.12)',
          glow:    'rgba(99,102,241,0.3)',
        },
        cyan:    { DEFAULT: '#22d3ee', light: 'rgba(34,211,238,0.12)' },
        emerald: { DEFAULT: '#10b981', light: 'rgba(16,185,129,0.12)' },
        amber:   { DEFAULT: '#f59e0b', light: 'rgba(245,158,11,0.12)' },
        rose:    { DEFAULT: '#f43f5e', light: 'rgba(244,63,94,0.12)' },
        violet:  { DEFAULT: '#8b5cf6', light: 'rgba(139,92,246,0.12)' },
        slate: {
          50:  '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0',
          300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b',
          600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a',
        },
      },
      boxShadow: {
        'xs':   '0 1px 2px rgba(0,0,0,0.4)',
        'sm':   '0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.4)',
        'card': '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
        'md':   '0 8px 16px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)',
        'lg':   '0 20px 40px rgba(0,0,0,0.5), 0 4px 6px rgba(0,0,0,0.3)',
        'glow': '0 0 0 3px rgba(99,102,241,0.25)',
        'glow-primary': '0 0 24px rgba(99,102,241,0.35)',
        'glow-emerald': '0 0 24px rgba(16,185,129,0.35)',
        'glow-rose':    '0 0 24px rgba(244,63,94,0.35)',
      },
      animation: {
        'fade-in':  'fadeIn .25s ease',
        'slide-up': 'slideUp .3s ease',
        'spin':     'spin .7s linear infinite',
        'pulse':    'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
