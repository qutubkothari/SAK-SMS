import { useState, useMemo, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Flame, Phone, Mail, MessageSquare, UserPlus, MoreVertical, TrendingUp, Download, Eye, Trash2, PhoneCall } from 'lucide-react'

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
  assignedToSalesmanId?: string
  createdAt: string
  lastActivityAt?: string
}

interface Leads2025Props {
  leads: Lead[]
  onRefresh: () => void
  onExport?: () => void
  onDelete?: (leadId: string) => Promise<void>
  onBulkDelete?: (leadIds: string[]) => Promise<void>
  onDeleteAllEmailLeads?: () => Promise<void>
}

const heatConfig: Record<string, { gradient: string; label: string }> = {
  'ON_FIRE': { gradient: 'from-red-500 to-orange-500', label: '🔥 On Fire' },
  'VERY_HOT': { gradient: 'from-orange-500 to-amber-500', label: '🔥 Very Hot' },
  'HOT': { gradient: 'from-amber-500 to-yellow-500', label: '🌡️ Hot' },
  'WARM': { gradient: 'from-yellow-500 to-lime-500', label: '☀️ Warm' },
  'COLD': { gradient: 'from-slate-400 to-slate-500', label: '❄️ Cold' },
}

const statusConfig: Record<string, { bg: string; text: string }> = {
  'NEW': { bg: 'bg-lemon-100', text: 'text-lemon-900' },
  'CONTACTED': { bg: 'bg-blue-100', text: 'text-blue-900' },
  'QUALIFIED': { bg: 'bg-mint-100', text: 'text-mint-900' },
  'QUOTED': { bg: 'bg-purple-100', text: 'text-purple-900' },
  'WON': { bg: 'bg-green-100', text: 'text-green-900' },
  'LOST': { bg: 'bg-red-100', text: 'text-red-900' },
  'ON_HOLD': { bg: 'bg-gray-100', text: 'text-gray-900' },
}

const channelIcons: Record<string, any> = {
  'WHATSAPP': MessageSquare,
  'FACEBOOK': MessageSquare,
  'INSTAGRAM': MessageSquare,
  'PHONE': Phone,
  'EMAIL': Mail,
  'INDIAMART': MessageSquare,
  'JUSTDIAL': MessageSquare,
  'GEM': MessageSquare,
  'PERSONAL_VISIT': PhoneCall,
  'MANUAL': Phone,
  'OTHER': MessageSquare,
}

