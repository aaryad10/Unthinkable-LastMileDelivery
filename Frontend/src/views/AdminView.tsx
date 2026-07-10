import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Order, DeliveryStatus, Zone, RateCard, Agent, User } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { OrderCard } from '../components/OrderCard';
import {
  Package, Map, DollarSign, Users, ShieldAlert, PlusCircle, Trash, Check, HelpCircle, RefreshCw, Edit, Save, ToggleLeft, ToggleRight, Search, MapPin, Calculator, Info, ShieldCheck, Mail, Phone, Calendar, CheckCircle
} from 'lucide-react';

interface AdminViewProps {
  activeTab: 'dashboard' | 'create' | 'zones' | 'rates' | 'agents';
  setActiveTab: (tab: 'dashboard' | 'create' | 'zones' | 'rates' | 'agents') => void;
  id?: string;
}

export const AdminView: React.FC<AdminViewProps> = ({
  activeTab,
  setActiveTab,
  id
}) => {
  const {
    orders, zones, rateCard, agents, users,
    addZone, updateRateCard, updateAgent, updateOrderStatus, createOrder, confirmOrder
  } = useApp();

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<DeliveryStatus | 'All'>('All');
  const [filterZone, setFilterZone] = useState<string>('All');
  const [filterAgent, setFilterAgent] = useState<string>('All');

  // Order Booking (Same as customer, plus customer picker)
  const [selectedCustomerId, setSelectedCustomerId] = useState(users[0]?.id || '');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropAddress, setDropAddress] = useState('');
  const [length, setLength] = useState<number>(20);
  const [width, setWidth] = useState<number>(15);
  const [height, setHeight] = useState<number>(10);
  const [weight, setWeight] = useState<number>(1.5);
  const [orderType, setOrderType] = useState<'B2B' | 'B2C'>('B2C');
  const [paymentType, setPaymentType] = useState<'Prepaid' | 'COD'>('Prepaid');
  const [selectedZone, setSelectedZone] = useState('Zone Alpha');
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [formError, setFormError] = useState('');

  // Zone Management State
  const [newZoneName, setNewZoneName] = useState('');
  const [newZonePincodes, setNewZonePincodes] = useState('');
  const [zoneError, setZoneError] = useState('');

  // Rate Card State
  const [intraB2B, setIntraB2B] = useState(rateCard.intraZone.B2B);
  const [intraB2C, setIntraB2C] = useState(rateCard.intraZone.B2C);
  const [interB2B, setInterB2B] = useState(rateCard.interZone.B2B);
  const [interB2C, setInterB2C] = useState(rateCard.interZone.B2C);
  const [codSurchargeB2B, setCodSurchargeB2B] = useState(rateCard.codSurcharge.B2B);
  const [codSurchargeB2C, setCodSurchargeB2C] = useState(rateCard.codSurcharge.B2C);
  const [rateSuccess, setRateSuccess] = useState(false);

  // Filter Orders for table
  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.dropAddress.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All' || o.status === filterStatus;
    const matchesZone = filterZone === 'All' || o.zone === filterZone;
    
    // Agent filter logic
    let matchesAgent = true;
    if (filterAgent !== 'All') {
      matchesAgent = o.assignedAgentId === filterAgent;
    }

    return matchesSearch && matchesStatus && matchesZone && matchesAgent;
  });

  // Calculate generic dashboard counters
  const totalDeliveries = orders.length;
  const transitCount = orders.filter(o => ['In Transit', 'Out for Delivery', 'Picked Up'].includes(o.status)).length;
  const completedCount = orders.filter(o => o.status === 'Delivered').length;
  const failureCount = orders.filter(o => o.status === 'Failed').length;

  // Handle Dispatch Order Form Submission -> Generates Preview
  const handleAdminDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!pickupAddress.trim() || !dropAddress.trim()) {
      setFormError('Pickup and drop-off addresses are required.');
      return;
    }

    const pickedUser = users.find(u => u.id === selectedCustomerId);
    if (!pickedUser) {
      setFormError('Please select a valid customer.');
      return;
    }

    const draft = createOrder({
      customerName: pickedUser.name,
      customerEmail: pickedUser.email,
      customerPhone: pickedUser.phone || '+1 555-0100',
      pickupAddress,
      dropAddress,
      length,
      width,
      height,
      weight,
      orderType,
      paymentType,
      zone: selectedZone,
      assignedAgentId: 'agent-1' // Auto assigned default
    });

    setPreviewOrder(draft);
  };

  const handleConfirmDispatch = () => {
    if (previewOrder) {
      confirmOrder(previewOrder);
      
      // Reset Form fields
      setPickupAddress('');
      setDropAddress('');
      setLength(20);
      setWidth(15);
      setHeight(10);
      setWeight(1.5);
      setPreviewOrder(null);
      setFormError('');

      // Go back to Dashboard Control Center
      setActiveTab('dashboard');
    }
  };

  // Handle Zone Creation
  const handleCreateZone = (e: React.FormEvent) => {
    e.preventDefault();
    setZoneError('');

    if (!newZoneName.trim() || !newZonePincodes.trim()) {
      setZoneError('Zone name and pincodes are mandatory.');
      return;
    }

    // Split pincodes by commas and trim whitespace
    const codes = newZonePincodes.split(',').map(c => c.trim()).filter(c => c.length > 0);
    if (codes.length === 0) {
      setZoneError('Please enter at least one valid pincode.');
      return;
    }

    addZone(newZoneName.trim(), codes);
    setNewZoneName('');
    setNewZonePincodes('');
  };

  // Handle Rate Card Update
  const handleRateCardSave = (e: React.FormEvent) => {
    e.preventDefault();
    setRateSuccess(false);

    updateRateCard({
      intraZone: { B2B: Number(intraB2B), B2C: Number(intraB2C) },
      interZone: { B2B: Number(interB2B), B2C: Number(interB2C) },
      codSurcharge: { B2B: Number(codSurchargeB2B), B2C: Number(codSurchargeB2C) }
    });

    setRateSuccess(true);
    setTimeout(() => setRateSuccess(false), 2000);
  };

  return (
    <div id={id || "admin-view-container"} className="space-y-6">
      
      {/* -------------------- CONTROL CENTER DASHBOARD -------------------- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Top Metric Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
              <div className="p-3 bg-slate-100 text-slate-700 rounded-lg">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Platform Total</p>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-bold text-slate-800">{totalDeliveries}</span>
                  <span className="text-[10px] font-bold text-emerald-600">+12%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Active Dispatch</p>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-bold text-slate-800">{transitCount}</span>
                  <span className="text-[10px] font-bold text-blue-600">Live</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Delivered Success</p>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-bold text-slate-800">{completedCount}</span>
                  <span className="text-[10px] font-bold text-emerald-600">Success</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Failed Attempts</p>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-bold text-slate-800">{failureCount}</span>
                  <span className="text-[10px] font-bold text-rose-600 font-mono">Critical</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filtering and Search Controls */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by ID, customer name, drop address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Action dispatcher shortcut */}
              <button
                onClick={() => setActiveTab('create')}
                className="w-full lg:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition active:scale-95 whitespace-nowrap shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                Dispatch New Package
              </button>
            </div>

            {/* Structured filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">FILTER STATUS</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full border border-slate-200 rounded p-2 text-xs bg-slate-50 focus:outline-hidden text-slate-700"
                >
                  <option value="All">All Statuses</option>
                  <option value="Picked Up">Picked Up</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">FILTER ZONE</span>
                <select
                  value={filterZone}
                  onChange={(e) => setFilterZone(e.target.value)}
                  className="w-full border border-slate-200 rounded p-2 text-xs bg-slate-50 focus:outline-hidden text-slate-700"
                >
                  <option value="All">All Service Zones</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.name}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">ASSIGNED COURIER</span>
                <select
                  value={filterAgent}
                  onChange={(e) => setFilterAgent(e.target.value)}
                  className="w-full border border-slate-200 rounded p-2 text-xs bg-slate-50 focus:outline-hidden text-slate-700"
                >
                  <option value="All">All Couriers</option>
                  {agents.map(ag => (
                    <option key={ag.id} value={ag.id}>{ag.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Core Table View */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <h4 className="font-bold text-slate-700">Live Delivery Monitor</h4>
              <span className="text-xs text-slate-400 font-mono font-medium">{filteredOrders.length} records found</span>
            </div>
            {filteredOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-[10px] font-mono tracking-wider border-b border-slate-100 uppercase font-bold">
                      <th className="py-3 px-5">ID</th>
                      <th className="py-3 px-4">Client Contact</th>
                      <th className="py-3 px-4">Destinations (Pickup → Drop)</th>
                      <th className="py-3 px-4">Type / Zone</th>
                      <th className="py-3 px-4">Charge / Mode</th>
                      <th className="py-3 px-4">Rostered Courier</th>
                      <th className="py-3 px-4">Override Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/40 transition">
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-800">
                        {ord.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold block text-slate-800">{ord.customerName}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">{ord.customerEmail}</span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="block truncate text-[11px] text-amber-700 font-medium">From: {ord.pickupAddress}</span>
                        <span className="block truncate text-[11px] text-emerald-700 font-medium">To: {ord.dropAddress}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="block font-semibold text-slate-700">{ord.orderType}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">{ord.zone}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        ${ord.charge.toFixed(2)}
                        <span className="text-[9px] text-slate-400 font-normal block">{ord.paymentType}</span>
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {agents.find(a => a.id === ord.assignedAgentId)?.name || 'Unassigned'}
                      </td>
                      <td className="py-3.5 px-4">
                        {/* Status Manual Override Dropdown */}
                        <select
                          value={ord.status}
                          onChange={(e) => updateOrderStatus(ord.id, e.target.value as DeliveryStatus, `Manual Status Override by Control Room Admin.`)}
                          className="border border-slate-200 rounded-md p-1 bg-white font-medium text-xs text-slate-700 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                        >
                          <option value="Picked Up">Picked Up</option>
                          <option value="In Transit">In Transit</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Failed">Failed</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            ) : (
              <div className="text-center py-16">
                <Package className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-800">No matching orders found</h3>
                <p className="text-xs text-slate-400">Modify your filter constraints and try again.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------- CREATE ORDER ON BEHALF -------------------- */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
          
          {/* Input Form */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-100 p-6 shadow-xs">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Book Order on Behalf of Client</h2>
            <p className="text-xs text-slate-500 mb-6">Select from registered users and configure coordinates to dispatch last-mile couriers.</p>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-lg font-medium mb-5">
                {formError}
              </div>
            )}

            <form onSubmit={handleAdminDispatchSubmit} className="space-y-4">
              {/* Customer Selector */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Select Registered Customer
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="block w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-hidden focus:border-blue-500"
                >
                  {users.filter(u => u.role === 'Customer').map(cust => (
                    <option key={cust.id} value={cust.id}>
                      {cust.name} ({cust.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Service Zone
                  </label>
                  <select
                    value={selectedZone}
                    onChange={(e) => setSelectedZone(e.target.value)}
                    className="block w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-hidden"
                  >
                    {zones.map(z => (
                      <option key={z.id} value={z.name}>{z.name} (Coverage: {z.pincodes.join(', ')})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Order Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrderType('B2C')}
                      className={`py-2 px-1 text-xs font-semibold border rounded-lg transition ${orderType === 'B2C' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                      B2C (Retail)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('B2B')}
                      className={`py-2 px-1 text-xs font-semibold border rounded-lg transition ${orderType === 'B2B' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                      B2B (Enterprise)
                    </button>
                  </div>
                </div>
              </div>

              {/* Addresses */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Pickup Address
                  </label>
                  <input
                    type="text"
                    required
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="Sector Alpha Logistics Center Unit 12..."
                    className="block w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Drop-off Address
                  </label>
                  <input
                    type="text"
                    required
                    value={dropAddress}
                    onChange={(e) => setDropAddress(e.target.value)}
                    placeholder="Residential Sector 5 House 2..."
                    className="block w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Dimensions */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Package dimensions (cm) & weight (kg)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">L (cm)</span>
                    <input
                      type="number"
                      required
                      value={length}
                      onChange={(e) => setLength(parseInt(e.target.value) || 0)}
                      className="block w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">W (cm)</span>
                    <input
                      type="number"
                      required
                      value={width}
                      onChange={(e) => setWidth(parseInt(e.target.value) || 0)}
                      className="block w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">H (cm)</span>
                    <input
                      type="number"
                      required
                      value={height}
                      onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
                      className="block w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Weight (kg)</span>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={weight}
                      onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                      className="block w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Payment selection */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Payment Profile
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentType('Prepaid')}
                    className={`py-2 px-1 text-xs font-semibold border rounded-lg transition ${paymentType === 'Prepaid' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-slate-600 border-slate-200'}`}
                  >
                    Prepaid (Customer Account)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('COD')}
                    className={`py-2 px-1 text-xs font-semibold border rounded-lg transition ${paymentType === 'COD' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-slate-600 border-slate-200'}`}
                  >
                    Cash on Delivery (COD Surcharge)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
              >
                <Calculator className="w-4 h-4" />
                Calculate Charge & Compile Invoice
              </button>
            </form>
          </div>

          {/* Pricing Preview Summary Card */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow-sm">
              <h3 className="text-sm font-mono font-bold text-slate-400 tracking-widest uppercase mb-4">Calculated Invoice</h3>

              {previewOrder ? (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block">RECIPIENT CLIENT</span>
                    <span className="text-sm font-semibold text-white block truncate">{previewOrder.customerName}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block">COURIER SECTOR</span>
                    <span className="text-xs font-mono text-slate-300 block">{previewOrder.zone}</span>
                  </div>

                  <div className="space-y-1.5 pt-4 border-t border-slate-800 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Base route cost ({previewOrder.orderType})</span>
                      <span>${(previewOrder.charge - (previewOrder.paymentType === 'COD' ? rateCard.codSurcharge[previewOrder.orderType] : 0)).toFixed(2)}</span>
                    </div>
                    {previewOrder.paymentType === 'COD' && (
                      <div className="flex justify-between text-amber-400 font-medium">
                        <span>COD Cash Handling Surcharge</span>
                        <span>+${rateCard.codSurcharge[previewOrder.orderType].toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-md pt-3 border-t border-dashed border-slate-800 font-semibold text-white">
                      <span>Platform total cost</span>
                      <span className="text-lg text-blue-400 font-bold">${previewOrder.charge.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="pt-4 space-y-2">
                    <button
                      onClick={handleConfirmDispatch}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs shadow-sm transition flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Dispatch & Assign Courier
                    </button>
                    <button
                      onClick={() => setPreviewOrder(null)}
                      className="w-full py-2 bg-transparent text-slate-400 hover:text-slate-200 text-[11px] font-semibold rounded"
                    >
                      Discard Draft
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calculator className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-xs text-slate-400 font-mono">Fill in coordination metrics to compile shipping and volumetric weight calculations instantly.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------- ZONE CONFIGURATION PAGE -------------------- */}
      {activeTab === 'zones' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
          
          {/* Create new Zone Form */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-100 p-6 shadow-xs h-fit">
            <h2 className="text-md font-bold text-slate-800 mb-1 flex items-center gap-2">
              <Map className="w-5 h-5 text-blue-600" />
              Configure Service Zone
            </h2>
            <p className="text-xs text-slate-500 mb-6">Create physical divisions and map delivery pincodes to set automatic sorting paths.</p>

            {zoneError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-lg font-medium mb-4">
                {zoneError}
              </div>
            )}

            <form onSubmit={handleCreateZone} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Zone Name
                </label>
                <input
                  type="text"
                  required
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="E.g. Zone Delta"
                  className="block w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Assigned Pincodes (Comma separated)
                </label>
                <textarea
                  required
                  value={newZonePincodes}
                  onChange={(e) => setNewZonePincodes(e.target.value)}
                  placeholder="100084, 100085, 100086"
                  rows={3}
                  className="block w-full text-xs border border-slate-200 rounded-lg p-2.5 resize-none bg-slate-50 focus:outline-hidden focus:bg-white"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Separate each coverage pincode with a comma.
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
              >
                Add Active Service Sector
              </button>
            </form>
          </div>

          {/* Zones list */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-100 shadow-xs p-6">
            <h3 className="text-sm font-bold text-slate-800 font-mono tracking-wider uppercase mb-4">Platform Covered Sectors</h3>
            
            <div className="space-y-4">
              {zones.map(z => (
                <div key={z.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      {z.name}
                    </h4>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {z.pincodes.map(code => (
                        <span key={code} className="px-2 py-0.5 bg-white text-slate-600 border border-slate-200 rounded text-[10px] font-mono">
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-bold font-mono">
                    {z.pincodes.length} areas
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -------------------- RATE CARD CONFIGURATION PAGE -------------------- */}
      {activeTab === 'rates' && (
        <div className="max-w-3xl mx-auto bg-white rounded-xl border border-slate-100 shadow-xs p-6 animate-fade-in">
          
          <div className="pb-4 border-b border-slate-100 mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                Configure Platform Rate Cards
              </h2>
              <p className="text-xs text-slate-500 mt-1">Configure pricing tiers in USD ($) charged per chargeable kilogram weight.</p>
            </div>
          </div>

          {rateSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-lg font-medium mb-5 flex items-center gap-1.5 animate-scale-up">
              <Check className="w-4 h-4" />
              Rate configurations updated across the platform successfully!
            </div>
          )}

          <form onSubmit={handleRateCardSave} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Intra Zone Pricing Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-slate-500 block">A) INTRA-ZONE TARIFFS (Same Zone)</span>
                <p className="text-[11px] text-slate-400">Rates applied to collection and drop points mapping to identical sectors.</p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600">B2B Base (per kg)</label>
                    <div className="mt-1 relative rounded-md shadow-xs">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={intraB2B}
                        onChange={(e) => setIntraB2B(parseFloat(e.target.value) || 0)}
                        className="block w-full pl-6 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600">B2C Base (per kg)</label>
                    <div className="mt-1 relative rounded-md shadow-xs">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={intraB2C}
                        onChange={(e) => setIntraB2C(parseFloat(e.target.value) || 0)}
                        className="block w-full pl-6 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Inter Zone Pricing Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-slate-500 block">B) INTER-ZONE TARIFFS (Cross Zone)</span>
                <p className="text-[11px] text-slate-400">Rates applied to collection and drop points spanning separate zones.</p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600">B2B Base (per kg)</label>
                    <div className="mt-1 relative rounded-md shadow-xs">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={interB2B}
                        onChange={(e) => setInterB2B(parseFloat(e.target.value) || 0)}
                        className="block w-full pl-6 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600">B2C Base (per kg)</label>
                    <div className="mt-1 relative rounded-md shadow-xs">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={interB2C}
                        onChange={(e) => setInterB2C(parseFloat(e.target.value) || 0)}
                        className="block w-full pl-6 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cash on Delivery handling Surcharge */}
            <div className="p-4 bg-amber-50/40 border border-amber-100 rounded-xl space-y-4">
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-amber-800 block">C) CASH ON DELIVERY SURCHARGE</span>
              <p className="text-[11px] text-amber-700">Extra service handling fee charged when a delivery driver acts as a cash collection hub.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600">B2B COD Surcharge</label>
                  <div className="mt-1 relative rounded-md shadow-xs">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 text-xs">$</span>
                    <input
                      type="number"
                      required
                      value={codSurchargeB2B}
                      onChange={(e) => setCodSurchargeB2B(parseFloat(e.target.value) || 0)}
                      className="block w-full pl-6 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">B2C COD Surcharge</label>
                  <div className="mt-1 relative rounded-md shadow-xs">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 text-xs">$</span>
                    <input
                      type="number"
                      required
                      value={codSurchargeB2C}
                      onChange={(e) => setCodSurchargeB2C(parseFloat(e.target.value) || 0)}
                      className="block w-full pl-6 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs shadow-xs transition"
            >
              Save Tariff Configurations
            </button>
          </form>
        </div>
      )}

      {/* -------------------- AGENT MANAGEMENT PAGE -------------------- */}
      {activeTab === 'agents' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-xs p-6 animate-fade-in">
          
          <div className="pb-4 border-b border-slate-100 mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Roster Delivery Agents
              </h2>
              <p className="text-xs text-slate-500 mt-1">Manage dispatch couriers, coordinate sector assignments, and toggle shifts.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map(ag => (
              <div key={ag.id} className="p-4 rounded-xl border border-slate-100 shadow-xs bg-slate-50/40 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{ag.name}</h3>
                    <span className="text-[10px] text-slate-400 font-mono">ID: {ag.id}</span>
                  </div>
                  
                  {/* Status indicator */}
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${ag.status === 'available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-600'}`}>
                    {ag.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-500">
                  <div className="flex justify-between">
                    <span>Email Address</span>
                    <span className="font-semibold text-slate-700">{ag.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contact Line</span>
                    <span className="font-semibold text-slate-700">{ag.phone}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-100/60">
                    <span className="font-semibold text-slate-400 font-mono">SECTOR</span>
                    
                    {/* Zone selector */}
                    <select
                      value={ag.zone}
                      onChange={(e) => updateAgent(ag.id, { zone: e.target.value })}
                      className="border border-slate-200 rounded p-1 bg-white text-[10px] font-medium text-slate-700"
                    >
                      {zones.map(z => (
                        <option key={z.id} value={z.name}>{z.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Switch toggler availability */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Shift Availability</span>
                  
                  <button
                    onClick={() => updateAgent(ag.id, { status: ag.status === 'available' ? 'busy' : 'available' })}
                    className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition"
                  >
                    {ag.status === 'available' ? (
                      <ToggleRight className="w-8 h-8 text-blue-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
