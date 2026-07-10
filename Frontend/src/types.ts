export type DeliveryStatus = 'Picked Up' | 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Failed';

export interface TimelineEvent {
  status: DeliveryStatus;
  timestamp: string;
  notes: string;
  actor: string; // e.g. "Agent: Raj Kumar", "Admin: Override", "System: Auto-assigned"
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  pickupAddress: string;
  dropAddress: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  orderType: 'B2B' | 'B2C';
  paymentType: 'Prepaid' | 'COD';
  status: DeliveryStatus;
  charge: number;
  assignedAgentId: string; // references agent id
  zone: string; // zone name
  timeline: TimelineEvent[];
  createdAt: string;
  scheduledDate?: string;
}

export interface Zone {
  id: string;
  name: string;
  pincodes: string[];
}

export interface RateCard {
  intraZone: {
    B2B: number;
    B2C: number;
  };
  interZone: {
    B2B: number;
    B2C: number;
  };
  codSurcharge: {
    B2B: number;
    B2C: number;
  };
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  zone: string;
  status: 'available' | 'busy';
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'Customer' | 'Delivery Agent' | 'Admin';
}
