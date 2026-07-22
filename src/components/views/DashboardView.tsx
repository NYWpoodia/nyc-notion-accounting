import React from 'react';
import { CustomerContract, LedgerItem, ViewMode } from '../../types';
import { StatWidget } from '../ui/StatWidget';
import { NotionCard } from '../ui/NotionCard';
import { NotionBadge } from '../ui/NotionBadge';
import { NotionButton } from '../ui/NotionButton';
import { formatCurrency, getContractStatusStyle, formatThaiDate } from '../../services/formatters';
import { Wallet, AlertTriangle, Users, ArrowUpRight, ArrowDownRight, CreditCard, ChevronRight, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardViewProps {
  contracts: CustomerContract[];
  ledger: LedgerItem[];
  onNavigate: (view: ViewMode) => void;
  onQuickPay: (contractNo: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  contracts,
  ledger,
  onNavigate,
  onQuickPay,
}) => {
  // 1. Calculate REAL Financial Totals directly from real ledger database
  const totalIncome = ledger
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + item.amount, 0);

  const totalExpense = ledger
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0);

  const netBalance = totalIncome - totalExpense;

  const totalRemainingDebt = contracts.reduce((sum, c) => sum + c.remainingBalance, 0);

  // Helper for D-Bucket Sorting Rank (D6 > D5 > D4 > D3 > D2 > D1)
  const getDBucketRank = (status: string): number => {
    if (status.includes('D6')) return 6;
    if (status.includes('D5')) return 5;
    if (status.includes('D4')) return 4;
    if (status.includes('D3')) return 3;
    if (status.includes('D2')) return 2;
    if (status.includes('D1')) return 1;
    return 0;
  };

  // Filter & Sort Overdue Contracts (D1-D6 sorted from highest severity D6 -> D1 and highest balance)
  const overdueContracts = contracts
    .filter((c) => c.status !== 'D0 ชำระปกติ' && c.status !== 'ปิดสัญญาแล้ว' && c.remainingBalance > 0)
    .sort((a, b) => {
      const rankA = getDBucketRank(a.status);
      const rankB = getDBucketRank(b.status);
      if (rankA !== rankB) {
        return rankB - rankA; // Sort highest D-Bucket rank first (D6 -> D5 -> D4 -> D3 -> D2 -> D1)
      }
      return b.remainingBalance - a.remainingBalance; // If D-Bucket is equal, sort highest remaining balance first
    });

  // 2. Calculate REAL Chart Data grouped by actual dates from real ledger entries
  const getRealChartData = () => {
    const daysMap: Record<string, { dayLabel: string; dateStr: string; income: number; expense: number }> = {};
    const today = new Date();
    const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const isoStr = d.toISOString().split('T')[0];
      const dayLabel = `${dayNames[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
      daysMap[isoStr] = { dayLabel, dateStr: isoStr, income: 0, expense: 0 };
    }

    // Populate actual sums from real ledger entries
    ledger.forEach((item) => {
      const dateKey = item.date;
      if (daysMap[dateKey]) {
        if (item.type === 'income') {
          daysMap[dateKey].income += item.amount;
        } else if (item.type === 'expense') {
          daysMap[dateKey].expense += item.amount;
        }
      } else {
        const d = new Date(dateKey);
        if (!isNaN(d.getTime())) {
          const dayLabel = `${dayNames[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
          if (!daysMap[dateKey]) {
            daysMap[dateKey] = { dayLabel, dateStr: dateKey, income: 0, expense: 0 };
          }
          if (item.type === 'income') {
            daysMap[dateKey].income += item.amount;
          } else if (item.type === 'expense') {
            daysMap[dateKey].expense += item.amount;
          }
        }
      }
    });

    return Object.values(daysMap)
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
      .slice(-7)
      .map((d) => ({
        day: d.dayLabel,
        income: d.income,
        expense: d.expense,
      }));
  };

  const chartData = getRealChartData();

  return (
    <div className="space-y-6 animate-fade-in text-sm sm:text-base">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatWidget
          title="รายรับรวมจริง"
          value={formatCurrency(totalIncome)}
          subtitle="ดึงตามรายการจริงในสมุดบัญชี"
          change={`รวม ${ledger.filter(l => l.type === 'income').length} รายการ`}
          changeType="positive"
          icon={<ArrowUpRight className="w-5 h-5 text-emerald-500" />}
          accentColor="green"
        />
        <StatWidget
          title="รายจ่ายรวมจริง"
          value={formatCurrency(totalExpense)}
          subtitle={totalExpense === 0 ? "ยังไม่มีการลงบันทึกรายจ่าย (฿0)" : "ดึงตามรายการจริงในสมุดบัญชี"}
          change={`รวม ${ledger.filter(l => l.type === 'expense').length} รายการ`}
          changeType={totalExpense === 0 ? "positive" : "negative"}
          icon={<ArrowDownRight className="w-5 h-5 text-rose-500" />}
          accentColor="rose"
        />
        <StatWidget
          title="กำไรสุทธิกระแสเงินสด"
          value={formatCurrency(netBalance)}
          subtitle="คำนวณจาก (รายรับจริง - รายจ่ายจริง)"
          change={netBalance >= 0 ? 'กระแสเงินสดบวก' : 'กระแสเงินสดลบ'}
          changeType={netBalance >= 0 ? 'positive' : 'negative'}
          icon={<Wallet className="w-5 h-5 text-blue-500" />}
          accentColor="blue"
        />
        <StatWidget
          title="ยอดหนี้ค้างชำระรวม (D1 - D6)"
          value={formatCurrency(totalRemainingDebt)}
          subtitle={`${overdueContracts.length} สัญญาค้างชำระ D1-D6`}
          change={`${overdueContracts.length} ราย`}
          changeType="negative"
          icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
          accentColor="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <NotionCard
          title="แนวโน้มรายรับ - รายจ่ายจริงประจำสัปดาห์ (Real Data Chart)"
          subtitle={totalExpense === 0 ? "แสดงข้อมูลจริง 100% จากสมุดบัญชี (ปัจจุบันมีเฉพาะรายรับ รายจ่ายอยู่ที่ ฿0)" : "แสดงข้อมูลรายรับ-รายจ่ายจริงที่บันทึกในสมุดบัญชี"}
          icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
          className="lg:col-span-2"
        >
          <div className="h-64 sm:h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} tickFormatter={(val) => `฿${val >= 1000 ? (val / 1000) + 'k' : val}`} />
                <Tooltip
                  formatter={(val: any) => [`฿${Number(val).toLocaleString()}`, '']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                />
                <Area type="monotone" dataKey="income" name="รายรับจริง" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" name="รายจ่ายจริง" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </NotionCard>

        <div className="space-y-4">
          <NotionCard
            title="เมนูทางลัดด่วน"
            subtitle="ระบบจัดการและบันทึกบัญชีของร้าน"
            icon={<CreditCard className="w-4 h-4" />}
          >
            <div className="space-y-2.5">
              <button
                onClick={() => onNavigate('debtors')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 transition-all text-sm font-medium border border-amber-500/20 group"
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>ดูตารางลูกหนี้ D1-D6 ค้างชำระ</span>
                </div>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => onNavigate('ledger')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-800 dark:text-blue-300 transition-all text-sm font-medium border border-blue-500/20 group"
              >
                <div className="flex items-center gap-2.5">
                  <Wallet className="w-4 h-4 text-blue-500" />
                  <span>บันทึกสมุดรายรับ-รายจ่าย</span>
                </div>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => onNavigate('import')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 transition-all text-sm font-medium border border-emerald-500/20 group"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span>นำเข้าสัญญาจากไฟล์ Excel</span>
                </div>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </NotionCard>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-5 shadow-notion-md">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-blue-200">
                จำนวนสัญญาลูกค้าในระบบ
              </span>
              <Users className="w-5 h-5 text-blue-200" />
            </div>
            <div className="text-3xl font-bold mt-2">{contracts.length} สัญญา</div>
            <p className="text-xs text-blue-100 mt-1">
              จำแนกตาม D0 ชำระปกติ และ D1-D6 ค้างชำระ
            </p>
          </div>
        </div>
      </div>

      <NotionCard
        title="รายการลูกหนี้ D1-D6 ค้างชำระเร่งด่วน (เรียงจากระดับความรุนแรง D6 ถึง D1 จากมากไปน้อย)"
        subtitle="แสดงสัญญาลูกค้าค้างชำระ เรียงจากระดับค้างสูงสุด (D6) และยอดเงินคงค้างมากที่สุดก่อน"
        icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
        headerAction={
          <NotionButton variant="ghost" size="sm" onClick={() => onNavigate('debtors')}>
            ดูทั้งหมด ({overdueContracts.length})
          </NotionButton>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-notion-text-muted dark:text-notion-text-darkMuted uppercase bg-notion-sidebar-light dark:bg-notion-sidebar-dark border-b border-notion-border-light dark:border-notion-border-dark">
              <tr>
                <th className="px-4 py-3">รหัสสัญญา</th>
                <th className="px-4 py-3">ชื่อลูกค้า</th>
                <th className="px-4 py-3">หมวดสินค้า</th>
                <th className="px-4 py-3">งวดผ่อน/เดือน</th>
                <th className="px-4 py-3">ยอดคงค้าง</th>
                <th className="px-4 py-3">สถานะ D</th>
                <th className="px-4 py-3 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-notion-border-light dark:divide-notion-border-dark">
              {overdueContracts.slice(0, 8).map((contract) => {
                const statusStyle = getContractStatusStyle(contract.status);
                return (
                  <tr key={contract.id} className="notion-hover-bg transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-notion-accent-blue">
                      {contract.contractNo}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <div>{contract.customerName}</div>
                      <div className="text-xs text-notion-text-muted">{contract.phone}</div>
                    </td>
                    <td className="px-4 py-3">{contract.category}</td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(contract.monthlyInstallment)}</td>
                    <td className="px-4 py-3 text-rose-600 dark:text-rose-400 font-bold">
                      {formatCurrency(contract.remainingBalance)}
                    </td>
                    <td className="px-4 py-3">
                      <NotionBadge variant={statusStyle.variant}>
                        {statusStyle.label}
                      </NotionBadge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <NotionButton
                        variant="primary"
                        size="sm"
                        onClick={() => onQuickPay(contract.contractNo)}
                      >
                        รับชำระ
                      </NotionButton>
                    </td>
                  </tr>
                );
              })}
              {overdueContracts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-notion-text-muted">
                    🎉 ยอดเยี่ยม! ไม่มีสัญญาลูกค้าค้างชำระในขณะนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </NotionCard>
    </div>
  );
};
