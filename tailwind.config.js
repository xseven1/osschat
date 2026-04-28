/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        bg: '#09090f',
        surface: '#0f0f18',
        surface2: '#16161f',
        surface3: '#1c1c28',
        border: '#252535',
        border2: '#303045',
        accent: '#7c6dfa',
        accent2: '#a89aff',
        tx: '#e4e4f0',
        tx2: '#8888a8',
        tx3: '#4a4a68',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease',
        'slide-in': 'slideIn 0.2s ease',
        'pulse-dot': 'pulseDot 1.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideIn: { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseDot: {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.4 },
          '40%': { transform: 'scale(1)', opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}
