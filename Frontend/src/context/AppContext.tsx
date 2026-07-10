import React, { createContext, useContext, useState, useEffect } from 'react';
import { Order, Zone, RateCard, Agent, User, DeliveryStatus, TimelineEvent } from '../types';

interface AppContextType {
  currentUser: User | null;
  orders: Order[];
  zones: Zone[];
  rateCard: RateCard;
  agents: Agent[];
  users: User[];
  login: (email: string, role: 'Customer' | 'Delivery Agent' | 'Admin') => boolean;
  register: (name: string, email: string, phone: string) => boolean;
  logout: () => void;
  createOrder: (orderData: Omit<Order, 'id' | 'status' | 'timeline' | 'createdAt' | 'charge'>) => Order;
  confirmOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: DeliveryStatus, notes?: string) => void;
  rescheduleDelivery: (orderId: string, date: string) => void;
  addZone: (name: string, pincodes: string[]) => void;
  updateRateCard: (newRates: RateCard) => void;
  updateAgent: (agentId: string, updates: Partial<Agent>) => void;
  calculateCharge: (params: {
    length: number;
    width: number;
    height: number;
    weight: number;
    orderType: 'B2B' | 'B2C';
    paymentType: 'Prepaid' | 'COD';
    routeType: 'intraZone' | 'interZone';
  }) => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial mock data
const INITIAL_ZONES: Zone[] = [
  { id: 'zone-1', name: 'Zone Alpha', pincodes: ['100001', '100002', '100003'] },
  { id: 'zone-2', name: 'Zone Beta', pincodes: ['200001', '200002', '200003'] },
  { id: 'zone-3', name: 'Zone Gamma', pincodes: ['300001', '300002'] },
];

const INITIAL_RATE_CARD: RateCard = {
  intraZone: { B2B: 12, B2C: 15 },
  interZone: { B2B: 24, B2C: 30 },
  codSurcharge: { B2B: 10, B2C: 15 },
};

const INITIAL_AGENTS: Agent[] = [
  { id: 'agent-1', name: 'Robert Chen', email: 'agent1@tracker.com', phone: '+1 555-0101', zone: 'Zone Alpha', status: 'available' },
  { id: 'agent-2', name: 'Sarah Jenkins', email: 'agent2@tracker.com', phone: '+1 555-0102', zone: 'Zone Beta', status: 'busy' },
  { id: 'agent-3', name: 'Marcus Brody', email: 'agent3@tracker.com', phone: '+1 555-0103', zone: 'Zone Gamma', status: 'available' },
];

