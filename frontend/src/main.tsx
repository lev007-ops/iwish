import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import { AdminApp } from './pages/admin/AdminApp'
import { PublicPage } from './pages/PublicPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="*" element={<PublicPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
