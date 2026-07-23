import React, { useState } from 'react';
import { CustomerContract } from '../../types';
import { NotionCard } from '../ui/NotionCard';
import { NotionBadge } from '../ui/NotionBadge';
import { NotionButton } from '../ui/NotionButton';
import { SearchFilterBar } from '../ui/SearchFilterBar';
import { formatCurrency, getContractStatusStyle } from '../../services/formatters';
import { AlertCircle, Calendar, Phone, FileText, Clock } from 'lucide-react';
import { ContractStatementModal } from '../modals/ContractStatementModal';

interface DebtorsViewProps {
  contracts: CustomerContract[];
  onQuickPay: (contractNo: string) => void;
  onUpdateContractCustomer?: (contractNo: string, updatedFields: Partial<CustomerContract>) => void;
}

export const DebtorsView: React.FC<DebtorsViewProps> = ({
  contracts,
  onQuickPay,
  onUpdateContractCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statementContract, setStatementContract] = useState<CustomerContract | null>(null);

  // Helper for D-Bucket Sorting Rank (D6 > D5 > D4 > D3 > D2 > D1 > D0)
  const getDBucketRank = (status: string): number => {
    if (status.includes('D6')) return 6;
    if (status.includes('D5')) return 5;
    if (status.includes('D4')) return 4;
    if (status.includes('D3')) return 3;
    if (status.includes('D2')) return 2;
    if (status.includes('D1')) return 1;
    return 0;
  };

  // Filter debtor contracts (Contracts with remaining balance > 0 and status is not D0)
  const debtorContracts = contracts
    .filter((c) => c.remainingBalance > 0 && c.status !== 'D0 ชำระปกติ' && c.status !== 'ปิดสัญญาแล้ว')
    .sort((a, b) => {
      const rankA = getDBucketRank(a.status);
      const rankB = getDBucketRank(b.status);
      if (rankA !== rankB) {
        return rankB - rankA; // Sort highest D-Bucket rank first (D6 -> D5 -> D4 -> D3 -> D2 -> D1)
      }
      return b.remainingBalance - a.remainingBalance; // If D-Bucket is equal, sort highest remaining balance first
    });

  const filteredDebtors = debtorContracts.filter((c) => {
    const matchesSearch =
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contractNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery);

    const matchesCategory = selectedCategory ? c.category === selectedCategory : true;
    const matchesStatus = selectedStatus ? c.status === selectedStatus : true;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalDebtorsCount = debtorContracts.length;
  const totalOverdueAmount = debtorContracts.reduce((sum, c) => sum + c.monthlyInstallment, 0);
  const totalOutstandingBalance = debtorContracts.reduce((sum, c) => sum + c.remainingBalance, 0);

  const handleSimulateNotification = (id: string, name: string) => {
    setNotifiedId(id);
    setTimeout(() => setNotifiedId(null), 3000);
  };

  const categories = [
    { label: 'มือถือ', value: 'มือถือ' },
    { label: 'รถมอเตอร์ไซด์', value: 'รถมอเตอร์ไซด์' },
    { label: 'เครื่องใช้ไฟฟ้า', value: 'เครื่องใช้ไฟฟ้า' },
  ];

  const statuses = [
    { label: 'D6 ค้างชำระ 6 เดือน', value: 'D6 ค้างชำระ 6 เดือน' },
    { label: 'D5 ค้างชำระ 5 เดือน', value: 'D5 ค้างชำระ 5 เดือน' },
    { label: 'D4 ค้างชำระ 4 เดือน', value: 'D4 ค้างชำระ 4 เดือน' },
    { label: 'D3 ค้างชำระ 3 เดือน', value: 'D3 ค้างชำระ 3 เดือน' },
    { label: 'D2 ค้างชำระ 2 เดือน', value: 'D2 ค้างชำระ 2 เดือน' },
    { label: 'D1 ค้างชำระ 1 เดือน', value: 'D1 ค้างชำระ 1 เดือน' },
  ];

  return (
    <div className="space-y-6 animate-fade-in text-sm sm:text-base">
      {/* Top Banner Alert for Monthly Debt Collection */}
      <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-transparent p-5 rounded-2xl border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-xl bg-amber-500 text-white shrink-0 shadow-notion-sm">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-notion-text-main dark:text-notion-text-darkMain">
              รายงานลูกหนี้และยอดค้างชำระประจำเดือน (เรียงจากระดับค้างสูงสุด D6 ถึง D1 จากมากไปน้อย)
            </h2>
            <p className="text-xs sm:text-sm text-notion-text-muted dark:text-notion-text-darkMuted mt-0.5">
              รวมยอดเงินค่างวดที่ต้องตามเก็บในเดือนนี้: <strong className="text-rose-600 dark:text-rose-400 font-bold text-sm sm:text-base">{formatCurrency(totalOverdueAmount)}</strong> (จากทั้งหมด {totalDebtorsCount} สัญญา)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-2 rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark text-xs sm:text-sm font-semibold">
            ยอดคงค้างสะสมรวม: <span className="text-rose-600 dark:text-rose-400 font-bold">{formatCurrency(totalOutstandingBalance)}</span>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categories={categories}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        statuses={statuses}
        placeholder="ค้นหาลูกหนี้, สัญญา, เบอร์โทร..."
      />

      {/* Debtors List Table View */}
      <NotionCard title="ตารางติดตามลูกหนี้และสถานะค้างชำระ (D6 ถึง D1 เรียงจากมากไปน้อย)" subtitle="จัดลำดับจากสัญญาที่มีระดับค้างชำระสูงสุดก่อน" icon={<Clock className="w-4 h-4 text-amber-500" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-notion-text-muted dark:text-notion-text-darkMuted uppercase bg-notion-sidebar-light dark:bg-notion-sidebar-dark border-b border-notion-border-light dark:border-notion-border-dark">
              <tr>
                <th className="px-4 py-3.5">รหัสสัญญา</th>
                <th className="px-4 py-3.5">ชื่อ-นามสกุล ลูกค้า</th>
                <th className="px-4 py-3.5">กำหนดชำระ</th>
                <th className="px-4 py-3.5">ค่างวด/เดือน</th>
                <th className="px-4 py-3.5">ยอดค้างรวม</th>
                <th className="px-4 py-3.5">สถานะ D-Bucket</th>
                <th className="px-4 py-3.5 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-notion-border-light dark:divide-notion-border-dark">
              {filteredDebtors.map((contract) => {
                const statusStyle = getContractStatusStyle(contract.status);
                const isHighPriority = contract.status.includes('D3') || contract.status.includes('D4') || contract.status.includes('D5') || contract.status.includes('D6');

                return (
                  <tr
                    key={contract.id}
                    className={`transition-colors ${
                      isHighPriority
                        ? 'bg-rose-500/5 hover:bg-rose-500/10'
                        : 'notion-hover-bg'
                    }`}
                  >
                    <td className="px-4 py-3.5 font-mono font-bold text-notion-accent-blue">
                      {contract.contractNo}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-notion-text-main dark:text-notion-text-darkMain">
                        {contract.customerName}
                      </div>
                      <div className="text-xs text-notion-text-muted flex items-center gap-1 mt-0.5">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{contract.phone}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-medium">
                      <div className="flex items-center gap-1 text-xs sm:text-sm">
                        <Calendar className="w-4 h-4 text-notion-text-muted" />
                        <span>ทุกวันที่ {contract.dueDateDay} ของเดือน</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-notion-text-main dark:text-notion-text-darkMain">
                      {formatCurrency(contract.monthlyInstallment)}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(contract.remainingBalance)}
                    </td>
                    <td className="px-4 py-3.5">
                      <NotionBadge variant={statusStyle.variant}>
                        {statusStyle.label}
                      </NotionBadge>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-1.5">
                      <NotionButton
                        variant="ghost"
                        size="sm"
                        icon={<FileText className="w-3.5 h-3.5 text-notion-accent-blue" />}
                        onClick={() => setStatementContract(contract)}
                      >
                        สรุปสัญญา A4
                      </NotionButton>
                      <NotionButton
                        variant="primary"
                        size="sm"
                        onClick={() => onQuickPay(contract.contractNo)}
                      >
                        รับชำระเงิน
                      </NotionButton>
                    </td>
                  </tr>
                );
              })}
              {filteredDebtors.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-notion-text-muted">
                    ไม่พบข้อมูลลูกหนี้ตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </NotionCard>

      {/* Printable Contract Statement A4 Modal */}
      <ContractStatementModal
        isOpen={!!statementContract}
        onClose={() => setStatementContract(null)}
        contract={statementContract}
        onQuickPay={onQuickPay}
        onSaveContract={(updated) => {
          setStatementContract(updated);
          if (onUpdateContractCustomer) {
            onUpdateContractCustomer(updated.contractNo, updated);
          }
        }}
      />
    </div>
  );
};
