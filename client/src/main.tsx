import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import { AppProvider } from './AppContext';
import { Layout } from './components/Layout';
import { Overview } from './pages/Overview';
import { Tasks } from './pages/Tasks';
import { DataPage } from './pages/DataPage';
import { Profiling } from './pages/Profiling';
import { Optimizations } from './pages/Optimizations';
import { Comparison } from './pages/Comparison';
import { Operations } from './pages/Operations';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Overview />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/data" element={<DataPage />} />
            <Route path="/profiling" element={<Profiling />} />
            <Route path="/optimizations" element={<Optimizations />} />
            <Route path="/comparison" element={<Comparison />} />
            <Route path="/operations" element={<Operations />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  </StrictMode>
);
