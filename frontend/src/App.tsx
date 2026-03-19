import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TripProvider } from './context/TripContext';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { PlanPage } from './pages/PlanPage';
import { TripsPage } from './pages/TripsPage';
import 'leaflet/dist/leaflet.css';

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <TripProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/plan" element={<PlanPage />} />
              <Route path="/trips" element={<TripsPage />} />
            </Route>
          </Routes>
        </TripProvider>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
