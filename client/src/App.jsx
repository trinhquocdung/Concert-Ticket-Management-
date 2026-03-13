import React from 'react'
import Navbar from './components/Navbar'
// CategoryBar and FilterBar are included where needed in pages (Home).
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Search from "./pages/Search";
import CategoryPage from './pages/CategoryPage'
import EventDetail from './pages/EventDetail/index'
import PaymentFlow from './pages/PaymentFlow'
import Profile from './pages/Profile'
import MyTickets from './pages/MyTickets'
import OrderHistory from './pages/OrderHistory'
import OrderDetail from './pages/OrderDetail'
import OrderSeat from './pages/OrderSeat'
import FillInfo from './pages/FillInfo'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentFailed from './pages/PaymentFailed'
import Footer from './components/Footer'

const App = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <Routes>
          <Route path='/' element={<Home/>} />
          <Route path="/search" element={<Search />} />
          <Route path='/category/:slug' element={<CategoryPage />} />
          <Route path='/event/:id' element={<EventDetail />} />
          <Route path='/order/:id' element={<OrderSeat />} />
          <Route path='/payment' element={<PaymentFlow />} />
          <Route path='/payment/success' element={<PaymentSuccess />} />
          <Route path='/payment/failed' element={<PaymentFailed />} />
          <Route path='/fillinfo' element={<FillInfo />} />
          <Route path='/profile' element={<Profile />} />
          <Route path='/my-tickets' element={<MyTickets />} />
          <Route path='/orders' element={<OrderHistory />} />
          <Route path='/orders/:id' element={<OrderDetail />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App