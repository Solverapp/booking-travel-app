import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './componets/ProtectedRoute.jsx';


import './styles/main.css'

import Home from './pages/home.jsx';
import Hotels from './pages/hotels.jsx';
import Tours from './pages/tours.jsx';
import Flights from './pages/flights.jsx';

import Hotelnewpage from './pages/hotelnewpage.jsx';
import Tourpage from './pages/tourpage.jsx';
import TourBokpage from './pages/tourbookpage.jsx';
import ScrollToTop from './utils/scroll.js';
import Login from './pages/login.jsx';
import Register from './pages/register.jsx';
import ProfilePage from './pages/profilePage.jsx'; 
import CheckoutPage from './pages/checkoutpage.jsx';
import ConfirmationPage from './pages/confirmation.jsx'
import FlightPage from './pages/flightpage.jsx';
import FlightCheckoutPage from './pages/flightcheckout.jsx';
import FlightConfirmationPage from './pages/flightconfirmation.jsx';

function App() {
  

  return (
    <div className="App">
      <AuthProvider>
        <Router>
        <ScrollToTop/>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/hotels" element={<Hotels />} />
         
          <Route path="/hotelpage/:id" element={<Hotelnewpage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/confirmation" element={<ConfirmationPage />} />
          <Route path="/tours" element={<Tours />} />
          <Route path="/flights" element={<Flights />} />
          <Route 
            path="/flightpage/:sessionId" 
            element={
              <ProtectedRoute>
                <FlightPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/flightcheckout/:sessionId" 
            element={
              <ProtectedRoute>
                <FlightCheckoutPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/flightconfirmation" 
            element={
              <ProtectedRoute>
                <FlightConfirmationPage />
              </ProtectedRoute>
            } 
          />
          <Route path="/tourspage/:id" element={<Tourpage />} />
          <Route path="/toursbookpage/" element={<TourBokpage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
      </AuthProvider>
      
    </div>
  );
}

export default App
