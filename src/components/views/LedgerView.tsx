import React, { useState } from 'react';
import { LedgerItem, LedgerType } from '../../types';
import { NotionCard } from '../ui/NotionCard';
import { NotionBadge } from '../ui/NotionBadge';
import { NotionButton } from '../ui/NotionButton';
import { NotionModal } from '../ui/NotionModal';
import { formatCurrency, formatThaiDate, formatThaiDateTime, getTodayIsoDate } from '../../services/formatters';
import { Receipt, PlusCircle, ArrowUpRight, ArrowDownRight, Search, Calendar, Filter, Trash2, Edit2, CheckCircle2, ShoppingBag } from 'lucide-react';

interface LedgerViewProps {
  ledger: LedgerItem[];
  onAddTransaction: (item: Omit<LedgerItem, 'id' | 'createdAt'>) => void;
  onUpdateTransaction?: (id: string, updated: Partial<LedgerItem>) => void;
  onDeleteTransaction?: (id: string) => void;
}

export const LedgerView: React.FC<LedgerViewProps> = ({
  ledger,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'specific' | 'this-month' | 'all'>('today');

  const now = new Date();
  const [specDay, setSpecDay] = useState<number>(now.getDate());
  const [specMonth, setSpecMonth] = useState<number>(now.getMonth() + 1);
  const [specYearBE, setSpecYearBE] = useState<number>(2569);

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const getIsoDateFromSpecThai = () => {
    const ceYear = specYearBE > 2500 ? specYearBE - 543 : specYearBE;
    const mStr = String(specMonth).padStart(2, '0');
    const dStr = String(specDay).padStart(2, '0');
    return `${ceYear}-${mStr}-${dStr}`;
  };

  const selectedSpecificDate = getIsoDateFromSpecThai();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LedgerItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<LedgerItem | null>(null);

  // New Transaction Form State
  const [newType, setNewType] = useState<LedgerType>('income');
  const [newCategory, setNewCategory] = useState('ขายสดหน้าร้าน');
  const [newAmount, setNewAmount] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Edit Transaction Form State
  const [editType, setEditType] = useState<LedgerType>('income');
  const [editCategory, setEditCategory] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const todayIso = getTodayIsoDate();

  // Filter items by Date, Type, and Search
  const filteredLedger = ledger.filter((item) => {
    // 1. Date Filter Logic
    if (dateFilterMode === 'today') {
      if (item.date !== todayIso) return false;
    } else if (dateFilterMode === 'specific') {
      if (item.date !== selectedSpecificDate) return false;
    } else if (dateFilterMode === 'this-month') {
      const currentYearMonth = todayIso.substring(0, 7);
      if (!item.date.startsWith(currentYearMonth)) return false;
    }

    // 2. Type Filter Logic
    if (filterType !== 'all' && item.type !== filterType) return false;

    // 3. Search Query Filter Logic
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchCustomer = item.refCustomerName ? item.refCustomerName.toLowerCase().includes(q) : false;
      const matchContract = item.refContractNo ? item.refContractNo.toLowerCase().includes(q) : false;
      return matchCategory || matchDesc || matchCustomer || matchContract;
    }

    return true;
  });

  const totalIncome = filteredLedger
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + item.amount, 0);

  const totalExpense = filteredLedger
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmount || Number(newAmount) <= 0) return;

    onAddTransaction({
      date: getTodayIsoDate(),
      type: newType,
      category: newCategory,
      amount: Number(newAmount),
      description: newDescription || (newType === 'income' ? 'รายรับหน้าร้าน' : 'รายจ่ายประจำวัน'),
    });

    setIsAddModalOpen(false);
    setNewAmount('');
    setNewDescription('');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !onUpdateTransaction) return;

    onUpdateTransaction(editingItem.id, {
      type: editType,
      category: editCategory,
      amount: Number(editAmount),
      description: editDescription,
    });

    setEditingItem(null);
  };

  const handleDeleteConfirm = () => {
    if (!deletingItem || !onDeleteTransaction) return;
    onDeleteTransaction(deletingItem.id);
    setDeletingItem(null);
  };

  const openEditModal = (item: LedgerItem) => {
    setEditingItem(item);
    setEditType(item.type);
    setEditCategory(item.category);
    setEditAmount(item.amount.toString());
    setEditDescription(item.description);
  };

  const getPeriodTitleText = () => {
    if (dateFilterMode === 'today') return `ประจำวันที่ ${formatThaiDate(todayIso, true)}`;
    if (dateFilterMode === 'specific') return `ประจำวันที่ ${formatThaiDate(selectedSpecificDate, true)}`;
    if (dateFilterMode === 'this-month') return 'ประจำเดือนนี้';
    return 'ประวัติทั้งหมด';
  };

  const periodTitleText = getPeriodTitleText();

  return (
    <div className="space-y-6 animate-fade-in text-sm sm:text-base">
      {/* Header & Date Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-notion-card-light dark:bg-notion-card-dark p-4 rounded-2xl border border-notion-border-light dark:border-notion-border-dark shadow-notion-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-notion-text-main dark:text-notion-text-darkMain flex items-center gap-2">
            <Receipt className="w-5 h-5 text-notion-accent-blue" />
            <span>สมุดบัญชีรายรับ-รายจ่าย {periodTitleText}</span>
          </h2>
          <p className="text-xs sm:text-sm text-notion-text-muted dark:text-notion-text-darkMuted mt-0.5">
            {filteredLedger.length} รายการที่บันทึกในหมวดช่วงเวลานี้
          </p>
        </div>

        {/* Date Mode Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-notion-sidebar-light dark:bg-notion-sidebar-dark p-1 rounded-xl border border-notion-border-light dark:border-notion-border-dark text-xs sm:text-sm font-medium">
            <button
              onClick={() => setDateFilterMode('today')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                dateFilterMode === 'today'
                  ? 'bg-notion-accent-blue text-white shadow-notion-sm'
                  : 'text-notion-text-muted hover:text-notion-text-main'
              }`}
            >
              เฉพาะวันนี้
            </button>
            <button
              onClick={() => setDateFilterMode('this-month')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                dateFilterMode === 'this-month'
                  ? 'bg-notion-accent-blue text-white shadow-notion-sm'
                  : 'text-notion-text-muted hover:text-notion-text-main'
              }`}
            >
              เดือนนี้
            </button>
            <button
              onClick={() => setDateFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                dateFilterMode === 'all'
                  ? 'bg-notion-accent-blue text-white shadow-notion-sm'
                  : 'text-notion-text-muted hover:text-notion-text-main'
              }`}
            >
              ประวัติทั้งหมด
            </button>
          </div>

          {/* Custom Thai Date Selector (No English native picker) */}
          <div
            onClick={() => setDateFilterMode('specific')}
            className={`flex items-center gap-1.5 bg-notion-sidebar-light dark:bg-notion-sidebar-dark p-1.5 rounded-xl border transition-all cursor-pointer ${
              dateFilterMode === 'specific'
                ? 'border-notion-accent-blue ring-2 ring-notion-accent-blue/30'
                : 'border-notion-border-light dark:border-notion-border-dark'
            }`}
          >
            <Calendar className="w-4 h-4 text-notion-accent-blue ml-1 shrink-0" />
            <select
              value={specDay}
              onChange={(e) => {
                setSpecDay(Number(e.target.value));
                setDateFilterMode('specific');
              }}
              className="bg-transparent text-xs sm:text-sm font-bold text-notion-text-main dark:text-notion-text-darkMain focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>วันที่ {d}</option>
              ))}
            </select>
            <select
              value={specMonth}
              onChange={(e) => {
                setSpecMonth(Number(e.target.value));
                setDateFilterMode('specific');
              }}
              className="bg-transparent text-xs sm:text-sm font-bold text-notion-text-main dark:text-notion-text-darkMain focus:outline-none cursor-pointer"
            >
              {monthNames.map((m, idx) => (
                <option key={m} value={idx + 1}>{m}</option>
              ))}
            </select>
            <select
              value={specYearBE}
              onChange={(e) => {
                setSpecYearBE(Number(e.target.value));
                setDateFilterMode('specific');
              }}
              className="bg-transparent text-xs sm:text-sm font-bold text-notion-text-main dark:text-notion-text-darkMain focus:outline-none cursor-pointer pr-1"
            >
              <option value={2568}>2568</option>
              <option value={2569}>2569</option>
              <option value={2570}>2570</option>
            </select>
          </div>
        </div>
      </div>

      {/* Financial Summary Top Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 font-semibold uppercase">
            <span>รวมรายรับ ({periodTitleText})</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-2">
            {formatCurrency(totalIncome)}
          </div>
        </div>

        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 font-semibold uppercase">
            <span>รวมรายจ่าย ({periodTitleText})</span>
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-2">
            {formatCurrency(totalExpense)}
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-semibold uppercase">
            <span>ยอดดุลสุทธิเงินสด ({periodTitleText})</span>
            <Receipt className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-2">
            {formatCurrency(totalIncome - totalExpense)}
          </div>
        </div>
      </div>

      {/* Search & Type Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-notion-card-light dark:bg-notion-card-dark p-3 rounded-2xl border border-notion-border-light dark:border-notion-border-dark shadow-notion-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-notion-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาตามรายการ, หมวดหมู่, ชื่อลูกค้า หรือเลขที่สัญญา..."
            className="w-full pl-10 pr-4 py-2 text-sm sm:text-base rounded-xl bg-notion-sidebar-light/60 dark:bg-notion-sidebar-dark/60 border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain focus:outline-none focus:ring-2 focus:ring-notion-accent-blue/30 font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-notion-sidebar-light dark:bg-notion-sidebar-dark p-1 rounded-xl border border-notion-border-light dark:border-notion-border-dark text-xs sm:text-sm font-medium">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'all'
                  ? 'bg-notion-card-light dark:bg-notion-card-dark text-notion-accent-blue shadow-notion-sm font-bold'
                  : 'text-notion-text-muted hover:text-notion-text-main'
              }`}
            >
              ทั้งหมด ({filteredLedger.length})
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'income'
                  ? 'bg-emerald-500 text-white shadow-notion-sm font-bold'
                  : 'text-notion-text-muted hover:text-notion-text-main'
              }`}
            >
              รายรับเท่านั้น
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'expense'
                  ? 'bg-rose-500 text-white shadow-notion-sm font-bold'
                  : 'text-notion-text-muted hover:text-notion-text-main'
              }`}
            >
              รายจ่ายเท่านั้น
            </button>
          </div>

          <NotionButton
            variant="primary"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            ลงบันทึกรายการใหม่
          </NotionButton>
        </div>
      </div>

      {/* Ledger Table View */}
      <NotionCard title={`สมุดบัญชีเงินเข้า-ออก ${periodTitleText}`} subtitle="บันทึก แก้ไข และจัดการรายการการเงินประจำวัน" icon={<Receipt className="w-4 h-4 text-blue-500" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-notion-text-muted dark:text-notion-text-darkMuted uppercase bg-notion-sidebar-light dark:bg-notion-sidebar-dark border-b border-notion-border-light dark:border-notion-border-dark">
              <tr>
                <th className="px-4 py-3.5">วันที่ทำรายการ</th>
                <th className="px-4 py-3.5">ประเภท</th>
                <th className="px-4 py-3.5">หมวดหมู่</th>
                <th className="px-4 py-3.5">รายละเอียดรายการ</th>
                <th className="px-4 py-3.5">สัญญา / ลูกค้าอ้างอิง</th>
                <th className="px-4 py-3.5 text-right">จำนวนเงิน</th>
                <th className="px-4 py-3.5 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-notion-border-light dark:divide-notion-border-dark">
              {filteredLedger.map((item) => (
                <tr key={item.id} className="notion-hover-bg transition-colors">
                  <td className="px-4 py-3.5 font-medium whitespace-nowrap">
                    {formatThaiDate(item.date, true)}
                  </td>
                  <td className="px-4 py-3.5">
                    {item.type === 'income' ? (
                      <NotionBadge variant="green">+ รายรับ</NotionBadge>
                    ) : (
                      <NotionBadge variant="rose">- รายจ่าย</NotionBadge>
                    )}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-notion-text-main dark:text-notion-text-darkMain">
                    {item.category}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-notion-text-main dark:text-notion-text-darkMain">
                    {item.description}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-notion-text-muted">
                    {item.refContractNo ? (
                      <div className="font-mono font-bold text-notion-accent-blue">
                        {item.refContractNo} {item.refCustomerName ? `(${item.refCustomerName})` : ''}
                      </div>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td
                    className={`px-4 py-3.5 font-bold text-right ${
                      item.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                  </td>
                  <td className="px-4 py-3.5 text-right space-x-1">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1.5 rounded-lg text-notion-text-muted hover:text-notion-accent-blue hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors"
                      title="แก้ไขรายการ"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingItem(item)}
                      className="p-1.5 rounded-lg text-notion-text-muted hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                      title="ลบรายการ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLedger.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-notion-text-muted">
                    ไม่พบรายการการเงินตามช่วงเวลาและเงื่อนไขที่เลือก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </NotionCard>

      {/* Add New Transaction Modal */}
      <NotionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="ลงบันทึก รายรับ / รายจ่าย ประจำวัน"
        subtitle="บันทึกรายการเงินเข้า-ออก ของร้านนิยมพานิช"
        icon={<PlusCircle className="w-5 h-5 text-notion-accent-blue" />}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-notion-text-muted mb-1">
              ประเภทรายการ
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewType('income');
                  setNewCategory('ขายสดหน้าร้าน');
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                  newType === 'income'
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-notion-sm'
                    : 'bg-notion-sidebar-light dark:bg-notion-sidebar-dark border-notion-border-light text-notion-text-muted'
                }`}
              >
                + รายรับ
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewType('expense');
                  setNewCategory('ค่าจ้าง/ค่าใช้จ่ายร้าน');
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                  newType === 'expense'
                    ? 'bg-rose-500 text-white border-rose-600 shadow-notion-sm'
                    : 'bg-notion-sidebar-light dark:bg-notion-sidebar-dark border-notion-border-light text-notion-text-muted'
                }`}
              >
                - รายจ่าย
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-notion-text-muted mb-1">
              หมวดหมู่รายการ
            </label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain"
            >
              {newType === 'income' ? (
                <>
                  <option value="ขายสดหน้าร้าน">ขายสดหน้าร้าน</option>
                  <option value="รับชำระค้างชำระ">รับชำระค้างชำระ</option>
                  <option value="ค่าซ่อม/บริการ">ค่าซ่อม/บริการ</option>
                  <option value="รายรับอื่นๆ">รายรับอื่นๆ</option>
                </>
              ) : (
                <>
                  <option value="ซื้อสินค้าสต๊อก">ซื้อสินค้าสต๊อก</option>
                  <option value="ค่าน้ำค่าไฟ/สาธารณูปโภค">ค่าน้ำค่าไฟ/สาธารณูปโภค</option>
                  <option value="ค่าจ้าง/ค่าใช้จ่ายร้าน">ค่าจ้าง/ค่าใช้จ่ายร้าน</option>
                  <option value="ค่าเช่าสถานที่">ค่าเช่าสถานที่</option>
                  <option value="รายจ่ายอื่นๆ">รายจ่ายอื่นๆ</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-notion-text-muted mb-1">
              จำนวนเงิน (บาท)
            </label>
            <input
              type="number"
              required
              min="1"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="เช่น 1500"
              className="w-full px-3 py-2 text-sm rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain focus:outline-none focus:ring-2 focus:ring-notion-accent-blue/30 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-notion-text-muted mb-1">
              รายละเอียดรายการ
            </label>
            <textarea
              required
              rows={2}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="ระบุรายละเอียด เช่น ขายโทรศัพท์ iPhone 15 เงินสด หน้าร้าน..."
              className="w-full px-3 py-2 text-sm rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain focus:outline-none focus:ring-2 focus:ring-notion-accent-blue/30"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <NotionButton type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              ยกเลิก
            </NotionButton>
            <NotionButton type="submit" variant="primary">
              บันทึกรายการ
            </NotionButton>
          </div>
        </form>
      </NotionModal>

      {/* Edit Transaction Modal */}
      <NotionModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="แก้ไขรายการบัญชี"
        subtitle={`ทำรายการวันที่: ${editingItem ? formatThaiDate(editingItem.date, true) : ''}`}
        icon={<Edit2 className="w-5 h-5 text-notion-accent-blue" />}
      >
        {editingItem && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-notion-text-muted mb-1">
                ประเภทรายการ
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditType('income')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    editType === 'income'
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-notion-sm'
                      : 'bg-notion-sidebar-light dark:bg-notion-sidebar-dark border-notion-border-light text-notion-text-muted'
                  }`}
                >
                  + รายรับ
                </button>
                <button
                  type="button"
                  onClick={() => setEditType('expense')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    editType === 'expense'
                      ? 'bg-rose-500 text-white border-rose-600 shadow-notion-sm'
                      : 'bg-notion-sidebar-light dark:bg-notion-sidebar-dark border-notion-border-light text-notion-text-muted'
                  }`}
                >
                  - รายจ่าย
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-notion-text-muted mb-1">
                หมวดหมู่รายการ
              </label>
              <input
                type="text"
                required
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-notion-text-muted mb-1">
                จำนวนเงิน (บาท)
              </label>
              <input
                type="number"
                required
                min="1"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-notion-text-muted mb-1">
                รายละเอียดรายการ
              </label>
              <textarea
                required
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <NotionButton type="button" variant="secondary" onClick={() => setEditingItem(null)}>
                ยกเลิก
              </NotionButton>
              <NotionButton type="submit" variant="primary">
                บันทึกการแก้ไข
              </NotionButton>
            </div>
          </form>
        )}
      </NotionModal>

      {/* Delete Confirmation Modal */}
      <NotionModal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        title="ยืนยันการลบรายการบัญชี"
        icon={<Trash2 className="w-5 h-5 text-rose-500" />}
      >
        {deletingItem && (
          <div className="space-y-4">
            <p className="text-sm text-notion-text-main dark:text-notion-text-darkMain">
              คุณต้องการลบรายการ <strong className="text-rose-600">{deletingItem.category} ({deletingItem.description})</strong> จำนวน <strong className="text-rose-600">{formatCurrency(deletingItem.amount)}</strong> ใช่หรือไม่?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <NotionButton variant="secondary" onClick={() => setDeletingItem(null)}>
                ยกเลิก
              </NotionButton>
              <NotionButton variant="danger" onClick={handleDeleteConfirm}>
                ยืนยันลบรายการ
              </NotionButton>
            </div>
          </div>
        )}
      </NotionModal>
    </div>
  );
};
