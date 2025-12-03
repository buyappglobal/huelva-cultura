import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Lato, Poppins } from "next/font/google";
import "../styles/globals.css";

const lato = Lato({
    subsets: ["latin"],
    weight: ["400", "700"],
    variable: "--font-lato",
});

const poppins = Poppins({
    subsets: ["latin"],
    weight: ["700", "900"],
    variable: "--font-poppins",
});

const APP_NAME = "Huelva Cultural";
const APP_DEFAULT_TITLE = "Agenda Cultural Huelva - La Sierra de Huelva en Navidad";
const APP_TITLE_TEMPLATE = "%s - Huelva Late";
const APP_DESCRIPTION = "Tu guía completa de eventos navideños en la Sierra de Aracena y Picos de Aroche. Belenes vivientes, cabalgatas, mercados y más.";
const APP_URL = "https://huelvalate.es"; // Reemplazar con tu URL de producción
const OG_IMAGE_URL = "https://wsrv.nl/?url=https://solonet.es/wp-content/uploads/2025/11/Copia-de-HUELVALATE.ES_.png&w=500&h=500&fit=contain&bg=white&output=jpg&v=5";

export const metadata: Metadata = {
    applicationName: APP_NAME,
    title: {
        default: APP_DEFAULT_TITLE,
        template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: APP_NAME,
    },
    openGraph: {
        type: "website",
        siteName: "Huelva Late",
        title: {
            default: APP_DEFAULT_TITLE,
            template: APP_TITLE_TEMPLATE,
        },
        description: APP_DESCRIPTION,
        url: APP_URL,
        images: [
            {
                url: OG_IMAGE_URL,
                width: 500,
                height: 500,
                alt: "Logotipo Huelva Late Agenda Cultural",
                type: "image/jpeg",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: {
            default: APP_DEFAULT_TITLE,
            template: APP_TITLE_TEMPLATE,
        },
        description: APP_DESCRIPTION,
        images: [OG_IMAGE_URL],
    },
};

export const viewport: Viewport = {
    themeColor: "#1e3a8a",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es" className={`${lato.variable} ${poppins.variable}`} suppressHydrationWarning>
            <head>
                {/* El script de consentimiento y el de tema oscuro se pueden mover a un componente de cliente si es necesario */}
            </head>
            <body className="bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-200 transition-colors duration-300">
                <Script id="gtm-script" strategy="afterInteractive">
                    {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-M5JJXZCF');
          `}
                </Script>
                <noscript>
                    <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M5JJXZCF" height="0" width="0" style={{ display: 'none', visibility: 'hidden' }}></iframe>
                </noscript>
                {children}
            </body>
        </html>
    );
}