export function Leads2025({ leads, onRefresh, onExport, onDelete, onBulkDelete, onDeleteAllEmailLeads }: Leads2025Props) {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [heatFilter, setHeatFilter] = useState<string>('ALL')
  const [emailsOnly, setEmailsOnly] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch = !searchTerm || 
        (lead.fullName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.phone?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        lead.id.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter
      const matchesHeat = heatFilter === 'ALL' || lead.heat === heatFilter
      const matchesChannel = !emailsOnly || lead.channel === 'EMAIL'

      return matchesSearch && matchesStatus && matchesHeat && matchesChannel
    })
  }, [leads, searchTerm, statusFilter, heatFilter, emailsOnly])

  const selectedCount = selectedLeadIds.size
  const allFilteredSelected = filteredLeads.length > 0 && selectedLeadIds.size === filteredLeads.length

  const toggleSelection = (leadId: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev)
      if (next.has(leadId)) next.delete(leadId)
      else next.add(leadId)
      return next
    })
  }

  const toggleSelectAllFiltered = () => {
    setSelectedLeadIds((prev) => {
      if (filteredLeads.length === 0) return prev
      if (prev.size === filteredLeads.length) return new Set()
      return new Set(filteredLeads.map((l) => l.id))
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Leads</h1>
          <p className="text-slate-600 mt-1">
            {filteredLeads.length} of {leads.length} leads
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onExport && (
            <button 
              onClick={onExport}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all flex items-center space-x-2 font-medium text-slate-700"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          )}
          <button 
            onClick={onRefresh}
            className="px-6 py-2.5 bg-gradient-to-br from-mint-500 to-mint-600 text-white rounded-xl font-semibold shadow-mint-md hover:shadow-mint-lg hover:scale-105 active:scale-95 transition-all flex items-center space-x-2"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-soft">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, phone, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-mint-500 focus:ring-2 focus:ring-mint-500/20 outline-none transition-all"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-mint-500 focus:ring-2 focus:ring-mint-500/20 outline-none transition-all font-medium text-slate-700"
          >
            <option value="ALL">All Status</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="QUOTED">Quoted</option>
            <option value="WON">Won</option>
            <option value="LOST">Lost</option>
            <option value="ON_HOLD">On Hold</option>
          </select>

          {/* Heat Filter */}
          <select
            value={heatFilter}
            onChange={(e) => setHeatFilter(e.target.value)}
            className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-mint-500 focus:ring-2 focus:ring-mint-500/20 outline-none transition-all font-medium text-slate-700"
          >
            <option value="ALL">All Heat</option>
            <option value="ON_FIRE">🔥 On Fire</option>
            <option value="VERY_HOT">🔥 Very Hot</option>
            <option value="HOT">🌡️ Hot</option>
            <option value="WARM">☀️ Warm</option>
            <option value="COLD">❄️ Cold</option>
          </select>

          <label className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2 font-medium text-slate-700 select-none">
            <input
              type="checkbox"
              checked={emailsOnly}
              onChange={(e) => setEmailsOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-mint-600 focus:ring-mint-500/30"
            />
            <span>Emails only</span>
          </label>

          {/* Clear Filters */}
          {(searchTerm || statusFilter !== 'ALL' || heatFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('ALL')
                setHeatFilter('ALL')
                setEmailsOnly(false)
              }}
              className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 transition-all font-medium text-slate-700"
            >
              Clear
            </button>
          )}
        </div>

        {(onDelete || onExport) && (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={() => toggleSelectAllFiltered()}
                className="h-4 w-4 rounded border-slate-300 text-mint-600 focus:ring-mint-500/30"
              />
              <span>Select all</span>
              {selectedCount > 0 && <span className="text-slate-500">({selectedCount} selected)</span>}
            </label>

            <div className="flex items-center gap-2">
              {selectedCount > 0 && onBulkDelete && (
                <button
                  disabled={bulkDeleting}
                  onClick={async () => {
                    if (!confirm(`Delete ${selectedCount} selected lead(s)?\n\nThis will permanently delete all messages, notes, and history.`)) {
                      return
                    }
                    setBulkDeleting(true)
                    try {
                      await onBulkDelete(Array.from(selectedLeadIds))
                      setSelectedLeadIds(new Set())
                      onRefresh()
                    } catch (err: any) {
                      alert('Failed to delete selected: ' + (err.message || 'Unknown error'))
                    } finally {
                      setBulkDeleting(false)
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 transition-all font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {bulkDeleting ? 'Deleting...' : 'Delete selected'}
                </button>
              )}

              {onDeleteAllEmailLeads && (
                <button
                  onClick={async () => {
                    if (!confirm('Delete ALL email leads?\n\nThis will permanently delete all EMAIL leads and their data.')) return
                    try {
                      await onDeleteAllEmailLeads()
                      setSelectedLeadIds(new Set())
                      onRefresh()
                    } catch (err: any) {
                      alert('Failed to delete all email leads: ' + (err.message || 'Unknown error'))
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 transition-all font-medium flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete all emails
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredLeads.map((lead, index) => {
          const heat = heatConfig[lead.heat] || heatConfig.COLD
          const status = statusConfig[lead.status] || statusConfig.NEW
          const ChannelIcon = channelIcons[lead.channel] || MessageSquare

          return (
            <Link
              key={lead.id}
              to={`/leads/${lead.id}`}
              className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-white/20 hover:border-mint-200 hover:shadow-soft-lg transition-all"
              style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
            >
              <div className="flex items-center gap-4">
                {/* Select */}
                <div className="flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedLeadIds.has(lead.id)}
                    onChange={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toggleSelection(lead.id)
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-mint-600 focus:ring-mint-500/30"
                  />
                </div>

                {/* Heat Indicator */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${heat.gradient} flex items-center justify-center flex-shrink-0 shadow-md`}>
                  <Flame className="w-7 h-7 text-white" />
                </div>

                {/* Lead Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 truncate text-lg">
                      {lead.fullName || lead.phone || lead.id.slice(0, 8)}
                    </h3>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${status.bg} ${status.text}`}>
                      {lead.status}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                    {lead.phone && (
                      <div className="flex items-center gap-1.5">
                        <ChannelIcon className="w-4 h-4" />
                        <span>{lead.phone}</span>
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4" />
                        <span className="truncate max-w-[200px]">{lead.email}</span>
                      </div>
                    )}
                    {lead.channel && (
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">
                        {lead.channel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Score & Actions */}
                <div className="flex items-center gap-4 ml-auto">
                  {lead.score !== undefined && lead.score !== null && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-mint-600 flex items-center gap-1">
                        {lead.score}
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div className="text-xs text-slate-500">Score</div>
                    </div>
                  )}
                  
                  {lead.assignedToSalesmanId && (
                    <div className="text-sm text-slate-600 max-w-[100px] truncate">
                      <div className="text-xs text-slate-500">Assigned</div>
                      <div className="font-medium">{lead.assignedToSalesmanId.slice(0, 8)}</div>
                    </div>
                  )}

                  <div className="relative" ref={openMenuId === lead.id ? menuRef : null}>
                    <button 
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setOpenMenuId(openMenuId === lead.id ? null : lead.id)
                      }}
                      className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-mint-100 flex items-center justify-center transition-all"
                    >
                      <MoreVertical className="w-5 h-5 text-slate-600" />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {openMenuId === lead.id && (
                      <div 
                        className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-[100]"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            navigate(`/leads/${lead.id}`)
                            setOpenMenuId(null)
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-sm text-slate-700"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </button>
                        
                        {lead.phone && (
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              window.location.href = `tel:${lead.phone}`
                              setOpenMenuId(null)
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-sm text-slate-700"
                          >
                            <PhoneCall className="w-4 h-4" />
                            Call {lead.phone}
                          </button>
                        )}
                        
                        {lead.channel === 'WHATSAPP' && lead.phone && (
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              const phoneNumber = lead.phone?.replace(/\+/g, '') || ''
                              window.open(`https://wa.me/${phoneNumber}`, '_blank')
                              setOpenMenuId(null)
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-sm text-slate-700"
                          >
                            <MessageSquare className="w-4 h-4" />
                            WhatsApp
                          </button>
                        )}
                        
                        {lead.email && (
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              window.location.href = `mailto:${lead.email}`
                              setOpenMenuId(null)
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-sm text-slate-700"
                          >
                            <Mail className="w-4 h-4" />
                            Send Email
                          </button>
                        )}
                        
                        <div className="h-px bg-slate-200 my-1" />
                        
                        <button
                          onClick={async (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (confirm(`Delete lead: ${lead.fullName || lead.phone || lead.email}?\n\nThis will permanently delete all messages, notes, and history for this lead.`)) {
                              if (onDelete) {
                                setDeletingId(lead.id)
                                try {
                                  await onDelete(lead.id)
                                  onRefresh()
                                } catch (err: any) {
                                  alert('Failed to delete: ' + (err.message || 'Unknown error'))
                                } finally {
                                  setDeletingId(null)
                                }
                              }
                            }
                            setOpenMenuId(null)
                          }}
                          disabled={deletingId === lead.id}
                          className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-sm text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          {deletingId === lead.id ? 'Deleting...' : 'Delete Lead'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}

        {/* Empty State */}
        {filteredLeads.length === 0 && (
          <div className="text-center py-16 bg-white/50 backdrop-blur-md rounded-3xl border border-white/20">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <UserPlus className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              {leads.length === 0 ? 'No leads yet' : 'No matching leads'}
            </h3>
            <p className="text-slate-600">
              {leads.length === 0 
                ? 'Get started by adding your first lead' 
                : 'Try adjusting your search or filters'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
