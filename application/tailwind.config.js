/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.{html,ejs}"],
  theme: {
    extend: {
      fontFamily: {
      AG: ['Aktiv Grotesk', 'monospace'],
      SS3: ['Source Sans 3', 'sans-serif'],
      },
      colors: {
        sfpurple: '#231161',
        sfpurplemedium: '#463077',
        sfyellow: '#C99700',
        sfyellowlight: '#E9D597',
      },
      screens: {
        sm: '640px',
        md: '960px',
        lg: '1280px',
      },
    },
  },
  plugins: [],
}