import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { useAppContext } from '../../context/AppContext';

export function Layout() {
  const { toasts } = useAppContext();

  return (
    <div className="app-layout">
      <Navbar />

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              {toast.type === 'success' ? '✓' : '!'} {toast.message}
            </div>
          ))}
        </div>
      )}

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
