import { useState, useEffect, useMemo } from 'react'
import {
    TrendingUp,
    ShoppingCart,
    DollarSign,
    BarChart3,
    Calendar,
    LayoutDashboard,
    Filter,
    ArrowUpRight,
    TrendingDown,
    X,
    ChevronDown,
    Zap,
    Lightbulb,
    AlertCircle,
    Sparkles,
    RefreshCw,
    Cpu,
    Key
} from 'lucide-react'
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts'
import { GoogleGenerativeAI } from "@google/generative-ai"

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const KPICard = ({ title, value, icon: Icon, trend, trendValue }) => (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm hover:border-blue-500/50 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
                <Icon className="w-5 h-5 text-blue-400" />
            </div>
            {trend && (
                <div className={`flex items-center text-sm font-medium ${trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {trend === 'up' ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                    {trendValue}
                </div>
            )}
        </div>
        <div>
            <p className="text-slate-400 text-sm font-medium">{title}</p>
            <h3 className="text-2xl font-bold mt-1 text-white">{value}</h3>
        </div>
    </div>
)

const InsightCard = ({ title, value, label, icon: Icon, color = "blue" }) => {
    const colorMap = {
        blue: "bg-blue-500/10 text-blue-400",
        emerald: "bg-emerald-500/10 text-emerald-400",
        amber: "bg-amber-500/10 text-amber-400",
        rose: "bg-rose-500/10 text-rose-400",
        purple: "bg-purple-500/10 text-purple-400"
    };

    return (
        <div className="bg-slate-900/40 border border-slate-800/60 p-4 rounded-xl flex items-center gap-4">
            <div className={`p-2 rounded-lg ${colorMap[color] || colorMap.blue}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{title}</p>
                <p className="text-slate-200 font-bold">{value}</p>
                {label && <p className="text-[10px] text-slate-500">{label}</p>}
            </div>
        </div>
    );
};

const ChartCard = ({ title, children, className = "" }) => (
    <div className={`bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm ${className}`}>
        <h3 className="text-lg font-bold text-white mb-6">{title}</h3>
        <div className="h-[300px] w-full">
            {children}
        </div>
    </div>
)

function App() {
    const [rawData, setRawData] = useState([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        product: 'All Products',
        channel: 'All Channels'
    })

    // AI State
    const [aiApiKey, setAiApiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || '')
    const [aiModel, setAiModel] = useState('gemini-3.1-flash-lite-preview')
    const [aiLoading, setAiLoading] = useState(false)
    const [aiInsights, setAiInsights] = useState(null)
    const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false)

    useEffect(() => {
        const loadData = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/sales')
                const parsedData = await response.json()

                setRawData(parsedData)

                // Set initial date range
                const dates = parsedData.map(d => d.date).sort()
                if (dates.length > 0) {
                    setFilters(prev => ({
                        ...prev,
                        startDate: dates[0],
                        endDate: dates[dates.length - 1]
                    }))
                }
                setLoading(false)
            } catch (error) {
                console.error('Failed to fetch data from API:', error)
                setLoading(false)
            }
        }

        loadData()
    }, [])

    const filteredData = useMemo(() => {
        return rawData.filter(row => {
            const matchProduct = filters.product === 'All Products' || row.product === filters.product
            const matchChannel = filters.channel === 'All Channels' || row.channel === filters.channel
            const matchDate = (!filters.startDate || row.date >= filters.startDate) &&
                (!filters.endDate || row.date <= filters.endDate)
            return matchProduct && matchChannel && matchDate
        })
    }, [rawData, filters])

    const stats = useMemo(() => {
        const totalRevenue = filteredData.reduce((sum, row) => sum + (row.revenue || 0), 0)
        const totalOrders = filteredData.reduce((sum, row) => sum + (row.orders || 0), 0)
        const totalCost = filteredData.reduce((sum, row) => sum + (row.cost || 0), 0)
        const totalProfit = totalRevenue - totalCost
        const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0

        return {
            revenue: totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
            orders: totalOrders.toLocaleString(),
            profit: totalProfit.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
            aov: aov.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
            raw: { totalRevenue, totalOrders, totalProfit, aov }
        }
    }, [filteredData])

    const performanceInsights = useMemo(() => {
        if (filteredData.length === 0) return null;

        // 1. Best Product
        const pMap = filteredData.reduce((acc, r) => {
            acc[r.product] = (acc[r.product] || 0) + (r.revenue || 0)
            return acc
        }, {})
        const bestProduct = Object.entries(pMap).sort((a, b) => b[1] - a[1])[0]

        // 2. Best Channel
        const cMap = filteredData.reduce((acc, r) => {
            acc[r.channel] = (acc[r.channel] || 0) + (r.revenue || 0)
            return acc
        }, {})
        const bestChannel = Object.entries(cMap).sort((a, b) => b[1] - a[1])[0]

        // 3. Highest Revenue Day
        const dMap = filteredData.reduce((acc, r) => {
            acc[r.date] = (acc[r.date] || 0) + (r.revenue || 0)
            return acc
        }, {})
        const bestDay = Object.entries(dMap).sort((a, b) => b[1] - a[1])[0]

        // 4. Highest Conversion Rate Channel
        const convMap = filteredData.reduce((acc, r) => {
            if (!acc[r.channel]) acc[r.channel] = { orders: 0, visitors: 0 }
            acc[r.channel].orders += (r.orders || 0)
            acc[r.channel].visitors += (r.visitors || 0)
            return acc
        }, {})
        const bestConvChannel = Object.entries(convMap)
            .map(([name, data]) => ({ name, rate: data.visitors > 0 ? (data.orders / data.visitors) * 100 : 0 }))
            .sort((a, b) => b.rate - a.rate)[0]

        return {
            bestProduct: { name: bestProduct[0], value: bestProduct[1].toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) },
            bestChannel: { name: bestChannel[0], value: bestChannel[1].toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) },
            bestDay: { name: bestDay[0], value: bestDay[1].toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) },
            bestConv: { name: bestConvChannel.name, value: `${bestConvChannel.rate.toFixed(1)}%` }
        }
    }, [filteredData])

    const chartData = useMemo(() => {
        const trendMap = filteredData.reduce((acc, row) => {
            acc[row.date] = (acc[row.date] || 0) + (row.revenue || 0)
            return acc
        }, {})
        const trend = Object.entries(trendMap)
            .map(([date, revenue]) => ({ date, revenue }))
            .sort((a, b) => a.date.localeCompare(b.date))

        const channelMap = filteredData.reduce((acc, row) => {
            acc[row.channel] = (acc[row.channel] || 0) + (row.revenue || 0)
            return acc
        }, {})
        const byChannel = Object.entries(channelMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)

        const productMap = filteredData.reduce((acc, row) => {
            acc[row.product] = (acc[row.product] || 0) + (row.revenue || 0)
            return acc
        }, {})
        const byProduct = Object.entries(productMap)
            .map(([name, revenue]) => ({ name, revenue }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)

        return { trend, byChannel, byProduct }
    }, [filteredData])

    const generateAIInsights = async () => {
        if (!aiApiKey) {
            setShowApiKeyPrompt(true)
            return
        }

        setAiLoading(true)
        try {
            const genAI = new GoogleGenerativeAI(aiApiKey)
            const model = genAI.getGenerativeModel({ model: aiModel })

            const prompt = `
        Analyze this store's performance data and provide business insights.
        Metrics:
        - Total Revenue: ${stats.revenue}
        - Total Orders: ${stats.orders}
        - Total Profit: ${stats.profit}
        - Average Order Value: ${stats.aov}
        - Best Product: ${performanceInsights.bestProduct.name}
        - Best Channel: ${performanceInsights.bestChannel.name}
        - Highest Conv Rate Channel: ${performanceInsights.bestConv.name} (${performanceInsights.bestConv.value})

        Return the response in JSON format with exactly three arrays: "alerts", "opportunities", and "suggestions".
        Keep each item very short and clear (business language).
      `

            const result = await model.generateContent(prompt)
            const response = await result.response
            const text = response.text()

            // Basic JSON cleaning if needed
            const cleanJson = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1)
            setAiInsights(JSON.parse(cleanJson))
        } catch (error) {
            console.error("AI Insight Generation Error:", error)
            alert("Failed to generate insights. Check your API key and network.")
        } finally {
            setAiLoading(false)
        }
    }

    const products = ['All Products', ...new Set(rawData.map(d => d.product))]
    const channels = ['All Channels', ...new Set(rawData.map(d => d.channel))]

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p className="text-slate-400 font-medium">Analyzing dashboard data...</p>
                </div>
            </div>
        )
    }

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
                    <p className="text-slate-400 text-xs mb-1">{label}</p>
                    <p className="text-white font-bold">
                        {payload[0].value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-500/30">
            {/* Sidebar - Desktop */}
            <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 border-r border-slate-800 hidden lg:flex flex-col p-6 pointer-events-auto">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
                        <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">VibeAnalytics</span>
                </div>

                <nav className="flex-1 space-y-2">
                    <a href="#" className="flex items-center gap-3 px-4 py-3 bg-blue-600/10 text-blue-400 rounded-xl font-medium transition-all group">
                        <LayoutDashboard className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Dashboard
                    </a>
                    <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-slate-100 rounded-xl transition-all font-medium group">
                        <TrendingUp className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Performance
                    </a>
                    <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-slate-100 rounded-xl transition-all font-medium group">
                        <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Orders
                    </a>
                    <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-slate-100 rounded-xl transition-all font-medium group">
                        <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Insights
                    </a>
                </nav>

                <div className="mt-auto border-t border-slate-800 pt-6">
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">System Status</p>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-xs text-slate-300">Live Services Active</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-64 p-4 lg:p-8">
                <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Intelligence Center</h1>
                        <p className="text-slate-400">Advanced store performance analysis and AI-driven growth strategies.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex flex-col items-end mr-2">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Last Sync</p>
                            <p className="text-xs text-slate-400">Just Now</p>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-semibold shadow-lg shadow-blue-500/10">
                            Generate Report
                        </button>
                    </div>
                </header>

                {/* Filters & Simple Insights Section */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-10">
                    {/* Filters Bar */}
                    <div className="xl:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-blue-400" />
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Data Filters</h2>
                            </div>
                            <button
                                onClick={() => setFilters({ startDate: rawData[0]?.date, endDate: rawData[rawData.length - 1]?.date, product: 'All Products', channel: 'All Channels' })}
                                className="text-xs text-slate-500 hover:text-blue-400 transition-colors"
                            >
                                Reset Defaults
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-[11px] text-slate-500 font-bold uppercase ml-1">Period</label>
                                <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 group focus-within:border-blue-500/50 transition-all">
                                    <input
                                        type="date"
                                        value={filters.startDate}
                                        onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
                                        className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer w-full"
                                    />
                                    <span className="text-slate-600 text-[10px]">→</span>
                                    <input
                                        type="date"
                                        value={filters.endDate}
                                        onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
                                        className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer w-full"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] text-slate-500 font-bold uppercase ml-1">Focus Product</label>
                                <select
                                    value={filters.product}
                                    onChange={(e) => setFilters(f => ({ ...f, product: e.target.value }))}
                                    className="w-full bg-slate-800/50 border border-slate-700/50 px-4 py-2.5 rounded-xl text-xs text-slate-200 outline-none cursor-pointer hover:border-blue-500/50 transition-all appearance-none"
                                >
                                    {products.map(p => <option key={p} value={p} className="bg-slate-900 text-slate-200">{p}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] text-slate-500 font-bold uppercase ml-1">Sales Channel</label>
                                <select
                                    value={filters.channel}
                                    onChange={(e) => setFilters(f => ({ ...f, channel: e.target.value }))}
                                    className="w-full bg-slate-800/50 border border-slate-700/50 px-4 py-2.5 rounded-xl text-xs text-slate-200 outline-none cursor-pointer hover:border-blue-500/50 transition-all appearance-none"
                                >
                                    {channels.map(c => <option key={c} value={c} className="bg-slate-900 text-slate-200">{c}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Simple Insights Sidebar */}
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-400" />
                            Pulse Insights
                        </h2>
                        <div className="grid grid-cols-1 gap-3">
                            <InsightCard title="Top Star" value={performanceInsights?.bestProduct.name} label={`Leader in revenue: ${performanceInsights?.bestProduct.value}`} icon={Sparkles} color="purple" />
                            <InsightCard title="Best Channel" value={performanceInsights?.bestChannel.name} label="Driving peak traffic value" icon={TrendingUp} color="emerald" />
                            <InsightCard title="Peak Performance" value={performanceInsights?.bestDay.name} label={`All-time daily high: ${performanceInsights?.bestDay.value}`} icon={Calendar} color="amber" />
                            <InsightCard title="Conversion King" value={performanceInsights?.bestConv.name} label={`${performanceInsights?.bestConv.value} efficacy rate`} icon={Zap} color="rose" />
                        </div>
                    </div>
                </div>

                {/* AI Insight Explorer Section */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl mb-10 overflow-hidden">
                    <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="bg-purple-600/20 p-1.5 rounded-lg border border-purple-500/30">
                                    <Cpu className="w-4 h-4 text-purple-400" />
                                </div>
                                <h2 className="text-lg font-bold text-white">Gemini Strategy Suite</h2>
                            </div>
                            <p className="text-sm text-slate-400">Generate personalized growth suggestions using Google's advanced LLMs.</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl">
                                <Cpu className="w-4 h-4 text-slate-400" />
                                <select
                                    value={aiModel}
                                    onChange={(e) => setAiModel(e.target.value)}
                                    className="bg-transparent text-xs text-slate-200 outline-none font-medium cursor-pointer"
                                >
                                    <option value="gemini-3.1-flash-lite-preview" className="bg-slate-900 text-slate-200">Gemini 3.1 Flash-Lite (Free Tier)</option>
                                    <option value="gemini-1.5-flash" className="bg-slate-900 text-slate-200">Gemini 1.5 Flash (Free Tier)</option>
                                    <option value="gemini-1.5-pro" className="bg-slate-900 text-slate-200">Gemini 1.5 Pro (Free Tier - Limited)</option>
                                </select>
                            </div>

                            <button
                                onClick={generateAIInsights}
                                disabled={aiLoading}
                                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-500/10"
                            >
                                {aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                {aiInsights ? 'Re-generate Insights' : 'Generate AI Strategy'}
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        {!aiInsights && !aiLoading && (
                            <div className="flex flex-col items-center justify-center py-10 opacity-60">
                                <div className="bg-slate-800 p-6 rounded-full mb-4">
                                    <Sparkles className="w-10 h-10 text-purple-400" />
                                </div>
                                <p className="text-slate-400 font-medium">Click generate to receive AI-powered business recommendations.</p>
                                <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                    <Key className="w-3 h-3" />
                                    Requires VITE_GEMINI_API_KEY in .env
                                </div>
                            </div>
                        )}

                        {aiLoading && (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin"></div>
                                    <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-purple-400 animate-pulse" />
                                </div>
                                <p className="text-purple-400 font-bold animate-pulse">Consulting the Oracle...</p>
                            </div>
                        )}

                        {aiInsights && !aiLoading && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Alerts */}
                                <div className="bg-rose-500/5 border border-rose-500/20 p-5 rounded-2xl space-y-4">
                                    <div className="flex items-center gap-2 text-rose-400 mb-2">
                                        <AlertCircle className="w-5 h-5" />
                                        <h3 className="font-bold text-sm uppercase tracking-wider">Risk Alerts</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {aiInsights.alerts.map((item, i) => (
                                            <li key={i} className="flex gap-2 text-sm text-slate-300">
                                                <span className="text-rose-500 select-none">•</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Opportunities */}
                                <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl space-y-4">
                                    <div className="flex items-center gap-2 text-emerald-400 mb-2">
                                        <TrendingUp className="w-5 h-5" />
                                        <h3 className="font-bold text-sm uppercase tracking-wider">Opportunities</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {aiInsights.opportunities.map((item, i) => (
                                            <li key={i} className="flex gap-2 text-sm text-slate-300">
                                                <span className="text-emerald-500 select-none">•</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Suggestions */}
                                <div className="bg-blue-500/5 border border-blue-500/20 p-5 rounded-2xl space-y-4">
                                    <div className="flex items-center gap-2 text-blue-400 mb-2">
                                        <Lightbulb className="w-5 h-5" />
                                        <h3 className="font-bold text-sm uppercase tracking-wider">Tactical Moves</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {aiInsights.suggestions.map((item, i) => (
                                            <li key={i} className="flex gap-2 text-sm text-slate-300">
                                                <span className="text-blue-500 select-none">•</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* API Key Prompt Modal */}
                {showApiKeyPrompt && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl">
                            <div className="bg-purple-600/20 p-3 rounded-2xl w-fit mb-6 border border-purple-500/30">
                                <Key className="w-8 h-8 text-purple-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">API Configuration Required</h2>
                            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                To use the Gemini strategy engine, you'll need a Google AI API Key.
                                <br /><br />
                                <span className="text-slate-300 font-semibold italic text-xs block bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                    Tip: For permanent setup, add your key to a file named <b>.env</b> in the project root as `VITE_GEMINI_API_KEY=...`
                                </span>
                            </p>

                            <div className="space-y-4">
                                <input
                                    type="password"
                                    placeholder="Paste AI API Key here..."
                                    className="w-full bg-slate-950 border border-slate-700 px-5 py-3 rounded-xl text-slate-100 outline-none focus:border-purple-500 transition-all text-sm"
                                    value={aiApiKey}
                                    onChange={(e) => setAiApiKey(e.target.value)}
                                />
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => { setShowApiKeyPrompt(false); if (aiApiKey) generateAIInsights(); }}
                                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all"
                                    >
                                        Continue to Insights
                                    </button>
                                    <button
                                        onClick={() => setShowApiKeyPrompt(false)}
                                        className="px-6 py-3 text-slate-400 hover:text-white font-semibold transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <KPICard title="Total Revenue" value={stats.revenue} icon={DollarSign} trend="up" trendValue="+12.5%" />
                    <KPICard title="Total Orders" value={stats.orders} icon={ShoppingCart} trend="up" trendValue="+8.2%" />
                    <KPICard title="Net Profit" value={stats.profit} icon={BarChart3} trend="down" trendValue="-2.4%" />
                    <KPICard title="Avg. Order Value" value={stats.aov} icon={ArrowUpRight} trend="up" trendValue="+15.3%" />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                    <ChartCard title="Revenue Trend" className="lg:col-span-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData.trend}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `$${val / 1000}k`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRev)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Revenue by Channel">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData.byChannel}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.byChannel.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                    itemStyle={{ color: '#cbd5e1' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Top Products by Revenue">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.byProduct} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    width={100}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                {/* Sales Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden pb-4">
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                        <h2 className="text-xl font-bold text-white">Full Transaction Audit</h2>
                        <span className="text-sm text-slate-400 font-medium px-4 py-1 bg-slate-800 rounded-full border border-slate-700">
                            {filteredData.length} entries
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-950/20">
                                    <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Product</th>
                                    <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Channel</th>
                                    <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Orders</th>
                                    <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Revenue</th>
                                    <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Profit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {filteredData.map((row, idx) => {
                                    const profit = (row.revenue || 0) - (row.cost || 0)
                                    return (
                                        <tr key={idx} className="hover:bg-slate-800/30 transition-all cursor-default group">
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-sm">{row.date}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-slate-200 font-semibold group-hover:text-blue-400 transition-colors">{row.product}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-wider">
                                                    {row.channel}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-300 font-medium">{row.orders}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-emerald-400 font-bold">
                                                ${(row.revenue || 0).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-white font-semibold">
                                                ${profit.toLocaleString()}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default App
