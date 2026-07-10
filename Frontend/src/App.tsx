import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthView } from './views/AuthView';
import { CustomerView } from './views/CustomerView';
import { AgentView } from './views/AgentView';
import { AdminView } from './views/AdminView';
import { NavigationLayout } from './components/NavigationLayout';

function AppContent() {
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Monitor role switching to reset tab routing safely and clear stale states
  useEffect(() => {
    setActiveTab('dashboard');
    setSelectedOrderId(null);
  }, [currentUser?.role]);

  // If not logged in, show Auth Portal gate
  if (!currentUser) {
    return <AuthView onSuccess={() => setActiveTab('dashboard')} />;
  }

  // Render correct dashboard screen according to logged-in persona
  const renderView = () => {
    switch (currentUser.role) {
      case 'Admin':
        return (
          <AdminView
            activeTab={activeTab as any}
            setActiveTab={setActiveTab as any}
          />
        );
      case 'Delivery Agent':
        return (
          <AgentView
            activeTab={activeTab as any}
            setActiveTab={setActiveTab as any}
            selectedOrderId={selectedOrderId}
            setSelectedOrderId={setSelectedOrderId}
          />
        );
      case 'Customer':
      default:
        return (
          <CustomerView
            activeTab={activeTab as any}
            setActiveTab={setActiveTab as any}
            selectedOrderId={selectedOrderId}
            setSelectedOrderId={setSelectedOrderId}
          />
        );
    }
  };

  return (
    <NavigationLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      selectedOrderId={selectedOrderId}
    >
      {renderView()}
    </NavigationLayout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
