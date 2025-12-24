import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SimulationControl } from '@/components/sre/SimulationControl';

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64">
        <Header />
        <div className="px-6 pt-4">
          <SimulationControl />
        </div>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
