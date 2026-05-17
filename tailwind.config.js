/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Bebas Neue', 'Inter', 'sans-serif'],
      },
      colors: {
        bg: '#0a0e1a',
        panel: '#111729',
        line: '#1f2940',
        ink: '#e6edf7',
        mute: '#8a96b2',
        tier: {
          common: '#9ca3af',
          rare: '#3b82f6',
          epic: '#a855f7',
          legendary: '#f5c542',
        },
      },
      boxShadow: {
        card: '0 8px 30px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
};
