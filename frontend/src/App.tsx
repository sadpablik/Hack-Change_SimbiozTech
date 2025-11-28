import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { ToastContainer } from './components/common/Toast';
import { HomePage } from './pages/HomePage';
import { AnalysisPage } from './pages/AnalysisPage';
import { DashboardPage } from './pages/DashboardPage';
import { ValidationPage } from './pages/ValidationPage';
import { HelpPage } from './pages/HelpPage';
import { useTheme } from './hooks/useTheme';
import './styles/index.css';

function App() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900`}>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/analysis/:sessionId" element={<AnalysisPage />} />
              <Route path="/dashboard/:sessionId" element={<DashboardPage />} />
              <Route path="/validation" element={<ValidationPage />} />
              <Route path="/help" element={<HelpPage />} />
            </Routes>
          </main>
          <Footer />
          <ToastContainer />
        </div>
      </BrowserRouter>
    </div>
  );
}

export default App;
