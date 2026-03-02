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
          DEFAULT: 'rgb(var(--pink) / <alpha-value>)',
          dark: 'rgb(var(--pink-dark) / <alpha-value>)',
        },
        cyan: {
          DEFAULT: 'rgb(var(--cyan) / <alpha-value>)',
          dark: 'rgb(var(--cyan-dark) / <alpha-value>)',
        },
        yellow: {
          DEFAULT: 'rgb(var(--yellow) / <alpha-value>)',
          dark: 'rgb(var(--yellow-dark) / <alpha-value>)',
        },
        ink: 'rgb(var(--ink) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        retro: '3px 3px 0px rgb(var(--ink))',
        'retro-lg': '5px 5px 0px rgb(var(--ink))',
        'retro-pink': '3px 3px 0px rgb(var(--pink))',
        'retro-cyan': '3px 3px 0px rgb(var(--cyan))',
      },
    },
  },
  plugins: [],
}
