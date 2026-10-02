import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { LoginScreen } from './components/LoginScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { TransactionFeedScreen } from './components/TransactionFeedScreen';
import { SettlementScreen } from './components/SettlementScreen';
import { ActivityLogsScreen } from './components/ActivityLogsScreen';
import { AddMealModal } from './components/AddMealModal';
import { ChangePinModal } from './components/ChangePinModal';
import { ToastContainer, showToast } from './components/Toast';
import { RefreshCw, UtensilsCrossed } from 'lucide-react';

function MainApp() {
  const { currentUser, isLoading: authLoading, refreshUsers } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'feed' | 'logs' | 'settlement' | 'admin'
  const [isAddMealOpen, setIsAddMealOpen] = useState(false);
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  
  // Data states
  const [activeCycle, setActiveCycle] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [meals, setMeals] = useState([]);
  const [settlementData, setSettlementData] = useState(null);
  const [cookingData, setCookingData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Load all core data
  const loadData = useCallback(async () => {
    if (!currentUser) return;

    setDataLoading(true);
    try {
      const [cycle, dash, allMeals, settle, duty, logList] = await Promise.all([
        api.getCurrentCycle(),
        api.getDashboard(currentUser.id),
        api.getMeals(),
        api.getSettlement(),
        api.getCookingDuty(currentUser.id),
        api.getLogs({ limit: 150 })
      ]);

      setActiveCycle(cycle);
      setDashboardData(dash);
      setMeals(allMeals);
      setSettlementData(settle);
      setCookingData(duty);
      setLogs(logList || []);
    } catch (err) {
      console.error('Failed to load mess data', err);
      showToast('Could not sync latest mess data. Check connection.', 'error');
    } finally {
      setDataLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, loadData]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white mb-3 shadow-glow-green animate-pulse">
          <UtensilsCrossed className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium">Initializing Hostel Mess...</p>
      </div>
    );
  }

  // Not logged in -> Show Login Screen
  if (!currentUser) {
    return (
      <>
        <ToastContainer />
        <LoginScreen />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white pb-24 sm:pb-20">
      <ToastContainer />

      {/* Top Navbar */}
      <Navbar
        activeCycle={activeCycle}
        onOpenCycleModal={() => setActiveTab('settlement')}
        onOpenChangePin={() => setIsChangePinOpen(true)}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* Main Content Area (Mobile First Container) */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-3.5 py-4">
        {activeTab === 'dashboard' && (
          <DashboardScreen
            dashboardData={dashboardData}
            cookingData={cookingData}
            recentLogs={logs}
            onOpenAddMeal={() => setIsAddMealOpen(true)}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onRefresh={loadData}
            isLoading={dataLoading}
          />
        )}

        {activeTab === 'feed' && (
          <TransactionFeedScreen
            meals={meals}
            onRefresh={loadData}
            activeCycle={activeCycle}
          />
        )}

        {activeTab === 'logs' && (
          <ActivityLogsScreen
            onRefreshOverall={loadData}
          />
        )}

        {(activeTab === 'settlement' || activeTab === 'admin') && (
          <SettlementScreen
            settlementData={settlementData}
            cookingData={cookingData}
            onRefresh={loadData}
            activeCycle={activeCycle}
          />
        )}
      </main>

      {/* Mobile-first Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onOpenAddMeal={() => setIsAddMealOpen(true)}
      />

      {/* Modal: + Record New Meal */}
      <AddMealModal
        isOpen={isAddMealOpen}
        onClose={() => setIsAddMealOpen(false)}
        cookingData={cookingData}
        onSuccess={() => {
          loadData();
          setActiveTab('feed');
        }}
      />

      {/* Modal: Change Current User's PIN */}
      {isChangePinOpen && currentUser && (
        <ChangePinModal
          targetUser={currentUser}
          isOpen={isChangePinOpen}
          onClose={() => setIsChangePinOpen(false)}
          onSuccess={() => {
            setIsChangePinOpen(false);
            refreshUsers();
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
