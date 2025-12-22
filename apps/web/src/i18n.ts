import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    translation: {
      appTitle: 'SAK AI Enquiry Handler',
      language: 'Language',
      tenantId: 'Tenant ID',
      userId: 'User ID',
      role: 'Role',
      save: 'Save',
      leads: 'Leads',
      triage: 'Triage',
      refresh: 'Refresh',
      lead: 'Lead',
      status: 'Status',
      heat: 'Heat',
      channel: 'Channel',
      assignedTo: 'Assigned To',
      unassigned: 'Unassigned',
      updateStatus: 'Update Status',
      assign: 'Assign',
      openTriage: 'Open Triage',
      reason: 'Reason'
    }
  },
  ar: {
    translation: {
      appTitle: 'نظام إدارة الاستفسارات',
      language: 'اللغة',
      tenantId: 'معرّف الشركة',
      userId: 'معرّف المستخدم',
      role: 'الدور',
      save: 'حفظ',
      leads: 'العملاء المحتملون',
      triage: 'قائمة الفرز',
      refresh: 'تحديث',
      lead: 'عميل محتمل',
      status: 'الحالة',
      heat: 'الاهتمام',
      channel: 'القناة',
      assignedTo: 'مُعيَّن إلى',
      unassigned: 'غير مُعيَّن',
      updateStatus: 'تحديث الحالة',
      assign: 'تعيين',
      openTriage: 'فرز مفتوح',
      reason: 'السبب'
    }
  }
} as const

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
})

export default i18n
