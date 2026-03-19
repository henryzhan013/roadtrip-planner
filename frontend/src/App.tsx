import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TripProvider } from './context/TripContext';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { PlanPage } from './pages/PlanPage';
import { TripsPage } from './pages/TripsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AboutPage } from './pages/AboutPage';
import { ProfilePage } from './pages/ProfilePage';
import { ExplorePage } from './pages/ExplorePage';
import { TripDetailsPage } from './pages/TripDetailsPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import 'leaflet/dist/leaflet.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <TripProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/plan" element={<PlanPage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route
                  path="/trips"
                  element={
                    <ProtectedRoute>
                      <TripsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/trips/:tripId"
                  element={
                    <ProtectedRoute>
                      <TripDetailsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>
            </Routes>
          </TripProvider>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
