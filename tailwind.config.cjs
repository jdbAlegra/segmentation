/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(220, 15%, 9%)",
        foreground: "hsl(0, 0%, 96%)",
        card: "hsl(220, 12%, 14%)",
        border: "hsl(220, 12%, 22%)",
        primary: "210 100% 60%",
        "muted-foreground": "hsl(220, 10%, 65%)",
      },
    },
  },
  plugins: [],
};
