import React, { createContext, useContext, useState, useEffect } from 'react';
import { Order, Zone, RateCard, Agent, User, DeliveryStatus, TimelineEvent } from '../types';
import { api } from '../api';

interface AppContextType {
  currentUser: User | null;
  isLoading: boolean;
  orders: Order[];
  zones: Zone[];
  rateCard: RateCard;
  agents: Agent[];
  customers: User[]; // for admin's "create order on behalf of" picker
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, phone: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshOrders: () => Promise<void>;
  getQuote: (params: QuoteParams) => Promise<any>;
  createOrder: (orderData: CreateOrderParams) => Promise<{ success: boolean; order?: Order; error?: string }>;
  updateOrderStatus: (orderId: string, status: DeliveryStatus, notes?: string) => Promise<{ success: boolean; error?: string }>;
  rescheduleDelivery: (orderId: string, date: string) => Promise<{ success: boolean; error?: string }>;
  assignAgent: (orderId: string, agentId?: string, auto?: boolean) => Promise<{ success: boolean; error?: string }>;
  addZone: (name: string, pincodes: string[]) => Promise<{ success: boolean; error?: string }>;
  updateRateCard: (routeType: 'intraZone' | 'interZone', orderType: 'B2B' | 'B2C', rate: number) => Promise<{ success: boolean; error?: string }>;
  updateCodSurcharge: (orderType: 'B2B' | 'B2C', surcharge: number) => Promise<{ success: boolean; error?: string }>;
  updateAgent: (agentId: string, updates: { zoneId?: string; availability?: 'available' | 'busy' | 'offline' }) => Promise<{ success: boolean; error?: string }>;
  addAgent: (name: string, email: string, password: string, phone: string, zoneId?: string) => Promise<{ success: boolean; error?: string }>;
}

interface QuoteParams {
  length: number;
  width: number;
  height: number;
  weight: number;
  orderType: 'B2B' | 'B2C';
  paymentType: 'Prepaid' | 'COD';
  pickupPincode: string;
  dropPincode: string;
}

interface CreateOrderParams {
  pickupAddress: string;
  pickupPincode: string;
  dropAddress: string;
  dropPincode: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  orderType: 'B2B' | 'B2C';
  paymentType: 'Prepaid' | 'COD';
  customerId?: string; // admin creating on behalf of a customer
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ---------- Mapping helpers: backend (snake_case) -> frontend types ----------

function mapRole(backendRole: string): 'Customer' | 'Delivery Agent' | 'Admin' {
  if (backendRole === 'admin') return 'Admin';
  if (backendRole === 'agent') return 'Delivery Agent';
  return 'Customer';
}

function mapUser(u: any): User {
  return {
    id: String(u.id),
    name: u.name,
    email: u.email,
    phone: u.phone || undefined,
    role: mapRole(u.role),
  };
}

function mapTimelineEvent(h: any): TimelineEvent {
  return {
    status: h.status as DeliveryStatus,
    timestamp: h.timestamp,
    notes: h.notes || '',
    actor: h.actor_label,
  };
}

function mapOrder(o: any): Order {
  return {
    id: o.order_code,
    dbId: o.id,
    customerName: o.customer_name || '',
    customerEmail: o.customer_email || '',
    customerPhone: o.customer_phone || '',
    pickupAddress: o.pickup_address,
    dropAddress: o.drop_address,
    length: o.length_cm,
    width: o.width_cm,
    height: o.height_cm,
    weight: o.actual_weight_kg,
    orderType: o.order_type,
    paymentType: o.payment_type,
    status: o.status as DeliveryStatus,
    charge: o.charge,
    assignedAgentId: o.assigned_agent_id ? String(o.assigned_agent_id) : '',
    zone: o.pickup_zone_name || '',
    timeline: Array.isArray(o.timeline) ? o.timeline.map(mapTimelineEvent) : [],
    createdAt: o.created_at,
    scheduledDate: o.scheduled_date || undefined,
  };
}

function mapZone(z: any): Zone {
  return {
    id: String(z.id),
    name: z.name,
    pincodes: z.pincodes || [],
  };
}

function mapAgent(a: any): Agent {
  return {
    id: String(a.id),
    name: a.name,
    email: a.email,
    phone: a.phone || '',
    zone: a.zone_name || '',
    status: a.availability === 'offline' ? 'busy' : a.availability, // UI only models available/busy
  };
}

function mapRateCard(rateCards: any[], codSurcharge: any[]): RateCard {
  const find = (routeType: string, orderType: string) =>
    rateCards.find((r) => r.route_type === routeType && r.order_type === orderType)?.rate_per_kg || 0;
  const findCod = (orderType: string) =>
    codSurcharge.find((c) => c.order_type === orderType)?.surcharge || 0;

  return {
    intraZone: { B2B: find('intra_zone', 'B2B'), B2C: find('intra_zone', 'B2C') },
    interZone: { B2B: find('inter_zone', 'B2B'), B2C: find('inter_zone', 'B2C') },
    codSurcharge: { B2B: findCod('B2B'), B2C: findCod('B2C') },
  };
}

const EMPTY_RATE_CARD: RateCard = {
  intraZone: { B2B: 0, B2C: 0 },
  interZone: { B2B: 0, B2C: 0 },
  codSurcharge: { B2B: 0, B2C: 0 },
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [rateCard, setRateCard] = useState<RateCard>(EMPTY_RATE_CARD);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);

