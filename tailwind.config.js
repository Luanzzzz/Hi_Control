/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./*.{js,ts,jsx,tsx}",
    ],

    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                display: ['Space Grotesk', 'sans-serif'],
                body: ['DM Sans', 'sans-serif'],
            },
            colors: {
                primary: {
                    50: '#f5f3ff',
                    100: '#ede9fe',
                    200: '#ddd6fe',
                    300: '#c4b5fd',
                    400: '#a78bfa',
                    500: '#8b5cf6',
                    600: '#7c3aed',
                    700: '#6d28d9',
                    800: '#5b21b6',
                    900: '#4c1d95',
                },
                hc: {
                    bg: '#0D0B1A',
                    surface: '#161328',
                    card: '#1E1A35',
                    border: '#2D2850',
                    purple: '#7C3AED',
                    'purple-light': '#A78BFA',
                    'purple-dim': '#2D1B6B',
                    green: '#10B981',
                    red: '#EF4444',
                    amber: '#F59E0B',
                    text: '#F1F0FF',
                    muted: '#8B85B0',
                    accent: '#C4B5FD',
                },
            }
        }
    },
    plugins: [],
}
