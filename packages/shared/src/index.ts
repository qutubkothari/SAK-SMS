export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'SALESMAN';

export type LeadChannel =
  | 'MANUAL'
  | 'WHATSAPP'
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'INDIAMART'
  | 'OTHER';

export type LeadHeat = 'COLD' | 'WARM' | 'HOT' | 'VERY_HOT' | 'ON_FIRE';

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'QUOTED'
  | 'WON'
  | 'LOST'
  | 'ON_HOLD';

export type SuccessEventType =
  | 'DEMO_BOOKED'
  | 'PAYMENT_RECEIVED'
  | 'ORDER_RECEIVED'
  | 'CONTRACT_SIGNED'
  | 'CUSTOM';
