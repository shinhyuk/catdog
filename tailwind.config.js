/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dog: '#c2703d',
        cat: '#6d5fb0',
      },
    },
  },
  plugins: [],
};
