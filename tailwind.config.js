/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pink: {
          DEFAULT: '#FF4D9E',
          dark: '#d93585',
        },
        cyan: {
          DEFAULT: '#00C9D4',
          dark: '#00a8b2',
        },
        yellow: {
          DEFAULT: '#FFE500',
          dark: '#e6ce00',
        },
        ink: '#111111',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        retro: '3px 3px 0px #111111',
        'retro-lg': '5px 5px 0px #111111',
        'retro-pink': '3px 3px 0px #FF4D9E',
        'retro-cyan': '3px 3px 0px #00C9D4',
      },
    },
  },
  plugins: [],
}
