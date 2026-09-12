import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { AuthForm } from './components/AuthForm.tsx';
import { TaskDashboard } from './components/TaskDashboard.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { ProfileModal } from './components/ProfileModal.tsx';
import { ArchitectureDocsModal } from './components/ArchitectureDocsModal.tsx';
import { ToastContainer } from './components/Toast.tsx';
import { ToastMessage } from './types.ts';
import { Database } from 'lucide-react';

function AppContent() {
  const { user, isLoading } = useAuth();

  const [currentTab, setCurrentTab] = useState<'tasks' | 'admin'>('tasks');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Loading state while checking token verification
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-200">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shadow-md animate-pulse border border-transparent dark:border-slate-700">
            <Database className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Connecting to PostgreSQL</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Verifying JWT session credentials...</p>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, render login/registration form
  if (!user) {
    return (
      <>
        <AuthForm
          onSuccessToast={(msg) => addToast(msg, 'success')}
          onOpenDocs={() => setIsDocsOpen(true)}
        />
        <ArchitectureDocsModal
          isOpen={isDocsOpen}
          onClose={() => setIsDocsOpen(false)}
          onSuccessToast={(msg) => addToast(msg, 'success')}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          if (tab === 'admin' && user.role !== 'admin') {
            addToast('Access denied: Admin role required.', 'error');
            return;
          }
          setCurrentTab(tab);
        }}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenDocs={() => setIsDocsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {currentTab === 'admin' && user.role === 'admin' ? (
          <AdminPanel
            onSuccessToast={(msg) => addToast(msg, 'success')}
            onErrorToast={(msg) => addToast(msg, 'error')}
          />
        ) : (
          <TaskDashboard
            onSuccessToast={(msg) => addToast(msg, 'success')}
            onErrorToast={(msg) => addToast(msg, 'error')}
          />
        )}
      </main>

      {/* User Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSuccessToast={(msg) => addToast(msg, 'success')}
      />

      {/* Architecture & API Docs Modal */}
      <ArchitectureDocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
        onSuccessToast={(msg) => addToast(msg, 'success')}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

