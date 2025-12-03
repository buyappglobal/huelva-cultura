import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}", // Only scan the apps directory
        "./components/**/*.{js,ts,jsx,tsx,mdx}", // And the components directory
    ],
    darkMode: "class",
    theme: {
        extend: {},
    },
    plugins: [],
};
export default config;