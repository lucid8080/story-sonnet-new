/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                vividCoral: '#FF6B6B',
                skyBlue: '#4ECDC4',
                sunnyYellow: '#FFE66D',
                deepViolet: '#292F36',
                ghost: '#F0EFF4',
            },
            fontFamily: {
                sans: ['Outfit', 'sans-serif'],
                drama: ['Playfair Display', 'serif'],
                mono: ['Fira Code', 'monospace'],
            },
            borderRadius: {
                '3xl': '2rem',
                '4xl': '3rem',
            },
        },
    },
    plugins: [],
}
