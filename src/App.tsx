import React, { useState, useEffect } from 'react';
import { CustomerContract, CustomerProfile, LedgerItem, ViewMode } from './types';
import {
  getStoredContracts,
  saveStoredContracts,
  getStoredCustomerProfiles,
  addStoredCustomerProfile,
  updateStoredCustomerProfile,
  deleteStoredCustomerProfile,
  getStoredLedger,
  saveStoredLedger,
  executePayment,
  addLedgerTransaction,
  updateLedgerTransaction,
  deleteLedgerTransaction,
  addContractFollowUpNote,
  updateContractCustomerDetails,
  addStoredContract,
  deleteStoredContract,
} from './services/storageService';
import { formatCurrency, getTodayIsoDate } from './services/formatters';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { DashboardView } from './components/views/DashboardView';
import { SalesView } from './components/views/SalesView';
import { CustomersView } from './components/views/CustomersView';
import { DebtorsView } from './components/views/DebtorsView';
import { MonthlyReportView } from './components/views/MonthlyReportView';
import { LedgerView } from './components/views/LedgerView';
import { ExcelImportView } from './components/views/ExcelImportView';
import { QuickPaymentModal } from './components/modals/QuickPaymentModal';
import { NotionModal } from './components/ui/NotionModal';
import { Search } from 'lucide-react';

