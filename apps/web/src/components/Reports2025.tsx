import { useState, useEffect } from 'react'
import { Calendar, TrendingUp, Users, Target, Award, Download, Filter } from 'lucide-react'

type ReportData = {
  totalLeads: number
  newLeads: number
  convertedLeads: number
  conversionRate: number
  averageScore: number
  topSalesmen: Array<{ name: string; conversions: number; rate: number }>
  leadsByChannel: Array<{ channel: string; count: number }>
  dailyTrend: Array<{ date: string; leads: number; conversions: number }>
}

type Reports2025Props = {
  data: ReportData
  startDate: string
  endDate: string
  onDateChange: (start: string, end: string) => void
  onExport: () => Promise<void>
  onRefresh: () => void
}

const channelColors: Record<string, string> = {
  WHATSAPP: 'from-green-400 to-green-500',
  FACEBOOK: 'from-blue-400 to-blue-500',
  INSTAGRAM: 'from-pink-400 to-pink-500',
  PHONE: 'from-purple-400 to-purple-500',
  EMAIL: 'from-orange-400 to-orange-500',
  WEB: 'from-mint-400 to-mint-500',
}

export function Reports2025({ data, startDate, endDate, onDateChange, onExport, onRefresh }: Reports2025Props) {
  const [localStart, setLocalStart] = useState(startDate)
  const [localEnd, setLocalEnd] = useState(endDate)

  useEffect(() => {
    setLocalStart(startDate)
    setLocalEnd(endDate)
  }, [startDate, endDate])

  const handleApplyDates = () => {
    onDateChange(localStart, localEnd)
  }

  const maxChannelCount = Math.max(...data.leadsByChannel.map(c => c.count), 1)
  const maxDailyLeads = Math.max(...data.dailyTrend.map(d => d.leads), 1)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-mint-600 to-mint-500 bg-clip-text text-transparent">
            Reports & Analytics
          </h1>
          <p className="text-slate-600 mt-1">Track performance and conversion metrics</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onExport}
            className="px-6 py-3 bg-gradient-to-r from-lemon-500 to-lemon-600 text-slate-900 rounded-xl hover:shadow-lemon-lg transform hover:scale-105 transition-all duration-200 font-medium flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export
          </button>
          <button
            onClick={onRefresh}
            className="px-6 py-3 bg-gradient-to-r from-mint-500 to-mint-600 text-white rounded-xl hover:shadow-mint-lg transform hover:scale-105 transition-all duration-200 font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-soft border border-white/20 p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-lemon-600" />
            <span className="text-sm font-medium text-slate-700">Date Range:</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={localStart}
                onChange={(e) => setLocalStart(e.target.value)}
                className="px-4 py-2 bg-white/80 border border-lemon-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lemon-500 focus:border-transparent transition-all"
              />
            </div>

            <span className="text-slate-400">to</span>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={localEnd}
                onChange={(e) => setLocalEnd(e.target.value)}
                className="px-4 py-2 bg-white/80 border border-lemon-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lemon-500 focus:border-transparent transition-all"
              />
            </div>

            <button
              onClick={handleApplyDates}
              className="px-6 py-2 bg-gradient-to-r from-lemon-500 to-lemon-600 text-slate-900 rounded-xl hover:shadow-lemon-md transition-all duration-200 font-medium text-sm"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-soft border border-white/20 p-6 hover:shadow-soft-lg transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-mint-400 to-mint-500 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-slate-600">Total Leads</div>
              <div className="text-2xl font-bold text-slate-900">{data.totalLeads}</div>
            </div>
          </div>
          <div className="text-xs text-mint-600 font-medium">
            +{data.newLeads} new this period
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-soft border border-white/20 p-6 hover:shadow-soft-lg transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-slate-600">Conversions</div>
              <div className="text-2xl font-bold text-slate-900">{data.convertedLeads}</div>
            </div>
          </div>
          <div className="text-xs text-green-600 font-medium">
            {data.conversionRate.toFixed(1)}% conversion rate
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-soft border border-white/20 p-6 hover:shadow-soft-lg transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-lemon-400 to-lemon-500 flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-slate-600">Avg Score</div>
              <div className="text-2xl font-bold text-slate-900">{data.averageScore.toFixed(1)}</div>
            </div>
          </div>
          <div className="text-xs text-lemon-600 font-medium">
            Lead quality metric
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-soft border border-white/20 p-6 hover:shadow-soft-lg transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-slate-600">Rate</div>
              <div className="text-2xl font-bold text-slate-900">{data.conversionRate.toFixed(0)}%</div>
            </div>
          </div>
          <div className="text-xs text-purple-600 font-medium">
            Success metric
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend Chart */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-soft border border-white/20 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-mint-600" />
            Daily Trend
          </h3>
          <div className="space-y-3">
            {data.dailyTrend.slice(0, 7).map((day, idx) => {
              const percentage = (day.leads / maxDailyLeads) * 100
              const conversionRate = day.leads > 0 ? (day.conversions / day.leads) * 100 : 0

              return (
                <div key={idx} className="animate-fade-in" style={{ animationDelay: `${idx * 30}ms` }}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600 font-medium">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-900 font-semibold">{day.leads} leads</span>
                      <span className="text-green-600 text-xs font-medium">{day.conversions} won</span>
                    </div>
                  </div>
                  <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-mint-400 to-mint-500 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500"
                      style={{ width: `${(day.conversions / maxDailyLeads) * 100}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-semibold text-white drop-shadow-lg">
                        {conversionRate > 0 ? `${conversionRate.toFixed(0)}% rate` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Leads by Channel */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-soft border border-white/20 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-lemon-600" />
            Leads by Channel
          </h3>
          <div className="space-y-4">
            {data.leadsByChannel.map((channel, idx) => {
              const percentage = (channel.count / maxChannelCount) * 100
              const gradient = channelColors[channel.channel] || 'from-slate-400 to-slate-500'

              return (
                <div key={idx} className="animate-fade-in" style={{ animationDelay: `${idx * 40}ms` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">{channel.channel}</span>
                    <span className="text-sm font-bold text-slate-900">{channel.count}</span>
                  </div>
                  <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${gradient} transition-all duration-500 flex items-center justify-end pr-3`}
                      style={{ width: `${percentage}%` }}
                    >
                      {percentage > 20 && (
                        <span className="text-xs font-semibold text-white">
                          {((channel.count / data.totalLeads) * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-soft border border-white/20 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-mint-600" />
          Top Performers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.topSalesmen.map((salesman, idx) => (
            <div
              key={idx}
              className="bg-gradient-to-br from-mint-50 to-white border border-mint-200 rounded-xl p-4 hover:shadow-mint-md transition-all animate-fade-in"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-mint-400 to-mint-500 flex items-center justify-center text-white font-bold text-lg">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{salesman.name}</div>
                  <div className="text-xs text-slate-600">{salesman.conversions} conversions</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Conversion Rate</span>
                <span className="text-sm font-bold text-mint-600">{salesman.rate.toFixed(1)}%</span>
              </div>
              <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-mint-400 to-mint-500 transition-all duration-500"
                  style={{ width: `${Math.min(salesman.rate, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
