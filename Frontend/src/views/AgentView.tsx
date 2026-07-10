import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Order, DeliveryStatus } from '../types';
import { OrderCard } from '../components/OrderCard';
import { StatusBadge } from '../components/StatusBadge';
import { Timeline } from '../components/Timeline';
import {
  Package, MapPin, Phone, DollarSign, Edit3, CheckCircle, XCircle, ChevronRight, Truck, Info, Navigation, Play, AlertTriangle
} from 'lucide-react';

interface AgentViewProps {
  activeTab: 'dashboard' | 'detail';
  setActiveTab: (tab: 'dashboard' | 'detail') => void;
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  id?: string;
}

export const AgentView: React.FC<AgentViewProps> = ({
  activeTab,
  setActiveTab,
  selectedOrderId,
  setSelectedOrderId,
  id
}) => {
  const { currentUser, orders, updateOrderStatus } = useApp();
  const [filterMode, setFilterMode] = useState<'pending' | 'completed'>('pending');
  const [customNote, setCustomNote] = useState('');
  const [noteError, setNoteError] = useState('');

  // Get orders assigned to this agent (or Robert Chen's if mock user doesn't match ID)
  // Robert Chen has id 'agent-1'
  const agentId = currentUser?.id === 'agent-1-user' ? 'agent-1' : currentUser?.id === 'agent-2-user' ? 'agent-2' : 'agent-1';

  const myOrders = orders.filter(o => o.assignedAgentId === agentId);

  // Divide into pending and completed
  const pendingOrders = myOrders.filter(o => ['Picked Up', 'In Transit', 'Out for Delivery'].includes(o.status));
  const completedOrders = myOrders.filter(o => ['Delivered', 'Failed'].includes(o.status));

  const activeWorklist = filterMode === 'pending' ? pendingOrders : completedOrders;

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  // Handle status updating
  const handleStatusChange = (newStatus: DeliveryStatus, defaultNotes: string) => {
    if (!selectedOrderId) return;
    setNoteError('');

    const finalNote = customNote.trim() ? customNote.trim() : defaultNotes;
    
    // Perform update
    updateOrderStatus(selectedOrderId, newStatus, finalNote);
    
    // Clear note text box
    setCustomNote('');
  };

  return (
    <div id={id || "agent-view-container"} className="space-y-6">
      
      {/* -------------------- WORKLIST DASHBOARD -------------------- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Agent Header Metric */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-widest">Active Dispatcher</span>
              <h2 className="text-xl font-bold tracking-tight">{currentUser?.name}</h2>
              <p className="text-xs text-slate-300 mt-1">Zone: <strong className="text-blue-400">Zone Alpha / Beta Support</strong></p>
            </div>
            
            <div className="flex gap-4">
              <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/50 min-w-[100px] text-center">
                <span className="text-[9px] font-mono text-slate-500 block uppercase">PENDING TRIPS</span>
                <span className="text-lg font-bold text-amber-400">{pendingOrders.length}</span>
              </div>
              <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/50 min-w-[100px] text-center">
                <span className="text-[9px] font-mono text-slate-500 block uppercase">COMPLETED</span>
                <span className="text-lg font-bold text-emerald-400">{completedOrders.length}</span>
              </div>
            </div>
          </div>

          {/* Tab switches for Work List */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setFilterMode('pending')}
              className={`py-3 px-6 text-sm font-semibold border-b-2 transition ${filterMode === 'pending' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              My Open Tasks ({pendingOrders.length})
            </button>
            <button
              onClick={() => setFilterMode('completed')}
              className={`py-3 px-6 text-sm font-semibold border-b-2 transition ${filterMode === 'completed' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              Historical Runs ({completedOrders.length})
            </button>
          </div>

          {/* Cards list */}
          {activeWorklist.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {activeWorklist.map((ord) => (
                <OrderCard
                  key={ord.id}
                  order={ord}
                  actionLabel="Open Update Console"
                  onActionClick={() => {
                    setSelectedOrderId(ord.id);
                    setActiveTab('detail');
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">Clear worklist!</h3>
              <p className="text-xs text-slate-500 mt-1">There are no orders matching this filter in your assigned sector.</p>
            </div>
          )}

        </div>
      )}

      {/* -------------------- ORDER STATUS UPDATE CONSOLE -------------------- */}
      {activeTab === 'detail' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
          
          {selectedOrder ? (
            <>
              {/* Left Column: Courier Manifest & Addresses */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Back button */}
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                >
                  ← Back to Worklist
                </button>

                {/* Manifest Summary */}
                <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block">DELIVERY COURIER MANIFEST</span>
                      <h3 className="text-lg font-bold text-slate-800">{selectedOrder.id}</h3>
                    </div>
                    <StatusBadge status={selectedOrder.status} />
                  </div>

                  {/* Customer Information card */}
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 space-y-3">
                    <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider">RECIPIENT SPECS</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block">Name</span>
                        <span className="font-semibold text-slate-700 block">{selectedOrder.customerName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Contact Phone</span>
                        <a href={`tel:${selectedOrder.customerPhone}`} className="text-blue-600 hover:underline font-semibold block flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {selectedOrder.customerPhone}
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Addresses */}
                  <div className="space-y-4 pt-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider mb-1">A) PICKUP POINT</span>
                      <p className="text-xs text-slate-700 font-medium bg-amber-50/40 p-2.5 rounded-lg border border-amber-100/50">
                        {selectedOrder.pickupAddress}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider mb-1">B) DELIVERY DROP</span>
                      <p className="text-xs text-slate-700 font-medium bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100/50">
                        {selectedOrder.dropAddress}
                      </p>
                    </div>
                  </div>

                  {/* COD Cash Surcharge indicator */}
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block uppercase">COD / Prepaid Type</span>
                        <span className="text-xs font-bold text-slate-800">{selectedOrder.paymentType}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">COLLECT AMOUNT</span>
                      <span className={`text-md font-extrabold ${selectedOrder.paymentType === 'COD' ? 'text-amber-700' : 'text-slate-500'}`}>
                        {selectedOrder.paymentType === 'COD' ? `$${selectedOrder.charge.toFixed(2)}` : '$0.00'}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Vertical Stepper Timeline Component */}
                <Timeline order={selectedOrder} />

              </div>

              {/* Right Column: Status Update Controls */}
              <div className="lg:col-span-5 space-y-6">
                
                <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-xs sticky top-4">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-4">Dispatcher Operations</h3>
                  
                  {/* Driver Note Field */}
                  <div className="mb-6">
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Dispatcher Remarks / Customer Log
                    </label>
                    <textarea
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                      placeholder="E.g. Package left with concierge at Block A..."
                      rows={3}
                      className="block w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-hidden focus:border-blue-500 focus:bg-white resize-none"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">
                      If left blank, a standard logistics description will be generated.
                    </span>
                  </div>

                  {/* Stepper buttons conditional on current state */}
                  <div className="space-y-4">
                    <span className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                      Step transitions
                    </span>

                    {selectedOrder.status === 'Picked Up' && (
                      <button
                        onClick={() => handleStatusChange('In Transit', 'Package sorted and loaded. In transit to sector distribution hub.')}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Dispatched in Hub (Mark "In Transit")
                      </button>
                    )}

                    {selectedOrder.status === 'In Transit' && (
                      <button
                        onClick={() => handleStatusChange('Out for Delivery', 'Package assigned to dispatch courier. Out for final delivery loop.')}
                        className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center justify-center gap-2"
                      >
                        <Truck className="w-4 h-4" />
                        Load into Courier Van (Mark "Out for Delivery")
                      </button>
                    )}

                    {selectedOrder.status === 'Out for Delivery' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={() => handleStatusChange('Delivered', 'Package handed over to customer. Recipient signature logged.')}
                          className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Mark Delivered
                        </button>
                        <button
                          onClick={() => handleStatusChange('Failed', 'Delivery attempt failed. Recipient not present / unreachable.')}
                          className="py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" />
                          Mark Failed Attempt
                        </button>
                      </div>
                    )}

                    {['Delivered', 'Failed'].includes(selectedOrder.status) && (
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg text-center">
                        <Info className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                        <span className="text-xs font-bold text-slate-700 block">Courier Task Complete</span>
                        <p className="text-[11px] text-slate-500 mt-1">
                          This shipment is in a terminal status ({selectedOrder.status}). Status updates are locked until customer or admin schedules action.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </>
          ) : (
            <div className="col-span-12 text-center py-16 bg-white rounded-xl border border-slate-100 shadow-xs">
              <Navigation className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No active courier task selected</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Please select an active order card from your open tasks dashboard list.
              </p>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="mt-4 text-xs font-semibold bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition"
              >
                Go to Tasks Worklist
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