export function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('nyc_theme_mode') === 'dark';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const [contracts, setContracts] = useState<CustomerContract[]>([]);
  const [customerProfiles, setCustomerProfiles] = useState<CustomerProfile[]>([]);
  const [ledger, setLedger] = useState<LedgerItem[]>([]);

  const [isQuickPayOpen, setIsQuickPayOpen] = useState<boolean>(false);
  const [selectedPayContractNo, setSelectedPayContractNo] = useState<string>('');

  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const loadedContracts = getStoredContracts();
    const loadedProfiles = getStoredCustomerProfiles();
    const loadedLedger = getStoredLedger();
    setContracts(loadedContracts);
    setCustomerProfiles(loadedProfiles);
    setLedger(loadedLedger);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nyc_theme_mode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nyc_theme_mode', 'light');
    }
  }, [isDarkMode]);

  const overdueCount = contracts.filter(
    (c) => c.status !== 'D0 ชำระปกติ' && c.status !== 'ปิดสัญญาแล้ว' && c.remainingBalance > 0
  ).length;

  const handleOpenQuickPay = (contractNo?: string) => {
    setSelectedPayContractNo(contractNo || '');
    setIsQuickPayOpen(true);
  };

  const handleExecutePayment = (data: {
    contractNo: string;
    amount: number;
    paymentMethod: 'เงินสด' | 'โอนเงิน' | 'บัตรเครดิต' | 'อื่นๆ';
    paymentDate: string;
    paymentTime?: string;
    fineAmount?: number;
    note?: string;
    receiptNo?: string;
  }) => {
    try {
      const { updatedContracts, updatedLedger } = executePayment(data);

      setContracts(updatedContracts);
      setLedger(updatedLedger);
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการรับชำระเงิน');
    }
  };

  const handleAddLedgerItem = (item: Omit<LedgerItem, 'id'>) => {
    const updated = addLedgerTransaction(item);
    setLedger(updated);
  };

  const handleUpdateLedgerItem = (id: string, updatedFields: Partial<LedgerItem>) => {
    const updated = updateLedgerTransaction(id, updatedFields);
    setLedger(updated);
  };

  const handleDeleteLedgerItem = (id: string) => {
    const updated = deleteLedgerTransaction(id);
    setLedger(updated);
  };

  const handleImportContracts = (importedContracts: CustomerContract[]) => {
    const merged = [...importedContracts, ...contracts];
    setContracts(merged);
    saveStoredContracts(merged);
    setCurrentView('customers');
  };

  const handleAddFollowUpNote = (contractNo: string, noteText: string, customDate?: string) => {
    const updated = addContractFollowUpNote(contractNo, noteText, customDate);
    setContracts(updated);
  };

  const handleAddNewContract = (newContract: CustomerContract) => {
    const updatedContracts = addStoredContract(newContract);
    setContracts(updatedContracts);
    setCustomerProfiles(getStoredCustomerProfiles());
  };

  const handleDeleteContract = (contractNo: string) => {
    const updated = deleteStoredContract(contractNo);
    setContracts(updated);
  };

  const handleUpdateContractCustomerDetails = (contractNo: string, updatedFields: Partial<CustomerContract>) => {
    const updated = updateContractCustomerDetails(contractNo, updatedFields);
    setContracts(updated);
  };

  const handleAddCustomerProfile = (profile: CustomerProfile) => {
    const updated = addStoredCustomerProfile(profile);
    setCustomerProfiles(updated);
  };

  const handleUpdateCustomerProfile = (id: string, updatedFields: Partial<CustomerProfile>) => {
    const { updatedProfiles, updatedContracts } = updateStoredCustomerProfile(id, updatedFields);
    setCustomerProfiles(updatedProfiles);
    setContracts(updatedContracts);
  };

  const handleDeleteCustomerProfile = (id: string) => {
    const { updatedProfiles, updatedContracts } = deleteStoredCustomerProfile(id);
    setCustomerProfiles(updatedProfiles);
    setContracts(updatedContracts);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-notion-bg-light dark:bg-notion-bg-dark text-notion-text-main dark:text-notion-text-darkMain">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        overdueCount={overdueCount}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col h-screen overflow-y-auto min-w-0">
        <TopHeader
          currentView={currentView}
          onOpenQuickPayment={() => handleOpenQuickPay()}
          onOpenNewTransaction={() => setCurrentView('ledger')}
          onOpenSearch={() => setIsSearchOpen(true)}
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {/* Full-width responsive main workspace container (max-w-full) */}
        <main className="p-3 sm:p-6 w-full max-w-full flex-1 min-w-0">
          {currentView === 'dashboard' && (
            <DashboardView
              contracts={contracts}
              ledger={ledger}
              onNavigate={setCurrentView}
              onQuickPay={(contractNo) => handleOpenQuickPay(contractNo)}
            />
          )}

          {currentView === 'sales' && (
            <SalesView
              existingContracts={contracts}
              customerProfiles={customerProfiles}
              onAddContract={handleAddNewContract}
              onAddLedgerIncome={(amount, category, description, refContractNo, refCustomerName) => {
                handleAddLedgerItem({
                  date: getTodayIsoDate(),
                  type: 'income',
                  category,
                  amount,
                  description,
                  refContractNo,
                  refCustomerName,
                });
              }}
            />
          )}

          {currentView === 'customers' && (
            <CustomersView
              customerProfiles={customerProfiles}
              contracts={contracts}
              onQuickPay={(contractNo) => handleOpenQuickPay(contractNo)}
              onAddCustomerProfile={handleAddCustomerProfile}
              onUpdateCustomerProfile={handleUpdateCustomerProfile}
              onDeleteCustomerProfile={handleDeleteCustomerProfile}
              onDeleteContract={handleDeleteContract}
            />
          )}

          {currentView === 'debtors' && (
            <DebtorsView
              contracts={contracts}
              onQuickPay={(contractNo) => handleOpenQuickPay(contractNo)}
            />
          )}

          {currentView === 'monthly-report' && (
            <MonthlyReportView
              contracts={contracts}
              onQuickPay={(contractNo) => handleOpenQuickPay(contractNo)}
              onAddNote={handleAddFollowUpNote}
              onUpdateContractCustomer={handleUpdateContractCustomerDetails}
            />
          )}

          {currentView === 'ledger' && (
            <LedgerView
              ledger={ledger}
              onAddTransaction={handleAddLedgerItem}
              onUpdateTransaction={handleUpdateLedgerItem}
              onDeleteTransaction={handleDeleteLedgerItem}
            />
          )}

          {currentView === 'import' && (
            <ExcelImportView onImportContracts={handleImportContracts} />
          )}
        </main>
      </div>

      {/* Upgraded Dedicated Quick Payment Modal */}
      <QuickPaymentModal
        isOpen={isQuickPayOpen}
        onClose={() => setIsQuickPayOpen(false)}
        contracts={contracts}
        initialContractNo={selectedPayContractNo}
        onExecutePayment={handleExecutePayment}
      />

      <NotionModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        title="ค้นหาข้อมูลในระบบ (Quick Launcher)"
        subtitle="พิมพ์ชื่อลูกค้า, รหัสสัญญา, เบอร์โทรศัพท์ หรือรายการบัญชี"
        icon={<Search className="w-5 h-5 text-notion-accent-blue" />}
      >
        <div className="space-y-4">
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาด้วยรหัสสัญญา, ชื่อ..."
            className="w-full px-4 py-2.5 text-sm rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark focus:outline-none focus:ring-2 focus:ring-notion-accent-blue/30"
          />

          <div className="max-h-60 overflow-y-auto divide-y divide-notion-border-light dark:divide-notion-border-dark">
            {contracts
              .filter(
                (c) =>
                  c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.contractNo.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .slice(0, 6)
              .map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setIsSearchOpen(false);
                    setCurrentView('customers');
                  }}
                  className="p-3 text-xs sm:text-sm flex items-center justify-between notion-hover-bg cursor-pointer rounded-lg"
                >
                  <div>
                    <span className="font-bold text-notion-accent-blue font-mono">{c.contractNo}</span>
                    <span className="ml-2 font-semibold">{c.customerName}</span>
                  </div>
                  <span className="text-notion-text-muted">{formatCurrency(c.remainingBalance)}</span>
                </div>
              ))}
          </div>
        </div>
      </NotionModal>
    </div>
  );
}
