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
                    bg: 'var(--hc-bg)',
                    surface: 'var(--hc-surface)',
                    card: 'var(--hc-card)',
                    border: 'var(--hc-border)',
                    purple: 'var(--hc-purple)',
                    'purple-light': 'var(--hc-purple-light)',
                    'purple-dim': 'var(--hc-purple-dim)',
                    green: 'var(--hc-green)',
                    red: 'var(--hc-red)',
                    amber: 'var(--hc-amber)',
                    text: 'var(--hc-text)',
                    muted: 'var(--hc-muted)',
                    accent: 'var(--hc-accent)',
                    'surface-input': 'var(--hc-surface-input)',
                    hover: 'var(--hc-hover)',
                    success: 'var(--hc-success)',
                    info: 'var(--hc-info)',
                },
            }
        }
    },
    plugins: [],
}
