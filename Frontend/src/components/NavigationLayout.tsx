import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Menu, X, LogOut, LayoutDashboard, PlusCircle, Navigation, Map, DollarSign, Users, ShieldAlert, Truck, User as UserIcon
} from 'lucide-react';

interface NavigationLayoutProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  selectedOrderId: string | null;
  children: React.ReactNode;
  id?: string;
}

export const NavigationLayout: React.FC<NavigationLayoutProps> = ({
  activeTab,
  setActiveTab,
  selectedOrderId,
  children,
  id
}) => {
  const { currentUser, logout, login, orders } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!currentUser) return <>{children}</>;

  // Filter orders related to counts
  const customerOrders = orders.filter(o => o.customerEmail === currentUser.email);
  const activeCustomerOrdersCount = customerOrders.filter(o => ['Picked Up', 'In Transit', 'Out for Delivery'].includes(o.status)).length;

  const agentOrders = orders.filter(o => o.assignedAgentId === currentUser.id || o.assignedAgentId === 'agent-1'); // Robert Chen / fallback
  const activeAgentOrdersCount = agentOrders.filter(o => ['Picked Up', 'In Transit', 'Out for Delivery'].includes(o.status)).length;

  const totalOrdersCount = orders.length;

  interface NavTab {
    id: string;
    label: string;
    icon: React.ComponentType<any>;
    badge?: number;
    disabled?: boolean;
  }

  // Tabs by Role
  const customerTabs: NavTab[] = [
    { id: 'dashboard', label: 'My Shipments', icon: LayoutDashboard, badge: activeCustomerOrdersCount },
    { id: 'create', label: 'Book Delivery', icon: PlusCircle },
    { id: 'tracking', label: 'Live Tracking', icon: Navigation, disabled: !selectedOrderId },
  ];

  const agentTabs: NavTab[] = [
    { id: 'dashboard', label: 'My Worklist', icon: LayoutDashboard, badge: activeAgentOrdersCount },
    { id: 'detail', label: 'Status Update Console', icon: Truck, disabled: !selectedOrderId },
  ];

  const adminTabs: NavTab[] = [
    { id: 'dashboard', label: 'Control Center', icon: ShieldAlert, badge: totalOrdersCount },
    { id: 'create', label: 'Book on Behalf', icon: PlusCircle },
    { id: 'zones', label: 'Zone Configuration', icon: Map },
    { id: 'rates', label: 'Rate Cards', icon: DollarSign },
    { id: 'agents', label: 'Agent Rostering', icon: Users },
  ];

  const getTabsForRole = () => {
    switch (currentUser.role) {
      case 'Admin':
        return adminTabs;
      case 'Delivery Agent':
        return agentTabs;
      case 'Customer':
      default:
        return customerTabs;
    }
  };

  const tabs = getTabsForRole();

  const handleTabChange = (tabId: string, disabled?: boolean) => {
    if (disabled) return;
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  return (
    <div id={id || "app-layout"} className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-slate-900 text-white shrink-0">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white">SL</div>
          <span className="text-lg font-bold tracking-tight text-white">SwiftLast</span>
        </div>

        {/* Profile Card */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 flex items-center justify-center font-bold text-sm">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-semibold block text-slate-100 truncate">{currentUser.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-medium inline-block mt-0.5">
                {currentUser.role}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                disabled={tab.disabled}
                onClick={() => handleTabChange(tab.id, tab.disabled)}
                className={`w-full flex items-center justify-between px-6 py-3 text-xs font-semibold transition-all relative ${
                  isActive
                    ? 'bg-blue-600 text-white border-r-4 border-white'
                    : tab.disabled
                    ? 'text-slate-600 cursor-not-allowed opacity-40'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center">
                  <IconComponent className="w-4 h-4 shrink-0 mr-3 opacity-80" />
                  <span>{tab.label}</span>
                </div>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${isActive ? 'bg-white text-blue-700' : 'bg-slate-800 text-slate-300'}`}>
                    {tab.badge}
                  </span>
                )}
                {tab.disabled && (
                  <span className="text-[9px] font-mono font-normal opacity-70">
                    select order
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-6 border-t border-slate-800 text-[10px] text-slate-500 font-medium tracking-wider">
          SYSTEM VERSION 2.4.1
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center space-x-8">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition mr-2"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex lg:hidden items-center justify-center font-bold text-white text-xs">SL</div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Operations Command</h2>
            </div>

            {/* Pill-style role switcher */}
            <div className="hidden md:flex bg-slate-100 p-1 rounded-md">
              <button
                onClick={() => { login('customer@tracker.com', 'Customer'); setActiveTab('dashboard'); }}
                className={`px-3 py-1 text-xs font-medium rounded transition-all duration-200 ${currentUser.role === 'Customer' ? 'bg-white shadow-sm text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Customer
              </button>
              <button
                onClick={() => { login('agent1@tracker.com', 'Delivery Agent'); setActiveTab('dashboard'); }}
                className={`px-3 py-1 text-xs font-medium rounded transition-all duration-200 ${currentUser.role === 'Delivery Agent' ? 'bg-white shadow-sm text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Agent
              </button>
              <button
                onClick={() => { login('admin@tracker.com', 'Admin'); setActiveTab('dashboard'); }}
                className={`px-3 py-1 text-xs font-medium rounded transition-all duration-200 ${currentUser.role === 'Admin' ? 'bg-white shadow-sm text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Admin
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right mr-2 hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-tighter">{currentUser.role}</p>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Body */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {children}
        </main>
      </div>

      {/* Mobile Drawer (Sidebar Overlay) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />

          {/* Drawer content */}
          <div className="relative flex flex-col w-64 max-w-xs bg-slate-900 text-white z-10">
            <div className="p-6 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white text-xs">SL</div>
                <span className="font-bold tracking-tight text-md text-white">SwiftLast</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="text-xs font-semibold block text-slate-100">{currentUser.name}</span>
                  <span className="text-[9px] px-1 rounded bg-blue-500/20 text-blue-300 font-mono mt-0.5 inline-block">
                    {currentUser.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    disabled={tab.disabled}
                    onClick={() => handleTabChange(tab.id, tab.disabled)}
                    className={`w-full flex items-center justify-between px-6 py-3 text-xs font-semibold transition-all relative ${
                      isActive
                        ? 'bg-blue-600 text-white border-r-4 border-white'
                        : tab.disabled
                        ? 'text-slate-600 cursor-not-allowed opacity-40'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center">
                      <IconComponent className="w-4 h-4 shrink-0 mr-3 opacity-80" />
                      <span>{tab.label}</span>
                    </div>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-slate-800 text-slate-300">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-800 space-y-3">
              {/* Dev Quick-Switch */}
              <div className="bg-slate-950/60 rounded-lg p-2.5 border border-slate-800/80">
                <span className="text-[9px] font-mono font-bold tracking-wider text-slate-500 block mb-1.5 uppercase">
                  DEMO ROLES
                </span>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => { login('customer@tracker.com', 'Customer'); setActiveTab('dashboard'); setMobileOpen(false); }}
                    className="text-[8px] font-mono py-1 rounded bg-slate-900 text-slate-400 text-center hover:bg-slate-800"
                  >
                    Cust
                  </button>
                  <button
                    onClick={() => { login('agent1@tracker.com', 'Delivery Agent'); setActiveTab('dashboard'); setMobileOpen(false); }}
                    className="text-[8px] font-mono py-1 rounded bg-slate-900 text-slate-400 text-center hover:bg-slate-800"
                  >
                    Agent
                  </button>
                  <button
                    onClick={() => { login('admin@tracker.com', 'Admin'); setActiveTab('dashboard'); setMobileOpen(false); }}
                    className="text-[8px] font-mono py-1 rounded bg-slate-900 text-slate-400 text-center hover:bg-slate-800"
                  >
                    Admin
                  </button>
                </div>
              </div>

              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg text-slate-400 hover:bg-rose-950/20 hover:text-rose-400 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
