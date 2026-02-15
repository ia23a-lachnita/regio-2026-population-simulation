import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Home } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import HomePage from './pages/HomePage';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const NavItem = ({ to, icon: Icon, children }: { to: string, icon: any, children: React.ReactNode }) => (
  <NavLink
    to={to}
    className={({ isActive }) => cn(
      "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
      isActive ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
    )}
  >
    <Icon size={20} />
    <span className="font-medium">{children}</span>
  </NavLink>
);

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-800 flex flex-col p-4 gap-6">
          <div className="px-4 py-2">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              Competition App
            </h1>
          </div>

          <nav className="flex flex-col gap-2">
            <NavItem to="/" icon={Home}>Home</NavItem>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-slate-900/50">
          <Routes>
            <Route path="/" element={<HomePage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
