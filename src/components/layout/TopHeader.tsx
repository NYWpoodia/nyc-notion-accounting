import React from 'react';
import { ViewMode } from '../../types';
import { NotionButton } from '../ui/NotionButton';
import { PlusCircle, Search, Sparkles, Menu, X } from 'lucide-react';

interface TopHeaderProps {
  currentView: ViewMode;
  onOpenQuickPayment: () => void;
  onOpenNewTransaction: () => void;
  onOpenSearch: () => void;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentView,
  onOpenQuickPayment,
  onOpenNewTransaction,
  onOpenSearch,
  isMobileMenuOpen,
  onToggleMobileMenu,
}) => {
  const titles: Record<ViewMode, { title: string; subtitle: string; icon: string }> = {
    dashboard: {
      title: 'ภาพรวมระบบร้านค้า',
      subtitle: 'สรุปการเงิน รายรับ-รายจ่ายประจำวัน และสถิติลูกหนี้',
      icon: '📊',
    },
    sales: {
      title: 'เปิดสัญญาขายสินค้าใหม่ (ระบบขายหน้าร้าน)',
      subtitle: 'บันทึกการขายสินค้าเงินผ่อน/เงินสด ดึงข้อมูลลูกค้าเก่า BP และคำนวณค่างวด',
      icon: '🛍️',
    },
    customers: {
      title: 'ฐานข้อมูลลูกค้า & รหัสสัญญา',
      subtitle: 'จัดการข้อมูลสัญญา รายการสินค้าที่ซื้อ และประวัติผ่อนชำระ',
      icon: '📁',
    },
    debtors: {
      title: 'ติดตามค้างชำระประจำเดือน',
      subtitle: 'รายการลูกหนี้ที่ต้องตามเก็บประจำเดือน พร้อมปุ่มรับชำระด่วน',
      icon: '⚠️',
    },
    'monthly-report': {
      title: 'รายงานรายการลูกค้าที่ต้องชำระประจำเดือน',
      subtitle: 'สรุปตารางใบตามเก็บเงินประจำเดือน พร้อมปุ่มพิมพ์เอกสารรายงาน',
      icon: '🖨️',
    },
    ledger: {
      title: 'สมุดบัญชีรายรับ - รายจ่ายประจำวัน',
      subtitle: 'บันทึกรายการเงินเข้า-ออก และซิงค์รับชำระจากค้างชำระอัตโนมัติ',
      icon: '📒',
    },
    import: {
      title: 'นำเข้าข้อมูลไฟล์ Excel สัญญา',
      subtitle: 'อ่านไฟล์ Excel สัญญาผ่อนชำระของลูกค้าโดยแยกตาม Sheet',
      icon: '📥',
    },
  };

  const currentInfo = titles[currentView];

  return (
    <header className="bg-notion-sidebar-light dark:bg-notion-sidebar-dark border-b border-notion-border-light dark:border-notion-border-dark px-4 sm:px-6 py-3 sticky top-0 z-20 transition-colors shrink-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Breadcrumb & Title with Mobile Hamburger Toggle */}
        <div className="flex items-center gap-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="p-2 rounded-xl border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain md:hidden hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors"
              title="เปิด/ปิด เมนูหลัก"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <span className="text-xl p-1.5 rounded-lg bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark shadow-notion-sm shrink-0">
            {currentInfo.icon}
          </span>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-notion-text-muted">
              <span>ร้านนิยมพานิช (NYC)</span>
              <span>/</span>
              <span className="font-semibold text-notion-text-main dark:text-notion-text-darkMain truncate">
                {currentInfo.title.split(' (')[0]}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-notion-text-main dark:text-notion-text-darkMain tracking-tight">
              {currentInfo.title}
            </h1>
          </div>
        </div>

        {/* Global Action Shortcut Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1 md:pt-0">
          <NotionButton
            variant="ghost"
            size="sm"
            icon={<Search className="w-4 h-4" />}
            onClick={onOpenSearch}
          >
            ค้นหาด่วน
          </NotionButton>

          <NotionButton
            variant="secondary"
            size="sm"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={onOpenNewTransaction}
          >
            + บันทึกรายรับ/รายจ่าย
          </NotionButton>

          <NotionButton
            variant="primary"
            size="sm"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={onOpenQuickPayment}
          >
            💳 รับชำระด่วน
          </NotionButton>
        </div>
      </div>
    </header>
  );
};
