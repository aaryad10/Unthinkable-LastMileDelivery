import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Order, DeliveryStatus } from '../types';
import { OrderCard } from '../components/OrderCard';
import { Timeline } from '../components/Timeline';
import { StatusBadge } from '../components/StatusBadge';
import {
  Package, Calendar, HelpCircle, Send, CheckCircle, Calculator, Info, Search, ShieldCheck, RefreshCw, MapPin, Navigation
} from 'lucide-react';

interface CustomerViewProps {
  activeTab: 'dashboard' | 'create' | 'tracking';
  setActiveTab: (tab: 'dashboard' | 'create' | 'tracking') => void;
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  id?: string;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  activeTab,
  setActiveTab,
  selectedOrderId,
  setSelectedOrderId,
  id
}) => {
  const { currentUser, orders, createOrder, confirmOrder, rescheduleDelivery, zones, rateCard } = useApp();

  // Search/Filter State
  const [filterStatus, setFilterStatus] = useState<DeliveryStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Form Booking States
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropAddress, setDropAddress] = useState('');
  const [length, setLength] = useState<number>(20);
  const [width, setWidth] = useState<number>(15);
  const [height, setHeight] = useState<number>(10);
  const [weight, setWeight] = useState<number>(1.5);
  const [orderType, setOrderType] = useState<'B2B' | 'B2C'>('B2C');
  const [paymentType, setPaymentType] = useState<'Prepaid' | 'COD'>('Prepaid');
  const [selectedZone, setSelectedZone] = useState('Zone Alpha');

  // Preview Order for Confirm Screen
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);

  // Reschedule Date Modal States
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleOrderId, setRescheduleOrderId] = useState<string | null>(null);

  // Validation Error States
  const [formError, setFormError] = useState('');

  // Filter customer's own orders
  const myOrders = orders.filter(o => o.customerEmail === currentUser?.email);

  const filteredOrders = myOrders.filter(o => {
    const matchesStatus = filterStatus === 'All' || o.status === filterStatus;
    const matchesSearch = o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.dropAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.pickupAddress.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const activeTrackingOrder = orders.find(o => o.id === selectedOrderId);

  // Dashboard Stats
  const totalBooked = myOrders.length;
  const inTransitCount = myOrders.filter(o => ['Picked Up', 'In Transit', 'Out for Delivery'].includes(o.status)).length;
  const deliveredCount = myOrders.filter(o => o.status === 'Delivered').length;
  const failedCount = myOrders.filter(o => o.status === 'Failed').length;

  // Handle Form Submission -> Generates Preview
  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!pickupAddress.trim() || !dropAddress.trim()) {
      setFormError('Pickup and drop-off addresses cannot be blank.');
      return;
    }

    if (length <= 0 || width <= 0 || height <= 0 || weight <= 0) {
      setFormError('Dimensions and weight must be greater than zero.');
      return;
    }

    // Call context to get a compiled Order draft
    const draft = createOrder({
      customerName: currentUser?.name || 'Valued Customer',
      customerEmail: currentUser?.email || 'customer@tracker.com',
      customerPhone: currentUser?.phone || '+1 555-0199',
      pickupAddress,
      dropAddress,
      length,
      width,
      height,
      weight,
      orderType,
      paymentType,
      zone: selectedZone,
      assignedAgentId: 'agent-1' // Default first agent auto-assigned
    });

    setPreviewOrder(draft);
  };

  // Confirm booking
  const handleConfirmBooking = () => {
    if (previewOrder) {
      confirmOrder(previewOrder);
      setSelectedOrderId(previewOrder.id);
      
      // Reset fields
      setPickupAddress('');
      setDropAddress('');
      setLength(20);
      setWidth(15);
      setHeight(10);
      setWeight(1.5);
      setPreviewOrder(null);
      setFormError('');

      // Navigate to Tracking
      setActiveTab('tracking');
    }
  };

  // Trigger reschedule modal
  const openRescheduleModal = (orderId: string) => {
    setRescheduleOrderId(orderId);
    setRescheduleDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]); // Tomorrow
    setRescheduleModalOpen(true);
  };

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rescheduleOrderId && rescheduleDate) {
      rescheduleDelivery(rescheduleOrderId, rescheduleDate);
      setRescheduleModalOpen(false);
      setRescheduleOrderId(null);
    }
  };

  return (
    <div id={id || "customer-view-container"} className="space-y-6">
      
      {/* -------------------- SHIPMENTS DASHBOARD -------------------- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          {/* Dashboard Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Orders</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-bold text-slate-800">{totalBooked}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">In Transit</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-bold text-slate-800">{inTransitCount}</span>
                  <span className="text-[10px] font-bold text-blue-600 font-mono">Live</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Delivered</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-bold text-slate-800">{deliveredCount}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Failed Trips</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-bold text-slate-800">{failedCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Table / Grid Controls */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Order ID or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1.5">STATUS:</span>
              {(['All', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Failed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition ${filterStatus === st ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Grid */}
          {filteredOrders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredOrders.map((ord) => (
                <OrderCard
                  key={ord.id}
                  order={ord}
                  actionLabel="Track Live Status"
                  onActionClick={() => {
                    setSelectedOrderId(ord.id);
                    setActiveTab('tracking');
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No shipments found</h3>
              <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or book a new shipment.</p>
              <button
                onClick={() => setActiveTab('create')}
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
              >
                Book Your First Package
              </button>
            </div>
          )}
        </div>
      )}

      {/* -------------------- BOOK DELIVERY FORM -------------------- */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
          
          {/* Main Input Form */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-100 p-6 shadow-xs">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Book a New Delivery</h2>
            <p className="text-xs text-slate-500 mb-6">Enter detailed physical parameters and destination coordinates below to route your shipment.</p>
            
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-lg font-medium mb-5">
                {formError}
              </div>
            )}

            <form onSubmit={handleBookingSubmit} className="space-y-5">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Service Zone
                  </label>
                  <select
                    value={selectedZone}
                    onChange={(e) => setSelectedZone(e.target.value)}
                    className="block w-full text-sm border border-slate-200 rounded-lg p-2 bg-white focus:outline-hidden focus:border-blue-500"
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
                    Pickup Full Address
                  </label>
                  <input
                    type="text"
                    required
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="E.g. Unit 4, Greenwood Block, Sector Alpha, Metro City"
                    className="block w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Drop-off Full Address
                  </label>
                  <input
                    type="text"
                    required
                    value={dropAddress}
                    onChange={(e) => setDropAddress(e.target.value)}
                    placeholder="E.g. Apartment 12, Floor 3, Summit Plaza, Zone Alpha"
                    className="block w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Dimensions and Weight */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Package Metrics & Weight
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">L (cm)</span>
                    <input
                      type="number"
                      min="1"
                      required
                      value={length}
                      onChange={(e) => setLength(parseInt(e.target.value) || 0)}
                      className="block w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">W (cm)</span>
                    <input
                      type="number"
                      min="1"
                      required
                      value={width}
                      onChange={(e) => setWidth(parseInt(e.target.value) || 0)}
                      className="block w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">H (cm)</span>
                    <input
                      type="number"
                      min="1"
                      required
                      value={height}
                      onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
                      className="block w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Weight (kg)</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={weight}
                      onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                      className="block w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Volumetric Weight: {((length * width * height) / 5000).toFixed(2)} kg (chargeable is the higher value)
                </span>
              </div>

              {/* Payment selection */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentType('Prepaid')}
                    className={`py-2 px-1 text-xs font-semibold border rounded-lg transition ${paymentType === 'Prepaid' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-slate-600 border-slate-200'}`}
                  >
                    Prepaid (Digital Wallet)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('COD')}
                    className={`py-2 px-1 text-xs font-semibold border rounded-lg transition ${paymentType === 'COD' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-slate-600 border-slate-200'}`}
                  >
                    Cash on Delivery (COD)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                <Calculator className="w-4 h-4" />
                Calculate Charges & Review Invoice
              </button>
            </form>
          </div>

          {/* Pricing Preview Summary Card */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-[0.03] pointer-events-none">
                <Calculator className="w-64 h-64" />
              </div>

              <h3 className="text-sm font-mono font-bold text-slate-400 tracking-widest uppercase mb-4">Invoice Summary</h3>

              {previewOrder ? (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block">DESTINATION ROUTE</span>
                    <span className="text-sm font-semibold text-white truncate block">{previewOrder.dropAddress}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Charger Profile</span>
                      <span className="text-slate-200 font-bold">{previewOrder.orderType} Shipment</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Chargeable Weight</span>
                      <span className="text-slate-200 font-bold">
                        {Math.max(previewOrder.weight, (previewOrder.length * previewOrder.width * previewOrder.height) / 5000).toFixed(1)} kg
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-4 border-t border-slate-800">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Base Routing Rate ({previewOrder.orderType})</span>
                      <span>${(previewOrder.charge - (previewOrder.paymentType === 'COD' ? rateCard.codSurcharge[previewOrder.orderType] : 0)).toFixed(2)}</span>
                    </div>
                    {previewOrder.paymentType === 'COD' && (
                      <div className="flex justify-between text-xs text-amber-400 font-medium">
                        <span>COD Cash Handling Surcharge</span>
                        <span>+${rateCard.codSurcharge[previewOrder.orderType].toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Fuel & Toll surcharge</span>
                      <span className="text-emerald-500">Free Promo</span>
                    </div>

                    <div className="flex justify-between text-md pt-3 border-t border-dashed border-slate-800 font-semibold text-white">
                      <span>Grand Total</span>
                      <span className="text-lg text-blue-400 font-bold">${previewOrder.charge.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="pt-4 space-y-2">
                    <button
                      onClick={handleConfirmBooking}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs shadow-sm transition flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Confirm Booked Delivery
                    </button>
                    <button
                      onClick={() => setPreviewOrder(null)}
                      className="w-full py-2 bg-transparent hover:bg-slate-850 text-slate-400 hover:text-slate-200 text-[11px] font-semibold rounded transition"
                    >
                      Reset Draft
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calculator className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-xs text-slate-400 font-mono">Book details first. A detailed itemized invoice calculation will compile here instantly.</p>
                </div>
              )}
            </div>

            {/* Quick Informational Guide */}
            <div className="bg-white rounded-xl border border-slate-100 p-4 text-xs text-slate-500 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800 mb-0.5">How are shipping charges calculated?</p>
                <p className="leading-relaxed">
                  We use active rate cards which adjust for B2B or B2C shipment types.
                  Charges assess the higher value between the package's <strong>actual weight</strong> and its <strong>volumetric weight</strong> (calculated as length × width × height / 5000), which protects delivery aircraft slots. COD payments include a minor handling surcharge.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- LIVE TRACKING VIEW -------------------- */}
      {activeTab === 'tracking' && (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
          {activeTrackingOrder ? (
            <Timeline
              order={activeTrackingOrder}
              onRescheduleClick={() => openRescheduleModal(activeTrackingOrder.id)}
            />
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-100 shadow-xs">
              <Navigation className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No active tracking target</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Please select any active order card from your dashboard to view its realtime courier timestamps and logistics logs.
              </p>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="mt-4 text-xs font-semibold bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition"
              >
                Go to Shipment Dashboard
              </button>
            </div>
          )}
        </div>
      )}

      {/* -------------------- DATE PICKER RESCHEDULE MODAL -------------------- */}
      {rescheduleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">Reschedule Delivery Attempt</h3>
              <button
                onClick={() => setRescheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-mono text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Choose a preferred date when our dispatch driver Robert can return to complete collection or drop-off safely. This clears the <strong>Failed</strong> trip status back to <strong>Ready for pickup</strong> retry state.
              </p>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  New Delivery Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} // Min is tomorrow
                    className="block w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setRescheduleModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition flex items-center gap-1 shadow-sm"
                >
                  <Calendar className="w-4 h-4" />
                  Confirm Date Selection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