const INITIAL_USERS: User[] = [
  { id: 'customer-1', name: 'Aarya Deshpande', email: 'customer@tracker.com', phone: '+1 555-0199', role: 'Customer' },
  { id: 'customer-2', name: 'Acme Corporates', email: 'acme@tracker.com', phone: '+1 555-0200', role: 'Customer' },
  { id: 'agent-1-user', name: 'Robert Chen', email: 'agent1@tracker.com', role: 'Delivery Agent' },
  { id: 'agent-2-user', name: 'Sarah Jenkins', email: 'agent2@tracker.com', role: 'Delivery Agent' },
  { id: 'admin-1-user', name: 'Control Center', email: 'admin@tracker.com', role: 'Admin' },
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-1001',
    customerName: 'Aarya Deshpande',
    customerEmail: 'customer@tracker.com',
    customerPhone: '+1 555-0199',
    pickupAddress: 'Sector 5, Greenwood Block, Zone Alpha',
    dropAddress: 'Hillside Avenue House 21, Zone Alpha',
    length: 25,
    width: 20,
    height: 15,
    weight: 2.2,
    orderType: 'B2C',
    paymentType: 'Prepaid',
    status: 'Delivered',
    charge: 54.00,
    assignedAgentId: 'agent-1',
    zone: 'Zone Alpha',
    createdAt: '2026-07-08 09:15 AM',
    timeline: [
      { status: 'Picked Up', timestamp: '2026-07-08 10:30 AM', notes: 'Package scanned and picked up by Robert Chen', actor: 'Agent: Robert Chen' },
      { status: 'In Transit', timestamp: '2026-07-08 11:45 AM', notes: 'In transit to last-mile hub', actor: 'Agent: Robert Chen' },
      { status: 'Out for Delivery', timestamp: '2026-07-08 02:10 PM', notes: 'Out for delivery with agent Robert', actor: 'Agent: Robert Chen' },
      { status: 'Delivered', timestamp: '2026-07-08 03:30 PM', notes: 'Delivered to recipient, signed by gate keeper', actor: 'Agent: Robert Chen' }
    ]
  },
  {
    id: 'ORD-1002',
    customerName: 'Aarya Deshpande',
    customerEmail: 'customer@tracker.com',
    customerPhone: '+1 555-0199',
    pickupAddress: 'Sector 5, Greenwood Block, Zone Alpha',
    dropAddress: 'Tech Park Plaza, Tower B, Zone Beta',
    length: 30,
    width: 30,
    height: 25,
    weight: 5.0,
    orderType: 'B2C',
    paymentType: 'COD',
    status: 'In Transit',
    charge: 165.00,
    assignedAgentId: 'agent-2',
    zone: 'Zone Beta',
    createdAt: '2026-07-09 08:00 AM',
    timeline: [
      { status: 'Picked Up', timestamp: '2026-07-09 09:30 AM', notes: 'Picked up from customer warehouse', actor: 'Agent: Sarah Jenkins' },
      { status: 'In Transit', timestamp: '2026-07-09 11:00 AM', notes: 'Dispatched towards Zone Beta delivery hub', actor: 'Agent: Sarah Jenkins' }
    ]
  },
  {
    id: 'ORD-1003',
    customerName: 'Acme Corporates',
    customerEmail: 'acme@tracker.com',
    customerPhone: '+1 555-0200',
    pickupAddress: 'Warehouse A, Industry Blvd, Zone Gamma',
    dropAddress: 'Retail Hub Center, Zone Alpha',
    length: 100,
    width: 60,
    height: 50,
    weight: 22.5,
    orderType: 'B2B',
    paymentType: 'Prepaid',
    status: 'Picked Up',
    charge: 720.00,
    assignedAgentId: 'agent-1',
    zone: 'Zone Alpha',
    createdAt: '2026-07-09 11:30 AM',
    timeline: [
      { status: 'Picked Up', timestamp: '2026-07-09 01:00 PM', notes: 'Bulk shipment collected', actor: 'Agent: Robert Chen' }
    ]
  },
  {
    id: 'ORD-1004',
    customerName: 'Aarya Deshpande',
    customerEmail: 'customer@tracker.com',
    customerPhone: '+1 555-0199',
    pickupAddress: 'Residential Block 12, Zone Alpha',
    dropAddress: 'Sunset Apartments Floor 3, Zone Alpha',
    length: 15,
    width: 15,
    height: 10,
    weight: 0.8,
    orderType: 'B2C',
    paymentType: 'COD',
    status: 'Failed',
    charge: 30.00,
    assignedAgentId: 'agent-3',
    zone: 'Zone Alpha',
    createdAt: '2026-07-08 04:00 PM',
    timeline: [
      { status: 'Picked Up', timestamp: '2026-07-08 05:00 PM', notes: 'Package collected', actor: 'Agent: Marcus Brody' },
      { status: 'Out for Delivery', timestamp: '2026-07-09 10:00 AM', notes: 'Out for delivery', actor: 'Agent: Marcus Brody' },
      { status: 'Failed', timestamp: '2026-07-09 02:00 PM', notes: 'Customer not reachable, door locked', actor: 'Agent: Marcus Brody' }
    ]
  }
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('delivery_tracker_user');
    return saved ? JSON.parse(saved) : INITIAL_USERS[0]; // Default to first customer for convenience
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('delivery_tracker_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [zones, setZones] = useState<Zone[]>(() => {
    const saved = localStorage.getItem('delivery_tracker_zones');
    return saved ? JSON.parse(saved) : INITIAL_ZONES;
  });

  const [rateCard, setRateCard] = useState<RateCard>(() => {
    const saved = localStorage.getItem('delivery_tracker_ratecard');
    return saved ? JSON.parse(saved) : INITIAL_RATE_CARD;
  });

  const [agents, setAgents] = useState<Agent[]>(() => {
    const saved = localStorage.getItem('delivery_tracker_agents');
    return saved ? JSON.parse(saved) : INITIAL_AGENTS;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('delivery_tracker_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('delivery_tracker_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('delivery_tracker_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('delivery_tracker_zones', JSON.stringify(zones));
  }, [zones]);

  useEffect(() => {
    localStorage.setItem('delivery_tracker_ratecard', JSON.stringify(rateCard));
  }, [rateCard]);

  useEffect(() => {
    localStorage.setItem('delivery_tracker_agents', JSON.stringify(agents));
  }, [agents]);

  useEffect(() => {
    localStorage.setItem('delivery_tracker_users', JSON.stringify(users));
  }, [users]);

  // Authenticate user
  const login = (email: string, role: 'Customer' | 'Delivery Agent' | 'Admin'): boolean => {
    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.role === role);
    if (foundUser) {
      setCurrentUser(foundUser);
      return true;
    }
    // Auto-create for demo convenience if user doesn't exist
    const demoName = email.split('@')[0];
    const formattedName = demoName.charAt(0).toUpperCase() + demoName.slice(1);
    const newUser: User = {
      id: `${role.toLowerCase()}-${Date.now()}`,
      name: formattedName,
      email: email.toLowerCase(),
      role
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    return true;
  };

  const register = (name: string, email: string, phone: string): boolean => {
    // Register as customer only as per requirement
    const emailExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (emailExists) return false;

    const newUser: User = {
      id: `customer-${Date.now()}`,
      name,
      email: email.toLowerCase(),
      phone,
      role: 'Customer'
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  // Charge Calculation Core Logic
  const calculateCharge = (params: {
    length: number;
    width: number;
    height: number;
    weight: number;
    orderType: 'B2B' | 'B2C';
    paymentType: 'Prepaid' | 'COD';
    routeType: 'intraZone' | 'interZone';
  }) => {
    const { length, width, height, weight, orderType, paymentType, routeType } = params;
    // Volumetric weight = (L * B * H) / 5000
    const volumetricWeight = (length * width * height) / 5000;
    const chargeableWeight = Math.max(weight, volumetricWeight);

    // Get rates
    const baseRate = rateCard[routeType][orderType];
    const surcharge = paymentType === 'COD' ? rateCard.codSurcharge[orderType] : 0;

    const finalCharge = (chargeableWeight * baseRate) + surcharge;
    return Math.round(finalCharge * 100) / 100;
  };

  // Create temporary/unconfirmed order, return object so user can review
  const createOrder = (orderData: Omit<Order, 'id' | 'status' | 'timeline' | 'createdAt' | 'charge'>): Order => {
    // Guess route type based on pickup and drop zone context (or default to intra-zone if not specified)
    const routeType = orderData.zone.includes('Beta') && orderData.pickupAddress.includes('Alpha') ? 'interZone' : 'intraZone';

    const charge = calculateCharge({
      length: orderData.length,
      width: orderData.width,
      height: orderData.height,
      weight: orderData.weight,
      orderType: orderData.orderType,
      paymentType: orderData.paymentType,
      routeType
    });

    const mockOrder: Order = {
      ...orderData,
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'Picked Up',
      charge,
      createdAt: new Date().toLocaleString(),
      timeline: [
        { status: 'Picked Up', timestamp: new Date().toLocaleString(), notes: 'Order created and ready for pick up.', actor: 'System: Order Created' }
      ]
    };

    return mockOrder;
  };

  // Confirm order to add it to state
  const confirmOrder = (order: Order) => {
    setOrders(prev => [order, ...prev]);
  };

  const updateOrderStatus = (orderId: string, status: DeliveryStatus, notes?: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const timestamp = new Date().toLocaleString();
        const defaultNotes: Record<DeliveryStatus, string> = {
          'Picked Up': 'Package collection recorded.',
          'In Transit': 'In transit to the nearest sorting hub.',
          'Out for Delivery': 'Dispatched with delivery executive for final delivery.',
          'Delivered': 'Package delivered and signed successfully.',
          'Failed': 'Delivery attempt failed.'
        };
        const eventNotes = notes || defaultNotes[status];
        return {
          ...o,
          status,
          timeline: [
            ...o.timeline,
            { status, timestamp, notes: eventNotes, actor: currentUser ? `${currentUser.role}: ${currentUser.name}` : 'System' }
          ]
        };
      }
      return o;
    }));
  };

  const rescheduleDelivery = (orderId: string, date: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const timestamp = new Date().toLocaleString();
        return {
          ...o,
          status: 'Picked Up', // Resets back to Picked Up or In Transit to retry
          scheduledDate: date,
          timeline: [
            ...o.timeline,
            { status: 'Picked Up', timestamp, notes: `Delivery rescheduled for ${date}`, actor: currentUser ? `${currentUser.role}: ${currentUser.name}` : 'System' }
          ]
        };
      }
      return o;
    }));
  };

  const addZone = (name: string, pincodes: string[]) => {
    const newZone: Zone = {
      id: `zone-${Date.now()}`,
      name,
      pincodes
    };
    setZones(prev => [...prev, newZone]);
  };

  const updateRateCard = (newRates: RateCard) => {
    setRateCard(newRates);
  };

  const updateAgent = (agentId: string, updates: Partial<Agent>) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, ...updates } : a));
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      orders,
      zones,
      rateCard,
      agents,
      users,
      login,
      register,
      logout,
      createOrder,
      confirmOrder,
      updateOrderStatus,
      rescheduleDelivery,
      addZone,
      updateRateCard,
      updateAgent,
      calculateCharge
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};