/**
 * @layer widgets
 * @segment sidebar
 * @what サイドバーナビゲーション UI コンポーネント
 * @why ロールベースのナビゲーションメニューを表示
 */
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Users,
  ClipboardList,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn, dictionary } from '@/shared/lib';
import { useAuth, type UserRole } from '@/features/auth';
import { ThemeToggle } from '@/features/theme-toggle';
import { Button } from '@/shared/ui';

const nav = dictionary.navigation;
const commonActions = dictionary.common.actions;
const commonUser = dictionary.common.user;

interface MenuItem {
  label: string;
  path: string;
  order: number;
  icon: LucideIcon;
  section?: 'main' | 'admin';
}

const menusByRole: Record<UserRole, MenuItem[]> = {
  user: [],
  admin: [
    {
      label: nav.menu.adminUsers,
      path: '/admin/users',
      order: 1,
      icon: Users,
      section: 'admin',
    },
    {
      label: nav.menu.adminAuditLogs,
      path: '/admin/audit-logs',
      order: 2,
      icon: ClipboardList,
      section: 'admin',
    },
  ],
};

interface SidebarProps {
  role: UserRole;
  isMobileOpen?: boolean;
  onMobileToggle?: () => void;
  onMobileClose?: () => void;
}

export function Sidebar({
  role,
  isMobileOpen = false,
  onMobileToggle = () => {},
  onMobileClose = () => {},
}: SidebarProps) {
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();
  const allMenuItems = menusByRole[role]?.sort((a, b) => a.order - b.order) ?? [];

  useEffect(() => {
    onMobileClose();
  }, [onMobileClose, pathname]);

  const mainItems = allMenuItems.filter((item) => item.section !== 'admin');
  const adminItems = allMenuItems.filter((item) => item.section === 'admin');
  const hasAdminSection = adminItems.length > 0;

  const handleNavClick = () => {
    if (isMobileOpen) {
      onMobileClose();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onMobileToggle}
        className="fixed left-4 top-3 z-50 inline-flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-700 shadow-sm transition-colors hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:focus:ring-offset-neutral-900 md:hidden"
        aria-label={isMobileOpen ? nav.sidebar.closeSidebar : nav.sidebar.openSidebar}
        aria-expanded={isMobileOpen}
        aria-controls="main-sidebar"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isMobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-neutral-900/50 md:hidden"
          aria-label={nav.sidebar.closeSidebar}
          onClick={onMobileClose}
        />
      )}

      <aside
        id="main-sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col border-r border-neutral-200 bg-white transition-transform duration-200 ease-out dark:border-neutral-700 dark:bg-neutral-900 md:static md:h-auto md:min-h-screen md:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <Link
            href="/"
            onClick={handleNavClick}
            className="block text-xl font-bold text-primary-700 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900 rounded"
          >
            {nav.sidebar.appName}
          </Link>
        </div>
        <nav className="mt-4 flex-1" aria-label={nav.sidebar.mainNav}>
          <ul className="space-y-1" role="list">
            <li>
              <Link
                href="/dashboard"
                onClick={handleNavClick}
                className={cn(
                  'sidebar-item flex items-center gap-3 px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
                  pathname === '/dashboard' && 'sidebar-item-active'
                )}
              >
                <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                <span>{nav.menu.dashboard}</span>
              </Link>
            </li>
            {mainItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    onClick={handleNavClick}
                    className={cn(
                      'sidebar-item flex items-center gap-3 px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
                      pathname === item.path && 'sidebar-item-active'
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Admin Section */}
          {hasAdminSection && (
            <>
              <div className="mt-6 mb-2 px-4">
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  {nav.sidebar.adminSection}
                </span>
              </div>
              <ul className="space-y-1" role="list">
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.path}>
                      <Link
                        href={item.path}
                        onClick={handleNavClick}
                        className={cn(
                          'sidebar-item flex items-center gap-3 px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
                          pathname === item.path && 'sidebar-item-active'
                        )}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
          {/* テーマ切替 */}
          <div className="mb-3">
            <ThemeToggle className="w-full justify-center" />
          </div>
          <Link
            href="/settings"
            onClick={handleNavClick}
            className={cn(
              'flex items-center gap-3 px-3 py-2 mb-3 rounded-md text-sm font-medium transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary-500',
              pathname.startsWith('/settings')
                ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-400'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
            )}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            <span>{nav.menu.settings}</span>
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700 dark:text-primary-400">
                {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
                {user?.name || user?.email || commonUser.unknown}
              </p>
              {user?.role && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                  {user.role}
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={logout}
            variant="secondary"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>{isLoading ? commonActions.loggingOut : commonActions.logout}</span>
          </Button>
        </div>
      </aside>
    </>
  );
}
