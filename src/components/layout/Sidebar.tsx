import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Activity,
  FileText,
  AlertTriangle,
  Bell,
  Settings,
  Server,
  Target,
  LogOut,
  User,
  FlaskConical,
} from 'lucide-react';

const isDev = import.meta.env.DEV;

const navigation = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Services', href: '/services', icon: Server },
  { name: 'Metrics', href: '/metrics', icon: Activity },
  { name: 'Logs', href: '/logs', icon: FileText },
  { name: 'Incidents', href: '/incidents', icon: AlertTriangle },
  { name: 'Alerts', href: '/alerts', icon: Bell },
  { name: 'SLOs', href: '/slos', icon: Target },
];

const bottomNavigation = [
  ...(isDev ? [{ name: 'Test Panel', href: '/test-panel', icon: FlaskConical, isDev: true }] : []),
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
          <Activity className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">SRE Platform</span>
          <span className="text-xs text-muted-foreground font-mono">v1.0.0</span>
        </div>
      </div>

      {/* Status indicator */}
      <div className="mx-4 mt-4 rounded-md bg-secondary/50 px-3 py-2 border border-border">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-status-healthy animate-pulse" />
          <span className="text-xs text-muted-foreground">Real-time connected</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
              )}
            >
              <item.icon className={cn('h-4 w-4', isActive && 'text-primary')} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom navigation */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {bottomNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground',
                'isDev' in item && 'border border-dashed border-status-warning/50'
              )}
            >
              <item.icon className={cn('h-4 w-4', 'isDev' in item && 'text-status-warning')} />
              {item.name}
              {'isDev' in item && (
                <span className="ml-auto text-[10px] text-status-warning font-mono">DEV</span>
              )}
            </Link>
          );
        })}
        
        {/* User info and logout */}
        <div className="flex items-center justify-between px-3 py-2 rounded-md bg-secondary/30">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
              {user?.email}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleSignOut}
          >
            <LogOut className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
