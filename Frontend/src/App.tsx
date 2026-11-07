import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage/HomePage'
import LoginPage from './pages/LoginPage/LoginPage'
import ContestPage from './pages/ContestPage/ContestPage'
import JoinPage from './pages/JoinPage/JoinPage'
import RegisterPage from './pages/RegisterPage/RegisterPage'
import { RegisterChoiceProvider } from './components/RegisterChoice/RegisterChoice'

export default function App() {
  return (
    <BrowserRouter>
      <RegisterChoiceProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/contest/:id" element={<ContestPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/join/:token" element={<JoinPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<Navigate to="/" replace />} />
        <Route path="/register/:role" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </RegisterChoiceProvider>
    </BrowserRouter>
  )
}
