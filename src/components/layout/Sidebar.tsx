import React from 'react';
import { ViewMode } from '../../types';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  AlertCircle,
  Receipt,
  FileSpreadsheet,
  Printer,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Store,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  overdueCount: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  isDarkMode,
  onToggleDarkMode,
  isCollapsed,
  onToggleCollapse,
  overdueCount,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'dashboard' as ViewMode,
      label: 'ภาพรวมระบบร้านค้า',
      icon: LayoutDashboard,
    },
    {
      id: 'sales' as ViewMode,
      label: 'เปิดสัญญาขายหน้าร้าน',
      icon: ShoppingBag,
    },
    {
      id: 'customers' as ViewMode,
      label: 'ฐานข้อมูลลูกค้า & สัญญา',
      icon: Users,
    },
    {
      id: 'debtors' as ViewMode,
      label: 'ติดตามค้างชำระประจำเดือน',
      icon: AlertCircle,
      badge: overdueCount > 0 ? overdueCount : undefined,
    },
    {
      id: 'monthly-report' as ViewMode,
      label: 'รายงานตามเก็บประจำเดือน (สั่งพิมพ์)',
      icon: Printer,
    },
    {
      id: 'ledger' as ViewMode,
      label: 'สมุดบัญชีรายรับ - รายจ่ายประจำวัน',
      icon: Receipt,
    },
    {
      id: 'import' as ViewMode,
      label: 'นำเข้าข้อมูลไฟล์ Excel สัญญา',
      icon: FileSpreadsheet,
    },
  ];

  const handleNavClick = (view: ViewMode) => {
    onViewChange(view);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      <aside
        className={`fixed md:relative inset-y-0 left-0 flex flex-col h-screen bg-notion-sidebar-light dark:bg-notion-sidebar-dark border-r border-notion-border-light dark:border-notion-border-dark transition-all duration-300 z-50 shrink-0 ${
          isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-20' : 'md:w-72'}`}
      >
        {/* Sidebar Header with Larger Store Icon & Distinct Collapse Toggle */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-notion-border-light dark:border-notion-border-dark">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-notion-accent-blue/15 text-notion-accent-blue flex items-center justify-center font-bold shrink-0 shadow-notion-sm">
              <Store className="w-6 h-6 text-notion-accent-blue" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-sm sm:text-base tracking-tight text-notion-text-main dark:text-notion-text-darkMain truncate">
                  ร้านนิยมพานิช (NYC)
                </span>
                <span className="text-xs text-notion-text-muted dark:text-notion-text-darkMuted truncate">
                  บัญชี & ติดตามลูกหนี้
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle / Mobile Close Button */}
          <div className="flex items-center">
            {isMobileOpen && onCloseMobile ? (
              <button
                onClick={onCloseMobile}
                className="p-2 rounded-xl text-notion-text-muted hover:text-notion-text-main md:hidden"
              >
                <X className="w-6 h-6" />
              </button>
            ) : (
              <button
                onClick={onToggleCollapse}
                className="hidden md:flex p-2 rounded-xl text-notion-text-muted hover:text-notion-text-main hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-all"
                title={isCollapsed ? 'ขยายเมนูด้านข้าง (Expand)' : 'ย่อเมนูด้านข้าง (Collapse)'}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="w-6 h-6 text-notion-accent-blue" />
                ) : (
                  <PanelLeftClose className="w-6 h-6 text-notion-text-muted" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Navigation Items with Enlarged (w-6 h-6) Clear Icons */}
        <div className="flex-1 py-3 px-2 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all relative ${
                  isActive
                    ? 'bg-notion-accent-blue/15 dark:bg-notion-accent-blue/20 text-notion-accent-blue font-bold shadow-notion-sm'
                    : 'text-notion-text-muted dark:text-notion-text-darkMuted hover:text-notion-text-main hover:bg-notion-hover-light/60 dark:hover:bg-notion-hover-dark/60'
                } ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}`}
                title={isCollapsed && !isMobileOpen ? item.label : undefined}
              >
                {/* Enlarged Clear Icon (w-6 h-6) */}
                <Icon className={`w-6 h-6 shrink-0 transition-transform ${isActive ? 'text-notion-accent-blue scale-110' : 'text-notion-text-muted'}`} />

                {(!isCollapsed || isMobileOpen) && (
                  <span className="truncate text-sm">{item.label}</span>
                )}

                {/* Badge Indicator */}
                {item.badge && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs bg-rose-500 text-white font-bold shadow-notion-sm ${
                      isCollapsed && !isMobileOpen ? 'absolute top-1 right-1 px-1.5 py-0.2 text-[10px]' : 'ml-auto'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Controls: Theme Toggle & Expand/Collapse Trigger */}
        <div className="p-3 border-t border-notion-border-light dark:border-notion-border-dark space-y-2">
          <button
            onClick={onToggleDarkMode}
            className={`flex items-center gap-3 p-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-notion-text-muted hover:text-notion-text-main hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors w-full ${
              isCollapsed && !isMobileOpen ? 'justify-center' : ''
            }`}
            title={isDarkMode ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
          >
            {isDarkMode ? (
              <Sun className="w-6 h-6 text-amber-400 shrink-0" />
            ) : (
              <Moon className="w-6 h-6 text-notion-text-muted shrink-0" />
            )}
            {(!isCollapsed || isMobileOpen) && <span>{isDarkMode ? 'โหมดสว่าง' : 'โหมดมืด'}</span>}
          </button>

          {/* Quick Collapse Button inside Footer */}
          {(!isCollapsed || isMobileOpen) && (
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex items-center gap-2 w-full p-2 text-xs text-notion-text-muted hover:text-notion-accent-blue justify-center font-medium transition-colors border border-notion-border-light dark:border-notion-border-dark rounded-xl"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>ย่อเมนูด้านข้าง</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
