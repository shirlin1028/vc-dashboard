import './globals.css'

export const metadata = {
    title: 'Sales Dashboard',
    description: 'AI-powered Sales Dashboard with Supabase support',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}
