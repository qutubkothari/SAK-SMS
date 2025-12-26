import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Phone, Mail, MessageSquare,
  TrendingUp, Flame, Clock, CheckCircle2, 
  Send, PhoneCall, MessageCircle
} from 'lucide-react'

interface Lead {
  id: string
  fullName?: string
  phone?: string
  email?: string
  status: string
  heat: string
  channel: string
  score?: number
  qualificationLevel?: string
  createdAt: string
  messages?: Array<{
    id: string
    direction: string
    body: string
    channel: string
    createdAt: string
  }>
  events?: Array<{
    id: string
    type: string
    payload: any
    createdAt: string
  }>
}

interface LeadDetail2025Props {
  lead: Lead
  onRefresh: () => void
  onSendMessage?: (content: string) => void
  onUpdateStatus?: (status: string) => void
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  'NEW': { bg: 'bg-lemon-100', text: 'text-lemon-900', label: '🆕 New' },
  'CONTACTED': { bg: 'bg-blue-100', text: 'text-blue-900', label: '📞 Contacted' },
  'QUALIFIED': { bg: 'bg-mint-100', text: 'text-mint-900', label: '✅ Qualified' },
  'QUOTED': { bg: 'bg-purple-100', text: 'text-purple-900', label: '💰 Quoted' },
  'WON': { bg: 'bg-green-100', text: 'text-green-900', label: '🎉 Won' },
  'LOST': { bg: 'bg-red-100', text: 'text-red-900', label: '❌ Lost' },
  'ON_HOLD': { bg: 'bg-gray-100', text: 'text-gray-900', label: '⏸️ On Hold' },
}

const heatConfig: Record<string, { gradient: string; label: string }> = {
  'ON_FIRE': { gradient: 'from-red-500 to-orange-500', label: '🔥 On Fire' },
  'VERY_HOT': { gradient: 'from-orange-500 to-amber-500', label: '🔥 Very Hot' },
  'HOT': { gradient: 'from-amber-500 to-yellow-500', label: '🌡️ Hot' },
  'WARM': { gradient: 'from-yellow-500 to-lime-500', label: '☀️ Warm' },
  'COLD': { gradient: 'from-slate-400 to-slate-500', label: '❄️ Cold' },
}

export function LeadDetail2025({ lead, onRefresh, onSendMessage, onUpdateStatus: _onUpdateStatus }: LeadDetail2025Props) {
  const navigate = useNavigate()
  const [messageText, setMessageText] = useState('')
  const [showMessageBox, setShowMessageBox] = useState(false)
  
  const status = statusConfig[lead.status] || statusConfig.NEW
  const heat = heatConfig[lead.heat] || heatConfig.COLD

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  const handleSendMessage = () => {
    if (messageText.trim() && onSendMessage) {
      onSendMessage(messageText)
      setMessageText('')
      setShowMessageBox(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-mint-50/30 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/leads')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Leads</span>
          </button>
          
          <button onClick={onRefresh} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all text-sm font-medium">
            Refresh
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-soft border border-white/20 overflow-hidden">
          
          {/* Top Section - Lead Info */}
          <div className="p-8 bg-gradient-to-br from-white to-slate-50/50">
            <div className="flex items-start gap-6">
              
              {/* Heat Avatar */}
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${heat.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
                <Flame className="w-10 h-10 text-white" />
              </div>

              {/* Lead Details */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                      {lead.fullName || lead.phone || 'Unknown Lead'}
                    </h1>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                      <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-700">
                        {heat.label}
                      </span>
                      {lead.qualificationLevel && (
                        <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-mint-100 text-mint-700">
                          {lead.qualificationLevel}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Score */}
                  {lead.score !== undefined && (
                    <div className="text-center bg-gradient-to-br from-mint-500 to-mint-600 rounded-2xl p-4 shadow-mint-md">
                      <div className="text-3xl font-bold text-white flex items-center gap-2">
                        {lead.score}
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <div className="text-xs text-mint-100 mt-1">Lead Score</div>
                    </div>
                  )}
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {lead.phone && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200">
                      <Phone className="w-5 h-5 text-slate-400" />
                      <div>
                        <div className="text-xs text-slate-500">Phone</div>
                        <div className="font-medium text-slate-900">{lead.phone}</div>
                      </div>
                    </div>
                  )}
                  
                  {lead.email && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200">
                      <Mail className="w-5 h-5 text-slate-400" />
                      <div>
                        <div className="text-xs text-slate-500">Email</div>
                        <div className="font-medium text-slate-900">{lead.email}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200">
                    <MessageSquare className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-xs text-slate-500">Channel</div>
                      <div className="font-medium text-slate-900">{lead.channel}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              {lead.phone && (
                <>
                  <button
                    onClick={() => window.location.href = `tel:${lead.phone}`}
                    className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <PhoneCall className="w-5 h-5" />
                    Call Now
                  </button>
                  
                  {lead.channel === 'WHATSAPP' && (
                    <button
                      onClick={() => window.open(`https://wa.me/${lead.phone?.replace(/\+/g, '')}`, '_blank')}
                      className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white font-semibold shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-5 h-5" />
                      WhatsApp
                    </button>
                  )}
                </>
              )}
              
              <button
                onClick={() => setShowMessageBox(!showMessageBox)}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-br from-mint-500 to-mint-600 text-white font-semibold shadow-mint-md hover:shadow-mint-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Send Message
              </button>
            </div>

            {/* Quick Message Box */}
            {showMessageBox && (
              <div className="mt-4 p-4 rounded-xl bg-white border-2 border-mint-200">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full p-3 rounded-lg border border-slate-200 focus:border-mint-500 focus:ring-2 focus:ring-mint-500/20 outline-none resize-none"
                  rows={3}
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleSendMessage}
                    className="px-4 py-2 rounded-lg bg-mint-500 text-white font-medium hover:bg-mint-600 transition-colors"
                  >
                    Send
                  </button>
                  <button
                    onClick={() => {
                      setShowMessageBox(false)
                      setMessageText('')
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Messages Section */}
          <div className="p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-mint-500" />
              Conversation
            </h2>
            
            {lead.messages && lead.messages.length > 0 ? (
              <div className="space-y-3">
                {lead.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.direction === 'OUT' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                        message.direction === 'OUT'
                          ? 'bg-gradient-to-br from-mint-500 to-mint-600 text-white'
                          : 'bg-slate-100 text-slate-900'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">{message.body}</div>
                      <div
                        className={`text-xs mt-1 ${
                          message.direction === 'OUT' ? 'text-mint-100' : 'text-slate-500'
                        }`}
                      >
                        {formatDate(message.createdAt)} • {message.channel}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No messages yet. Start the conversation!
              </div>
            )}
          </div>

          {/* Timeline Section */}
          {lead.events && lead.events.length > 0 && (
            <div className="p-8 bg-slate-50/50 border-t border-slate-100">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-6 h-6 text-slate-500" />
                Activity Timeline
              </h2>
              
              <div className="space-y-3">
                {lead.events.map((event, index) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-white border-2 border-mint-500 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-mint-500" />
                      </div>
                      {index < lead.events!.length - 1 && (
                        <div className="w-0.5 h-full bg-slate-200 my-1" />
                      )}
                    </div>
                    
                    <div className="flex-1 pb-4">
                      <div className="bg-white rounded-xl p-4 border border-slate-200">
                        <div className="font-semibold text-slate-900 mb-1">{event.type}</div>
                        <div className="text-sm text-slate-600">{formatDate(event.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
