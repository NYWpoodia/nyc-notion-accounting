import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { CustomerContract } from '../../types';
import { NotionCard } from '../ui/NotionCard';
import { NotionButton } from '../ui/NotionButton';
import { NotionBadge } from '../ui/NotionBadge';
import { NotionModal } from '../ui/NotionModal';
import { formatCurrency, formatThaiDate, format24HourTime, getContractStatusStyle, getTodayIsoDate } from '../../services/formatters';
import { Printer, Calendar, FileText, Store, Plus, Clock, MessageSquarePlus, CheckCircle2, Check, AlertCircle, PieChart, FileSpreadsheet, Download, Eye, Edit2, Navigation, Save, User, ShieldCheck, Send, Search, X } from 'lucide-react';

interface MonthlyReportViewProps {
  contracts: CustomerContract[];
  onQuickPay: (contractNo: string) => void;
  onAddNote: (contractNo: string, noteText: string, customDate?: string) => void;
  onUpdateContractCustomer?: (contractNo: string, updatedFields: Partial<CustomerContract>) => void;
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  contracts,
  onQuickPay,
  onAddNote,
  onUpdateContractCustomer,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(7); // 7 = July
  const [selectedYear, setSelectedYear] = useState<number>(2569); // 2569 BE = 2026 CE
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all-debtors');
  const [sortBy, setSortBy] = useState<'name' | 'contractNo' | 'dueDate' | 'installment'>('name');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Customer Master Profile & Guarantor Edit Modal State (Opened by Eye 👁️)
  const [selectedCustomerContract, setSelectedCustomerContract] = useState<CustomerContract | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editGuarantor, setEditGuarantor] = useState('');
  const [editGuarantorPhone, setEditGuarantorPhone] = useState('');
  const [editLocationPin, setEditLocationPin] = useState('');
  const [editBpCode, setEditBpCode] = useState('');
  const [geoLocating, setGeoLocating] = useState(false);
  const [saveCustomerSuccess, setSaveCustomerSuccess] = useState<string | null>(null);

  // 2. Dedicated Quick Follow-up Note Modal State (Opened by clicking "ติดตาม" button)
  const [quickNoteContract, setQuickNoteContract] = useState<CustomerContract | null>(null);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [quickNoteSuccess, setQuickNoteSuccess] = useState<string | null>(null);

  // Retroactive Follow-up Date/Time Selectors (Thai Buddhist Era & 24h Time)
  const now = new Date();
  const [noteDay, setNoteDay] = useState<number>(now.getDate());
  const [noteMonth, setNoteMonth] = useState<number>(now.getMonth() + 1);
  const [noteYear, setNoteYear] = useState<number>(2569); // 2569 พ.ศ.
  const [noteTime, setNoteTime] = useState<string>(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  // Reset Note Date/Time to current moment
  const handleResetNoteDateTimeToNow = () => {
    const cur = new Date();
    setNoteDay(cur.getDate());
    setNoteMonth(cur.getMonth() + 1);
    setNoteYear(2569);
    setNoteTime(`${String(cur.getHours()).padStart(2, '0')}:${String(cur.getMinutes()).padStart(2, '0')}`);
  };

  // Convert Thai Buddhist Era (พ.ศ.) 2569 -> 2026 CE for JS Date comparisons
  const targetCEYear = selectedYear > 2500 ? selectedYear - 543 : selectedYear;

  const filteredContracts = contracts.filter((c) => {
    if (c.remainingBalance <= 0) return false;
    if (selectedCategory && c.category !== selectedCategory) return false;

    if (selectedStatusFilter === 'overdue-only') {
      if (c.status === 'D0 ชำระปกติ' || c.status === 'ปิดสัญญาแล้ว') return false;
    } else if (selectedStatusFilter === 'high-risk') {
      if (!['D3 ค้างชำระ 3 เดือน', 'D4 ค้างชำระ 4 เดือน', 'D5 ค้างชำระ 5 เดือน', 'D6 ค้างชำระ 6 เดือน'].includes(c.status)) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = c.customerName.toLowerCase().includes(q);
      const matchBp = c.bpCode?.toLowerCase().includes(q);
      const matchContractNo = c.contractNo.toLowerCase().includes(q);
      const matchPhone = c.phone.includes(q);
      const matchGuarantor = c.guarantorName?.toLowerCase().includes(q);
      const matchGuarantorPhone = c.guarantorPhone?.includes(q);
      const matchProduct = c.productName.toLowerCase().includes(q);
      const matchAddress = c.address.toLowerCase().includes(q);
      if (!matchName && !matchBp && !matchContractNo && !matchPhone && !matchGuarantor && !matchGuarantorPhone && !matchProduct && !matchAddress) {
        return false;
      }
    }

    return true;
  });

  // Sort by Customer Name (Thai alphabetical) by default
  filteredContracts.sort((a, b) => {
    if (sortBy === 'name') {
      return a.customerName.localeCompare(b.customerName, 'th');
    } else if (sortBy === 'contractNo') {
      return a.contractNo.localeCompare(b.contractNo);
    } else if (sortBy === 'dueDate') {
      return a.dueDateDay - b.dueDateDay;
    } else if (sortBy === 'installment') {
      return b.monthlyInstallment - a.monthlyInstallment;
    }
    return 0;
  });

  const totalInstallmentSum = filteredContracts.reduce((sum, c) => sum + c.monthlyInstallment, 0);
  const totalRemainingBalanceSum = filteredContracts.reduce((sum, c) => sum + c.remainingBalance, 0);

  const handlePrint = () => {
    window.print();
  };

  // Open Full Customer Details Modal (Eye Button)
  const handleOpenCustomerModal = (c: CustomerContract) => {
    setSelectedCustomerContract(c);
    setEditName(c.customerName || '');
    setEditPhone(c.phone || '');
    setEditAddress(c.address || '');
    setEditGuarantor(c.guarantorName || '');
    setEditGuarantorPhone(c.guarantorPhone || '');
    setEditLocationPin(c.locationPin || '');
    setEditBpCode(c.bpCode || '');
    setSaveCustomerSuccess(null);
  };

  // Open Dedicated Quick Follow-up Note Modal (Clicking "ติดตาม" button)
  const handleOpenQuickNoteModal = (c: CustomerContract) => {
    setQuickNoteContract(c);
    setQuickNoteText('');
    setQuickNoteSuccess(null);
    handleResetNoteDateTimeToNow();
  };

  // Submit Dedicated Quick Follow-up Note with Retroactive Date Support
  const handleSaveQuickNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteContract || !quickNoteText.trim()) {
      alert('กรุณากรอกข้อความบันทึกการติดตาม');
      return;
    }

    const customDateFormatted = `${noteDay} ${monthNames[noteMonth - 1]} ${noteYear} ${noteTime} น.`;

    onAddNote(quickNoteContract.contractNo, quickNoteText.trim(), customDateFormatted);
    setQuickNoteSuccess(`บันทึกประวัติติดตามหนี้ (วันที่ ${customDateFormatted}) เรียบร้อยแล้ว!`);

    setTimeout(() => {
      setQuickNoteSuccess(null);
      setQuickNoteContract(null);
      setQuickNoteText('');
    }, 1200);
  };

  // Auto GPS Location Handler inside Customer Modal
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์นี้ไม่รองรับการดึงพิกัด GPS อัตโนมัติ กรุณากรอกพิกัดด้วยตนเอง');
      return;
    }

    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setEditLocationPin(`${lat}, ${lng}`);
        setGeoLocating(false);
      },
      () => {
        alert('ไม่สามารถดึงพิกัด GPS ได้ (กรุณาอนุญาตการเข้าถึงตำแหน่ง Location ในเบราว์เซอร์)');
        setGeoLocating(false);
      }
    );
  };

  // Save Customer & Guarantor Edit Submit
  const handleSaveCustomerDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerContract || !onUpdateContractCustomer) return;

    onUpdateContractCustomer(selectedCustomerContract.contractNo, {
      customerName: editName.trim(),
      phone: editPhone.trim(),
      address: editAddress.trim(),
      guarantorName: editGuarantor.trim() || undefined,
      guarantorPhone: editGuarantorPhone.trim() || undefined,
      locationPin: editLocationPin.trim() || undefined,
      bpCode: editBpCode.trim() || undefined,
    });

    setSaveCustomerSuccess('บันทึกการแก้ไขข้อมูลลูกค้า สัญญา และผู้ค้ำประกันเรียบร้อยแล้ว!');

    setTimeout(() => {
      setSaveCustomerSuccess(null);
      setSelectedCustomerContract(null);
    }, 1500);
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    const rows = filteredContracts.map((c, index) => ({
      'ลำดับ': index + 1,
      'ชื่อ-นามสกุล': c.customerName,
      'รหัสสัญญา': c.contractNo,
      'รหัส BP': c.bpCode || '-',
      'เบอร์โทรศัพท์': c.phone,
      'ที่อยู่': c.address,
      'ผู้ค้ำประกัน': c.guarantorName || '-',
      'พิกัด GPS': c.locationPin || '-',
      'สินค้าที่ผ่อน': c.productName,
      'กำหนดชำระ': `ทุกวันที่ ${c.dueDateDay}`,
      'ค่างวดต่อเดือน': c.monthlyInstallment,
      'งวดผ่อนสะสม': `${c.paidInstallments}/${c.totalInstallments} งวด`,
      'ยอดคงเหลือ': c.remainingBalance,
      'สถานะ D-Bucket': c.status,
      'หมายเหตุติดตาม': c.notes || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'รายงานตามเก็บ');
    XLSX.writeFile(workbook, `รายงานตามเก็บประจำเดือน_${monthNames[selectedMonth - 1]}_${selectedYear}.xlsx`);
  };

  // Export to CSV (.csv) with UTF-8 BOM
  const handleExportCsv = () => {
    const headers = ['ลำดับ', 'ชื่อ-นามสกุล', 'รหัสสัญญา', 'รหัส BP', 'เบอร์โทร', 'ที่อยู่', 'ผู้ค้ำประกัน', 'สินค้าที่ผ่อน', 'กำหนดชำระ', 'ค่างวด', 'งวดผ่อนสะสม', 'ยอดคงเหลือ', 'สถานะ D'];
    const rows = filteredContracts.map((c, idx) => [
      idx + 1,
      `"${c.customerName}"`,
      `"${c.contractNo}"`,
      `"${c.bpCode || ''}"`,
      `"${c.phone}"`,
      `"${c.address.replace(/"/g, '""')}"`,
      `"${c.guarantorName || ''}"`,
      `"${c.productName}"`,
      `"ทุกวันที่ ${c.dueDateDay}"`,
      c.monthlyInstallment,
      `"${c.paidInstallments}/${c.totalInstallments} งวด"`,
      c.remainingBalance,
      `"${c.status}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `รายงานตามเก็บประจำเดือน_${monthNames[selectedMonth - 1]}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in text-sm sm:text-base">
      {/* Printable Paper Header (Visible ONLY during print) */}
      <div className="hidden print:block space-y-3 mb-6 pb-4 border-b-2 border-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Store className="w-8 h-8 text-black" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-black">
                ร้านนิยมพานิช (NYC) - บัญชี & ติดตามลูกหนี้
              </h1>
              <p className="text-xs text-gray-700">
                รายงานสรุปรายการลูกค้าที่ต้องชำระประจำเดือน {monthNames[selectedMonth - 1]} พ.ศ. {selectedYear}
              </p>
            </div>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">พิมพ์เมื่อ: {formatThaiDate(new Date().toISOString(), true)}</p>
            <p>รวมทั้งสิ้น: {filteredContracts.length} รายการ</p>
          </div>
        </div>
      </div>

      {/* Screen Interactive Header */}
      <div className="bg-notion-card-light dark:bg-notion-card-dark p-4 sm:p-6 rounded-2xl border border-notion-border-light dark:border-notion-border-dark shadow-notion-sm print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-notion-text-main dark:text-notion-text-darkMain flex items-center gap-2">
              <Printer className="w-5 h-5 text-notion-accent-blue" />
              <span>รายงานตามเก็บประจำเดือน {monthNames[selectedMonth - 1]} พ.ศ. {selectedYear}</span>
            </h2>
            <p className="text-xs sm:text-sm text-notion-text-muted dark:text-notion-text-darkMuted mt-0.5">
              แสดงเฉพาะสัญญาลูกค้าที่มียอดคงค้างผ่อนชำระ ({filteredContracts.length} รายการ)
            </p>
          </div>

          {/* Action Buttons: Print, Export Excel, Export CSV */}
          <div className="flex flex-wrap items-center gap-2 no-print">
            <NotionButton
              variant="secondary"
              icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
              onClick={handleExportExcel}
            >
              ส่งออก Excel (.xlsx)
            </NotionButton>

            <NotionButton
              variant="secondary"
              icon={<Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
              onClick={handleExportCsv}
            >
              ส่งออก CSV (.csv)
            </NotionButton>

            <NotionButton
              variant="primary"
              icon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
            >
              พิมพ์รายงาน / สั่งพิมพ์เอกสาร
            </NotionButton>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-4 no-print border-t border-notion-border-light dark:border-notion-border-dark mt-4">
          {/* Search Debtor Input Field */}
          <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-5">
            <label className="block text-xs font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1 flex items-center gap-1.5">
              <Search className="w-4 h-4 text-notion-accent-blue" />
              <span>ค้นหาลูกหนี้ตามเก็บ (ชื่อลูกค้า, รหัส BP, เลขที่สัญญา, เบอร์โทรศัพท์, ผู้ค้ำประกัน หรือสินค้า)</span>
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-notion-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="พิมพ์ชื่อลูกค้า, BP, เลขสัญญา, เบอร์โทร หรือชื่อผู้ค้ำประกัน..."
                className="w-full pl-10 pr-10 py-2 text-xs sm:text-sm rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain font-semibold focus:outline-none focus:ring-1 focus:ring-notion-accent-blue shadow-notion-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-notion-text-muted hover:text-notion-text-main"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-notion-text-muted mb-1">เลือกเดือน</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain font-bold"
            >
              {monthNames.map((m, idx) => (
                <option key={m} value={idx + 1}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-notion-text-muted mb-1">เลือกปี (พ.ศ.)</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain font-bold"
            >
              <option value={2568}>2568</option>
              <option value={2569}>2569</option>
              <option value={2570}>2570</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-notion-text-muted mb-1">กรองสถานะ D-Bucket</label>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain font-bold"
            >
              <option value="all-debtors">ลูกหนี้ค้างชำระทั้งหมด (D0-D6)</option>
              <option value="overdue-only">เฉพาะค้างชำระ (D1-D6)</option>
              <option value="high-risk">ความเสี่ยงสูง (D3-D6)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-notion-text-muted mb-1">กรองหมวดสินค้า</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain"
            >
              <option value="">ทุกหมวดสินค้า</option>
              <option value="มือถือ">มือถือ</option>
              <option value="รถมอเตอร์ไซด์">รถมอเตอร์ไซด์</option>
              <option value="เครื่องใช้ไฟฟ้า">เครื่องใช้ไฟฟ้า</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-notion-text-muted mb-1">จัดเรียงตาราง</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain font-bold"
            >
              <option value="name">เรียงตามชื่อลูกค้า (ก-ฮ)</option>
              <option value="contractNo">เรียงตามรหัสสัญญา</option>
              <option value="dueDate">เรียงตามวันกำหนดชำระ</option>
              <option value="installment">เรียงตามค่างวดสูงสุด</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
        <div className="bg-notion-sidebar-light dark:bg-notion-sidebar-dark p-4 rounded-2xl border border-notion-border-light dark:border-notion-border-dark">
          <span className="text-xs text-notion-text-muted">จำนวนสัญญาที่ต้องตามเก็บ:</span>
          <div className="text-2xl font-bold text-notion-accent-blue mt-1">{filteredContracts.length} สัญญา</div>
        </div>
        <div className="bg-notion-sidebar-light dark:bg-notion-sidebar-dark p-4 rounded-2xl border border-notion-border-light dark:border-notion-border-dark">
          <span className="text-xs text-notion-text-muted">ยอดค่างวดรวมประจำเดือน:</span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(totalInstallmentSum)}</div>
        </div>
        <div className="bg-notion-sidebar-light dark:bg-notion-sidebar-dark p-4 rounded-2xl border border-notion-border-light dark:border-notion-border-dark">
          <span className="text-xs text-notion-text-muted">ยอดหนี้คงเหลือสะสมรวม:</span>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{formatCurrency(totalRemainingBalanceSum)}</div>
        </div>
      </div>

      {/* Main Table View */}
      <NotionCard className="p-0 overflow-hidden print:overflow-visible print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left">
            {/* Reduced Compact Table Header with Installment Count Column */}
            <thead className="text-[11px] sm:text-xs text-notion-text-muted dark:text-notion-text-darkMuted uppercase bg-notion-sidebar-light dark:bg-notion-sidebar-dark border-b border-notion-border-light dark:border-notion-border-dark font-bold tracking-tight">
              <tr>
                <th className="px-2 py-2 text-center w-10">ลำดับ</th>
                <th className="px-3 py-2 min-w-[150px]">
                  <button onClick={() => setSortBy('name')} className="flex items-center gap-1 hover:text-notion-accent-blue transition-colors">
                    <span>ชื่อ-นามสกุล ลูกค้า</span>
                    {sortBy === 'name' && <span className="text-notion-accent-blue font-bold">↓</span>}
                  </button>
                </th>
                <th className="px-3 py-2 min-w-[120px]">
                  <button onClick={() => setSortBy('contractNo')} className="flex items-center gap-1 hover:text-notion-accent-blue transition-colors">
                    <span>รหัสสัญญา</span>
                    {sortBy === 'contractNo' && <span className="text-notion-accent-blue font-bold">↓</span>}
                  </button>
                </th>
                <th className="px-3 py-2 min-w-[100px]">เบอร์โทร</th>
                <th className="px-3 py-2 min-w-[140px]">สินค้าที่ผ่อน</th>
                <th className="px-3 py-2 text-center min-w-[90px]">
                  <button onClick={() => setSortBy('dueDate')} className="flex items-center gap-1 justify-center hover:text-notion-accent-blue transition-colors w-full">
                    <span>กำหนดชำระ</span>
                    {sortBy === 'dueDate' && <span className="text-notion-accent-blue font-bold">↓</span>}
                  </button>
                </th>
                <th className="px-3 py-2 text-right min-w-[100px]">
                  <button onClick={() => setSortBy('installment')} className="flex items-center gap-1 justify-end hover:text-notion-accent-blue transition-colors w-full">
                    <span>ค่างวด (บาท)</span>
                    {sortBy === 'installment' && <span className="text-notion-accent-blue font-bold">↓</span>}
                  </button>
                </th>
                {/* NEW: Installments Count Column */}
                <th className="px-3 py-2 text-center min-w-[85px]">งวดผ่อน</th>
                <th className="px-3 py-2 text-right min-w-[100px]">ยอดคงเหลือ</th>
                <th className="px-3 py-2 text-center min-w-[160px]">การชำระครั้งล่าสุด / สถานะเดือนนี้</th>
                <th className="px-3 py-2 text-center min-w-[100px]">สถานะคงเหลือ (D BUCKET)</th>
                <th className="px-3 py-2 text-center min-w-[110px]">ประวัติติดตาม</th>
                <th className="px-3 py-2 text-right no-print min-w-[85px]">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-notion-border-light dark:divide-notion-border-dark print:divide-gray-300">
              {filteredContracts.map((contract, index) => {
                const statusStyle = getContractStatusStyle(contract.status);
                const latestNote = contract.notes || (contract.followUpLogs && contract.followUpLogs.length > 0 ? contract.followUpLogs[0].note : null);

                // Get all payments
                const payments = contract.payments || [];
                const lastPayment = payments.length > 0 ? payments[payments.length - 1] : null;

                // Find payments made in the selected month & year
                const paymentsInSelectedMonth = payments.filter((p) => {
                  if (!p.paymentDate) return false;
                  const pDate = new Date(p.paymentDate);
                  const pYear = pDate.getFullYear();
                  const pMonth = pDate.getMonth() + 1;
                  return pYear === targetCEYear && pMonth === selectedMonth;
                });

                const totalPaidThisMonth = paymentsInSelectedMonth.reduce((sum, p) => sum + p.amount, 0);

                return (
                  <tr key={contract.id} className="notion-hover-bg print:hover:bg-transparent">
                    <td className="px-2 py-2 text-center font-medium">{index + 1}</td>
                    
                    {/* Customer Name Cell with Eye Icon Button */}
                    <td className="px-3 py-2 font-bold text-notion-text-main dark:text-notion-text-darkMain">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenCustomerModal(contract)}
                          className="p-1 rounded-lg text-notion-accent-blue hover:bg-notion-accent-blue/10 transition-colors shrink-0 no-print"
                          title="ดูและแก้ไขข้อมูลลูกค้า, สัญญา, ผู้ค้ำประกัน และพิกัด GPS"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <span className="cursor-pointer hover:text-notion-accent-blue transition-colors" onClick={() => handleOpenCustomerModal(contract)}>
                          {contract.customerName}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-2 font-mono font-bold text-notion-accent-blue print:text-black">
                      {contract.contractNo}
                    </td>
                    <td className="px-3 py-2 font-mono">{contract.phone}</td>
                    <td className="px-3 py-2 font-medium">{contract.productName}</td>
                    <td className="px-3 py-2 text-center">ทุกวันที่ {contract.dueDateDay}</td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-700 dark:text-emerald-300 print:text-black">
                      {formatCurrency(contract.monthlyInstallment)}
                    </td>

                    {/* NEW: Installment Count Badge e.g. 3/12 งวด */}
                    <td className="px-3 py-2 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                        {contract.paidInstallments}/{contract.totalInstallments} งวด
                      </span>
                    </td>

                    <td className="px-3 py-2 text-right font-semibold text-rose-600 dark:text-rose-400 print:text-black">
                      {formatCurrency(contract.remainingBalance)}
                    </td>

                    {/* Last Payment & Monthly Paid Indicator Column */}
                    <td className="px-3 py-2 text-center">
                      <div className="space-y-1">
                        {totalPaidThisMonth >= contract.monthlyInstallment ? (
                          <NotionBadge variant="green" icon={<Check className="w-3 h-3" />}>
                            ชำระแล้วในเดือนนี้
                          </NotionBadge>
                        ) : totalPaidThisMonth > 0 ? (
                          <NotionBadge variant="amber" icon={<PieChart className="w-3 h-3" />}>
                            ชำระบางส่วน ({formatCurrency(totalPaidThisMonth)})
                          </NotionBadge>
                        ) : (
                          <NotionBadge variant="rose" icon={<AlertCircle className="w-3 h-3" />}>
                            ยังไม่ชำระในเดือนนี้
                          </NotionBadge>
                        )}

                        {lastPayment ? (
                          <div className="text-xs text-notion-text-muted print:text-black">
                            ชำระล่าสุด: {formatCurrency(lastPayment.amount)} ({formatThaiDate(lastPayment.paymentDate)} {lastPayment.paymentTime ? format24HourTime(lastPayment.paymentTime) : ''})
                          </div>
                        ) : (
                          <div className="text-xs text-notion-text-muted print:text-black italic">
                            ยังไม่มีประวัติชำระ
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-2 text-center">
                      <NotionBadge variant={statusStyle.variant}>
                        {statusStyle.label}
                      </NotionBadge>
                    </td>

                    {/* Follow-Up Note Column: Single Clean Compact Button "ติดตาม" */}
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleOpenQuickNoteModal(contract)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-notion-sm ${
                          latestNote
                            ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 hover:bg-blue-500/25'
                            : 'bg-stone-500/10 text-stone-600 dark:text-stone-400 border border-stone-300 dark:border-stone-700 hover:bg-notion-accent-blue/10 hover:text-notion-accent-blue'
                        }`}
                        title={latestNote ? `ประวัติติดตามล่าสุด: ${latestNote}` : 'กดเพื่อลงบันทึกประวัติติดตาม'}
                      >
                        <MessageSquarePlus className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>ติดตาม {contract.followUpLogs && contract.followUpLogs.length > 0 ? `(${contract.followUpLogs.length})` : ''}</span>
                      </button>
                    </td>

                    {/* Action Column: Single Clean Payment Button */}
                    <td className="px-3 py-2 text-right no-print">
                      <NotionButton
                        variant="secondary"
                        size="sm"
                        onClick={() => onQuickPay(contract.contractNo)}
                      >
                        รับชำระ
                      </NotionButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </NotionCard>

      {/* MODAL 1: Dedicated Quick Follow-Up Note Modal with Retroactive Thai Date/Time Selector */}
      <NotionModal
        isOpen={!!quickNoteContract}
        onClose={() => setQuickNoteContract(null)}
        maxWidth="lg"
        title={`บันทึกประวัติติดตามหนี้ - สัญญา ${quickNoteContract?.contractNo}`}
        subtitle={`ลูกค้า: ${quickNoteContract?.customerName} (${quickNoteContract?.phone}) | ผ่อนแล้ว: ${quickNoteContract?.paidInstallments}/${quickNoteContract?.totalInstallments} งวด`}
        icon={<MessageSquarePlus className="w-6 h-6 text-blue-500" />}
      >
        {quickNoteContract && (
          <form onSubmit={handleSaveQuickNoteSubmit} className="space-y-4 text-sm sm:text-base">
            {quickNoteSuccess && (
              <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>{quickNoteSuccess}</span>
              </div>
            )}

            {/* Retroactive Thai Date & 24h Time Selector */}
            <div className="p-4 rounded-2xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-notion-text-main dark:text-notion-text-darkMain flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span>ระบุวันที่และเวลาที่ออกติดตาม (รองรับการกรอกย้อนหลัง)</span>
                </label>
                <button
                  type="button"
                  onClick={handleResetNoteDateTimeToNow}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold"
                >
                  ⚡ ใช้วัน/เวลาปัจจุบัน
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-sm">
                <div>
                  <label className="block text-notion-text-muted mb-0.5">วัน</label>
                  <select
                    value={noteDay}
                    onChange={(e) => setNoteDay(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark font-bold"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-notion-text-muted mb-0.5">เดือน</label>
                  <select
                    value={noteMonth}
                    onChange={(e) => setNoteMonth(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark font-bold"
                  >
                    {monthNames.map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-notion-text-muted mb-0.5">ปี (พ.ศ.)</label>
                  <select
                    value={noteYear}
                    onChange={(e) => setNoteYear(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark font-bold"
                  >
                    <option value={2568}>2568</option>
                    <option value={2569}>2569</option>
                    <option value={2570}>2570</option>
                  </select>
                </div>

                <div>
                  <label className="block text-notion-text-muted mb-0.5">เวลา (24 ชั่วโมง)</label>
                  <input
                    type="text"
                    value={noteTime}
                    onChange={(e) => setNoteTime(e.target.value)}
                    placeholder="14:30"
                    className="w-full px-2.5 py-1.5 rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1">
                  พิมพ์ข้อความการติดตามลูกค้า *
                </label>
                <textarea
                  rows={3}
                  required
                  autoFocus
                  value={quickNoteText}
                  onChange={(e) => setQuickNoteText(e.target.value)}
                  placeholder="เช่น: ลงพื้นที่เยี่ยมบ้าน โทรหาลูกค้ารอบ 2 แจ้งว่าจะโอนเงินค่างวด 2,500 บาท..."
                  className="w-full px-3.5 py-2.5 text-base font-medium rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                />
              </div>
            </div>

            {/* Previous Follow-Up History Timeline */}
            {quickNoteContract.followUpLogs && quickNoteContract.followUpLogs.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-notion-border-light dark:border-notion-border-dark">
                <h4 className="text-xs font-bold text-notion-text-muted flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>ประวัติบันทึกการติดตามที่ผ่านมา ({quickNoteContract.followUpLogs.length} รายการ):</span>
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {quickNoteContract.followUpLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark text-xs border border-notion-border-light dark:border-notion-border-dark space-y-1">
                      <div className="flex items-center justify-between text-notion-text-muted font-mono font-bold">
                        <span className="text-blue-600 dark:text-blue-400">{log.date}</span>
                        <span>{log.author || 'เจ้าหน้าที่ตามเก็บ'}</span>
                      </div>
                      <p className="font-semibold text-notion-text-main dark:text-notion-text-darkMain text-sm">{log.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <NotionButton type="button" variant="secondary" onClick={() => setQuickNoteContract(null)}>
                ยกเลิก
              </NotionButton>
              <NotionButton type="submit" variant="primary" icon={<Send className="w-4 h-4" />}>
                บันทึกหมายเหตุติดตาม
              </NotionButton>
            </div>
          </form>
        )}
      </NotionModal>

      {/* MODAL 2: Customer & Guarantor Master Data Edit Modal (Opened by Eye 👁️) */}
      <NotionModal
        isOpen={!!selectedCustomerContract}
        onClose={() => setSelectedCustomerContract(null)}
        maxWidth="2xl"
        title={`แก้ไขข้อมูลลูกค้า & ผู้ค้ำประกัน - สัญญา ${selectedCustomerContract?.contractNo}`}
        subtitle={`ลูกค้า: ${selectedCustomerContract?.customerName}`}
        icon={<Eye className="w-6 h-6 text-notion-accent-blue" />}
      >
        {selectedCustomerContract && (
          <form onSubmit={handleSaveCustomerDetails} className="space-y-4 text-sm sm:text-base">
            {saveCustomerSuccess && (
              <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>{saveCustomerSuccess}</span>
              </div>
            )}

            {/* Editable Customer & Guarantor Personal Info */}
            <div className="p-4 rounded-2xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-notion-text-muted mb-1">รหัส BP ลูกค้า</label>
                  <input
                    type="text"
                    value={editBpCode}
                    onChange={(e) => setEditBpCode(e.target.value)}
                    placeholder="เช่น BP-6907-0015"
                    className="w-full px-3 py-2 text-base font-mono font-bold rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark text-cyan-600 dark:text-cyan-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1">ชื่อ-นามสกุล ลูกค้า *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-base font-bold rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                  />
                </div>

                <div>
                  <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1">เบอร์โทรศัพท์ติดต่อ *</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 text-base font-mono font-bold rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-notion-text-muted mb-1">ชื่อ-นามสกุล ผู้ค้ำประกัน (Guarantor)</label>
                  <input
                    type="text"
                    value={editGuarantor}
                    onChange={(e) => setEditGuarantor(e.target.value)}
                    placeholder="เช่น นายจรินทร์ เมพ่วง"
                    className="w-full px-3.5 py-2 text-base font-semibold rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                  />
                </div>

                <div>
                  <label className="block font-bold text-notion-text-muted mb-1">เบอร์โทรศัพท์ ผู้ค้ำประกัน</label>
                  <input
                    type="tel"
                    value={editGuarantorPhone}
                    onChange={(e) => setEditGuarantorPhone(e.target.value)}
                    placeholder="0891234567"
                    className="w-full px-3.5 py-2 text-base font-mono font-bold rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1">ที่อยู่ตามสำเนาทะเบียนบ้าน / ที่พักปัจจุบัน *</label>
                <textarea
                  required
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3.5 py-2 text-base font-medium rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                />
              </div>

              {/* GPS Location Pin Input & Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-notion-text-muted flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-notion-accent-blue" />
                    <span>พิกัด GPS / ลิงก์ Google Maps โลเคชั่นบ้านลูกค้า</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={geoLocating}
                    className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-notion-sm transition-colors flex items-center gap-1"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>{geoLocating ? 'กำลังดึงพิกัด...' : '📍 ดึงพิกัด GPS ปัจจุบัน'}</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={editLocationPin}
                  onChange={(e) => setEditLocationPin(e.target.value)}
                  placeholder="พิกัด GPS เช่น 18.7883, 98.9853 หรือแปะลิงก์ Google Maps..."
                  className="w-full px-3.5 py-2 text-base font-mono rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <NotionButton type="button" variant="secondary" onClick={() => setSelectedCustomerContract(null)}>
                ยกเลิก
              </NotionButton>
              <NotionButton type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
                บันทึกการเปลี่ยนแปลงข้อมูลลูกค้า
              </NotionButton>
            </div>
          </form>
        )}
      </NotionModal>
    </div>
  );
};