  // Restore session on page load if a token exists
  useEffect(() => {
    const restoreSession = async () => {
      const token = api.getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.me();
        setCurrentUser(mapUser(res.user));
      } catch {
        api.clearToken();
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  // Load orders + zones + agents (+ rate card / customers for admin) whenever the user changes
  useEffect(() => {
    if (!currentUser) {
      setOrders([]);
      setZones([]);
      setAgents([]);
      setCustomers([]);
      setRateCard(EMPTY_RATE_CARD);
      return;
    }
    refreshOrders();
    loadZonesAndAgents();
    if (currentUser.role === 'Admin') {
      loadRateCard();
      loadCustomers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const refreshOrders = async () => {
    try {
      const res = await api.listOrders();
      setOrders(res.orders.map(mapOrder));
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  };

  const loadZonesAndAgents = async () => {
    try {
      // Zones and agents are admin-only endpoints on the backend; only fetch
      // if the current role is allowed to, otherwise silently skip.
      if (currentUser?.role === 'Admin') {
        const [zonesRes, agentsRes] = await Promise.all([api.listZones(), api.listAgents()]);
        setZones(zonesRes.zones.map(mapZone));
        setAgents(agentsRes.agents.map(mapAgent));
      }
    } catch (err) {
      console.error('Failed to load zones/agents:', err);
    }
  };

  const loadRateCard = async () => {
    try {
      const res = await api.getRateCards();
      setRateCard(mapRateCard(res.rateCards, res.codSurcharge));
    } catch (err) {
      console.error('Failed to load rate card:', err);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await api.listCustomers();
      setCustomers(res.customers.map(mapUser));
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await api.login(email, password);
      api.setToken(res.token);
      setCurrentUser(mapUser(res.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const register = async (name: string, email: string, password: string, phone: string) => {
    try {
      const res = await api.register(name, email, password, phone);
      api.setToken(res.token);
      setCurrentUser(mapUser(res.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const logout = () => {
    api.clearToken();
    setCurrentUser(null);
  };

  const getQuote = async (params: QuoteParams) => {
    return api.quote({
      lengthCm: params.length,
      widthCm: params.width,
      heightCm: params.height,
      actualWeightKg: params.weight,
      pickupPincode: params.pickupPincode,
      dropPincode: params.dropPincode,
      orderType: params.orderType,
      paymentType: params.paymentType,
    });
  };

  const createOrder = async (orderData: CreateOrderParams) => {
    try {
      const res = await api.createOrder({
        pickupAddress: orderData.pickupAddress,
        pickupPincode: orderData.pickupPincode,
        dropAddress: orderData.dropAddress,
        dropPincode: orderData.dropPincode,
        lengthCm: orderData.length,
        widthCm: orderData.width,
        heightCm: orderData.height,
        actualWeightKg: orderData.weight,
        orderType: orderData.orderType,
        paymentType: orderData.paymentType,
        customerId: orderData.customerId,
      });
      const order = mapOrder(res.order);
      setOrders((prev) => [order, ...prev]);
      return { success: true, order };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create order' };
    }
  };

  const updateOrderStatus = async (orderId: string, status: DeliveryStatus, notes?: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { success: false, error: 'Order not found' };
    try {
      const res = await api.updateOrderStatus(order.dbId, status, notes);
      const updated = mapOrder(res.order);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update status' };
    }
  };

  const rescheduleDelivery = async (orderId: string, date: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { success: false, error: 'Order not found' };
    try {
      const res = await api.rescheduleOrder(order.dbId, date);
      const updated = mapOrder(res.order);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to reschedule' };
    }
  };

  const assignAgent = async (orderId: string, agentId?: string, auto?: boolean) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { success: false, error: 'Order not found' };
    try {
      await api.assignOrder(order.dbId, auto ? { auto: true } : { agentId });
      await refreshOrders();
      await loadZonesAndAgents();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to assign agent' };
    }
  };

  const addZone = async (name: string, pincodes: string[]) => {
    try {
      await api.createZone(name, pincodes);
      await loadZonesAndAgents();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to add zone' };
    }
  };

  const updateRateCard = async (routeType: 'intraZone' | 'interZone', orderType: 'B2B' | 'B2C', rate: number) => {
    try {
      const backendRouteType = routeType === 'intraZone' ? 'intra_zone' : 'inter_zone';
      await api.updateRateCard(backendRouteType, orderType, rate);
      await loadRateCard();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update rate card' };
    }
  };

  const updateCodSurcharge = async (orderType: 'B2B' | 'B2C', surcharge: number) => {
    try {
      await api.updateCodSurcharge(orderType, surcharge);
      await loadRateCard();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update COD surcharge' };
    }
  };

  const updateAgent = async (agentId: string, updates: { zoneId?: string; availability?: 'available' | 'busy' | 'offline' }) => {
    try {
      await api.updateAgent(agentId, updates);
      await loadZonesAndAgents();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update agent' };
    }
  };

  const addAgent = async (name: string, email: string, password: string, phone: string, zoneId?: string) => {
    try {
      await api.createAgent({ name, email, password, phone, zoneId });
      await loadZonesAndAgents();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to add agent' };
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isLoading,
        orders,
        zones,
        rateCard,
        agents,
        customers,
        login,
        register,
        logout,
        refreshOrders,
        getQuote,
        createOrder,
        updateOrderStatus,
        rescheduleDelivery,
        assignAgent,
        addZone,
        updateRateCard,
        updateCodSurcharge,
        updateAgent,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};