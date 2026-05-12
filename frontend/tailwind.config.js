/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Inter"', '"Segoe UI"', 'system-ui', 'sans-serif'] },
      colors: {
        bg: {
          DEFAULT: '#f8fafc',
          card:    '#ffffff',
          elevated:'#f1f5f9',
          border:  '#e2e8f0',
        },
        primary: {
          DEFAULT: '#6366f1',
          hover:   '#4f46e5',
          light:   'rgba(99,102,241,0.08)',
          glow:    'rgba(99,102,241,0.2)',
        },
        cyan:    { DEFAULT: '#0891b2', light: 'rgba(8,145,178,0.08)' },
        emerald: { DEFAULT: '#059669', light: 'rgba(5,150,105,0.08)' },
        amber:   { DEFAULT: '#d97706', light: 'rgba(217,119,6,0.08)' },
        rose:    { DEFAULT: '#e11d48', light: 'rgba(225,29,72,0.08)' },
        violet:  { DEFAULT: '#7c3aed', light: 'rgba(124,58,237,0.08)' },
        slate: {
          50:  '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0',
          300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b',
          600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a',
        },
      },
      boxShadow: {
        'xs':   '0 1px 2px rgba(0,0,0,0.05)',
        'sm':   '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05)',
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'md':   '0 4px 12px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04)',
        'lg':   '0 10px 24px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)',
        'glow': '0 0 0 3px rgba(99,102,241,0.12)',
      },
      animation: {
        'fade-in':  'fadeIn .2s ease',
        'slide-up': 'slideUp .25s ease',
        'spin':     'spin .7s linear infinite',
        'pulse':    'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
