import React, { useState, useEffect } from 'react';
import { CustomerContract, PaymentRecord } from '../../types';
import { NotionModal } from '../ui/NotionModal';
import { NotionButton } from '../ui/NotionButton';
import { NotionBadge } from '../ui/NotionBadge';
import { formatCurrency, formatThaiDate, format24HourTime, getContractStatusStyle, getTodayIsoDate } from '../../services/formatters';
import { Sparkles, Search, CheckCircle2, User, Phone, MapPin, Package, AlertTriangle, Clock, Calendar, Receipt, ShieldAlert } from 'lucide-react';

interface QuickPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  contracts: CustomerContract[];
  initialContractNo?: string;
  onExecutePayment: (data: {
    contractNo: string;
    amount: number;
    paymentMethod: 'เงินสด' | 'โอนเงิน' | 'บัตรเครดิต' | 'อื่นๆ';
    paymentDate: string;
    paymentTime?: string;
    fineAmount?: number;
    note?: string;
    receiptNo?: string;
  }) => void;
}

export const QuickPaymentModal: React.FC<QuickPaymentModalProps> = ({
  isOpen,
  onClose,
  contracts,
  initialContractNo,
  onExecutePayment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContractNo, setSelectedContractNo] = useState<string>('');
  const [receiptNo, setReceiptNo] = useState<string>('');
  const [payAmount, setPayAmount] = useState<string>('');
  const [fineAmount, setFineAmount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<'โอนเงิน' | 'เงินสด' | 'บัตรเครดิต'>('โอนเงิน');

  // Thai Date States (Day, Month 1-12, Year BE e.g. 2569)
  const now = new Date();
  const [payDay, setPayDay] = useState<number>(now.getDate());
  const [payMonth, setPayMonth] = useState<number>(now.getMonth() + 1);
  const [payYearBE, setPayYearBE] = useState<number>(2569);

  // 24-Hour Time States (Hours 00-23, Minutes 00-59)
  const [payHour, setPayHour] = useState<string>(String(now.getHours()).padStart(2, '0'));
  const [payMinute, setPayMinute] = useState<string>(String(now.getMinutes()).padStart(2, '0'));

  // Debounce & Duplicate Warning States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [confirmDuplicateOverride, setConfirmDuplicateOverride] = useState(false);

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  // Convert Day/Month/Year BE to YYYY-MM-DD ISO string
  const getIsoDateFromThai = () => {
    const ceYear = payYearBE > 2500 ? payYearBE - 543 : payYearBE;
    const mStr = String(payMonth).padStart(2, '0');
    const dStr = String(payDay).padStart(2, '0');
    return `${ceYear}-${mStr}-${dStr}`;
  };

  const paymentDate = getIsoDateFromThai();
  const paymentTime = `${payHour}:${payMinute}`;

  // Generate Receipt No matching the EXACT NYC Store Excel Format: A03AXI + MM + YY + 6-digit SEQ (e.g. A03AXI0769000145)
  const generateReceiptNo = () => {
    const today = new Date();
    const mStr = String(today.getMonth() + 1).padStart(2, '0');
    const yStr = String((today.getFullYear() + 543) % 100).padStart(2, '0'); // e.g. 69
    const ran = String(Math.floor(100 + Math.random() * 900)).padStart(6, '0');
    return `A03AXI${mStr}${yStr}${ran}`;
  };

  const [noteText, setNoteText] = useState<string>('');

  // Set initial contract when modal opens
  useEffect(() => {
    if (isOpen) {
      setDuplicateWarning(null);
      setConfirmDuplicateOverride(false);
      setIsSubmitting(false);

      const n = new Date();
      setPayDay(n.getDate());
      setPayMonth(n.getMonth() + 1);
      setPayYearBE(2569);
      setPayHour(String(n.getHours()).padStart(2, '0'));
      setPayMinute(String(n.getMinutes()).padStart(2, '0'));
      setReceiptNo(generateReceiptNo());

      if (initialContractNo) {
        setSelectedContractNo(initialContractNo);
        const target = contracts.find((c) => c.contractNo === initialContractNo);
        if (target) {
          setPayAmount(target.monthlyInstallment.toString());
        }
      } else if (contracts.length > 0) {
        const firstOverdue = contracts.find((c) => c.remainingBalance > 0);
        if (firstOverdue) {
          setSelectedContractNo(firstOverdue.contractNo);
          setPayAmount(firstOverdue.monthlyInstallment.toString());
        }
      }
    }
  }, [isOpen, initialContractNo, contracts]);

  const selectedContract = contracts.find((c) => c.contractNo === selectedContractNo);

  // 🔍 Check Duplicate Payments (Anti-Duplicate Guard Logic)
  const checkDuplicatePayment = (): { isDuplicateReceipt: boolean; isDuplicateSameDay: boolean; message?: string } => {
    let existingReceiptPayment: PaymentRecord | null = null;
    let existingReceiptContractNo = '';

    for (const c of contracts) {
      if (c.payments) {
        const found = c.payments.find((p) => p.receiptNo && p.receiptNo.trim() === receiptNo.trim());
        if (found) {
          existingReceiptPayment = found;
          existingReceiptContractNo = c.contractNo;
          break;
        }
      }
    }

    if (existingReceiptPayment) {
      return {
        isDuplicateReceipt: true,
        isDuplicateSameDay: false,
        message: `⚠️ เลขที่ใบเสร็จ [${receiptNo}] เคยลงรับชำระไปแล้วในระบบ (สัญญา: ${existingReceiptContractNo} - คุณ${existingReceiptPayment.customerName} ยอด ฿${existingReceiptPayment.amount.toLocaleString()} วันที่ ${formatThaiDate(existingReceiptPayment.paymentDate)}) กรุณาตรวจสอบอีกครั้ง`
      };
    }

    if (selectedContract && selectedContract.payments) {
      const sameDayPay = selectedContract.payments.find(
        (p) => p.paymentDate === paymentDate && Math.abs(p.amount - Number(payAmount)) < 1
      );
      if (sameDayPay) {
        return {
          isDuplicateReceipt: false,
          isDuplicateSameDay: true,
          message: `⚠️ ตรวจพบรายการชำระซ้ำ: สัญญา [${selectedContractNo}] มีการลงรับชำระยอด ฿${Number(payAmount).toLocaleString()} ในวันที่ ${formatThaiDate(paymentDate)} ไปแล้ว (ใบเสร็จเลขที่: ${sameDayPay.receiptNo || '-'}, เวลา ${sameDayPay.paymentTime ? format24HourTime(sameDayPay.paymentTime) : 'ชำระหน้าร้าน'})`
        };
      }
    }

    return { isDuplicateReceipt: false, isDuplicateSameDay: false };
  };

  // Live Customer Search Filter
  const matchingContracts = contracts.filter((c) => {
    if (c.remainingBalance <= 0) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.contractNo.toLowerCase().includes(q) ||
      c.customerName.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  });

  const handleSelectContract = (c: CustomerContract) => {
    setSelectedContractNo(c.contractNo);
    setPayAmount(c.monthlyInstallment.toString());
    setSearchQuery('');
    setDuplicateWarning(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractNo || !payAmount || Number(payAmount) <= 0 || isSubmitting) return;

    // 🛑 Anti-Duplicate Validation Guard
    const dupCheck = checkDuplicatePayment();

    if (dupCheck.isDuplicateReceipt) {
      setDuplicateWarning(dupCheck.message || 'เลขที่ใบเสร็จซ้ำ');
      return;
    }

    if (dupCheck.isDuplicateSameDay && !confirmDuplicateOverride) {
      setDuplicateWarning(dupCheck.message || 'รายการชำระซ้ำ');
      setConfirmDuplicateOverride(true);
      return;
    }

    setIsSubmitting(true);

    onExecutePayment({
      contractNo: selectedContractNo,
      receiptNo: receiptNo || generateReceiptNo(),
      amount: Number(payAmount),
      paymentMethod,
      paymentDate,
      paymentTime: paymentMethod === 'โอนเงิน' ? paymentTime : undefined,
      fineAmount: Number(fineAmount) || 0,
      note: noteText,
    });

    setIsSubmitting(false);
    onClose(); // ปิด popup ได้เลยทันทีตามคำร้องขอ!
  };

  const statusStyle = selectedContract ? getContractStatusStyle(selectedContract.status) : null;

  return (
    <NotionModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="3xl"
      title="รับชำระเงินค้างชำระ (พร้อมระบบป้องกันรับชำระซ้ำ)"
      subtitle="ระบุเลขที่ใบเสร็จตามไฟล์ Excel (รูปแบบ A03AXI0769000145), ค้นหาตามสัญญา/ชื่อ/เบอร์โทร"
      icon={<Sparkles className="w-6 h-6 text-notion-accent-blue" />}
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-sm sm:text-base">
        {/* Anti-Duplicate Warning Alert Banner */}
        {duplicateWarning && (
          <div className="p-4 bg-rose-500/15 border border-rose-500/40 rounded-2xl text-rose-800 dark:text-rose-300 space-y-2 font-medium">
            <div className="flex items-start gap-2 font-bold text-base">
              <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{duplicateWarning}</span>
            </div>
            {confirmDuplicateOverride && (
              <div className="pt-3 flex items-center justify-between border-t border-rose-500/30">
                <span className="text-sm italic">หากต้องการบันทึกรายการเพิ่มอีกครั้ง กดปุ่ม "ยืนยันลงชำระซ้ำ"</span>
                <button
                  type="button"
                  onClick={() => {
                    setDuplicateWarning(null);
                    setConfirmDuplicateOverride(true);
                  }}
                  className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-md"
                >
                  ยืนยันลงชำระซ้ำ
                </button>
              </div>
            )}
          </div>
        )}

        {/* 1. Live Customer Search Box */}
        <div className="space-y-2">
          <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain">
            1. ค้นหาลูกหนี้ (ค้นตาม เลขสัญญา / ชื่อ-นามสกุล / เบอร์โทร)
          </label>
          <div className="relative">
            <Search className="w-5 h-5 text-notion-text-muted absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="พิมพ์รหัสสัญญา เช่น A03AH..., ชื่อลูกค้า, หรือเบอร์โทร..."
              className="w-full pl-11 pr-4 py-2.5 text-base rounded-2xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark focus:outline-none focus:ring-2 focus:ring-notion-accent-blue/30 font-medium"
            />
          </div>

          {searchQuery.trim() && (
            <div className="max-h-48 overflow-y-auto rounded-2xl border border-notion-border-light dark:border-notion-border-dark bg-notion-card-light dark:bg-notion-card-dark divide-y divide-notion-border-light dark:divide-notion-border-dark shadow-notion-sm">
              {matchingContracts.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelectContract(c)}
                  className="p-3 flex items-center justify-between notion-hover-bg cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-notion-accent-blue font-mono text-base">{c.contractNo}</span>
                    <span className="ml-3 font-semibold text-notion-text-main dark:text-notion-text-darkMain">
                      {c.customerName}
                    </span>
                    <span className="ml-2 text-notion-text-muted font-mono text-sm">({c.phone})</span>
                  </div>
                  <span className="font-bold text-rose-600 dark:text-rose-400 text-base">
                    {formatCurrency(c.remainingBalance)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Select Box Alternative */}
        <div>
          <label className="block font-bold text-notion-text-muted mb-1.5">
            เลือกรหัสสัญญาที่จะรับชำระ
          </label>
          <select
            value={selectedContractNo}
            onChange={(e) => {
              setSelectedContractNo(e.target.value);
              const target = contracts.find((c) => c.contractNo === e.target.value);
              if (target) setPayAmount(target.monthlyInstallment.toString());
              setDuplicateWarning(null);
            }}
            className="w-full px-4 py-2.5 text-base rounded-2xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain font-medium"
          >
            {contracts
              .filter((c) => c.remainingBalance > 0)
              .map((c) => (
                <option key={c.id} value={c.contractNo}>
                  {c.contractNo} - {c.customerName} ({c.phone}) [{c.status}] - ค้าง {formatCurrency(c.remainingBalance)}
                </option>
              ))}
          </select>
        </div>

        {/* 2. Receipt No & Customer Summary Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1.5 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-notion-accent-blue" />
              <span>เลขที่ใบเสร็จ *</span>
            </label>
            <input
              type="text"
              required
              value={receiptNo}
              onChange={(e) => {
                setReceiptNo(e.target.value);
                setDuplicateWarning(null);
              }}
              placeholder="A03AXI0769000145"
              className="w-full px-4 py-2.5 text-base rounded-2xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-mono font-bold text-notion-accent-blue"
            />
            <span className="text-xs text-notion-text-muted block mt-1">รูปแบบ: A03AXI + เดือน + ปี69 + ลำดับ</span>
          </div>

          {selectedContract && statusStyle && (
            <div className="sm:col-span-2 p-3.5 rounded-2xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-base">
                  <User className="w-4 h-4 text-notion-accent-blue" />
                  <span>{selectedContract.customerName}</span>
                  <span className="font-mono text-xs text-notion-text-muted">({selectedContract.phone})</span>
                </div>
                <NotionBadge variant={statusStyle.variant}>
                  {statusStyle.label}
                </NotionBadge>
              </div>
              <div className="flex items-center justify-between text-xs sm:text-sm pt-1">
                <span>ค่างวดประจำเดือน: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(selectedContract.monthlyInstallment)}</strong></span>
                <span>ยอดค้างรวมสัญญา: <strong className="text-rose-600 dark:text-rose-400 font-bold">{formatCurrency(selectedContract.remainingBalance)}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* 3. Payment Details Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1.5">
              💵 ยอดค่างวดที่รับชำระ (บาท)
            </label>
            <input
              type="number"
              required
              min="1"
              value={payAmount}
              onChange={(e) => {
                setPayAmount(e.target.value);
                setDuplicateWarning(null);
              }}
              className="w-full px-4 py-2.5 text-base rounded-2xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain font-bold focus:outline-none focus:ring-2 focus:ring-notion-accent-blue/30"
            />
          </div>

          <div>
            <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1.5">
              ⚠️ ค่าปรับ / ค่าติดตาม (บาท - ถ้ามี)
            </label>
            <input
              type="number"
              min="0"
              value={fineAmount}
              onChange={(e) => setFineAmount(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-2.5 text-base rounded-2xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain font-bold focus:outline-none focus:ring-2 focus:ring-notion-accent-blue/30"
            />
          </div>
        </div>

        {/* Payment Method Selector */}
        <div>
          <label className="block font-bold text-notion-text-muted mb-1.5">
            💳 ช่องทางการชำระเงิน
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['โอนเงิน', 'เงินสด', 'บัตรเครดิต'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={`py-2 rounded-2xl font-bold border text-base transition-all ${
                  paymentMethod === m
                    ? 'bg-notion-accent-blue text-white border-notion-accent-blue shadow-md'
                    : 'bg-notion-sidebar-light dark:bg-notion-sidebar-dark border-notion-border-light text-notion-text-muted'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {paymentMethod === 'โอนเงิน' && (
            <div className="mt-2.5 p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-xs space-y-1">
              <div className="font-bold text-cyan-800 dark:text-cyan-300 flex items-center justify-between">
                <span>📱 บัญชีรับโอนเงิน / PromptPay QR หน้าร้าน</span>
                <NotionBadge variant="info">สแกน/โอนเงิน</NotionBadge>
              </div>
              <p className="text-notion-text-muted">
                ธนาคารกสิกรไทย (KBANK) • เลขที่บัญชี: <strong className="font-mono text-notion-text-main dark:text-notion-text-darkMain">012-3-45678-9</strong> • บจก. เอ็นวายซี โนชั่น แอคเคาท์ติ้ง
              </p>
            </div>
          )}

          {paymentMethod === 'เงินสด' && (
            <div className="mt-2.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
              <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <span>💵 รับชำระด้วยเงินสดหน้าร้าน</span>
                <NotionBadge variant="success">เงินสดหน้าร้าน</NotionBadge>
              </div>
              <p className="text-notion-text-muted">
                รับชำระเป็นเงินสด ณ เคาน์เตอร์หน้าร้าน บันทึกเข้ารายรับประจำวันเรียบร้อย
              </p>
            </div>
          )}
        </div>

        {/* Thai Date & 24-Hour Time Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Thai Date Picker Dropdown */}
          <div>
            <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-notion-accent-blue" />
              <span>วันที่รับชำระ (วันที่แบบไทย พ.ศ.)</span>
            </label>

            <div className="grid grid-cols-3 gap-1.5">
              {/* Day 1-31 */}
              <select
                value={payDay}
                onChange={(e) => {
                  setPayDay(Number(e.target.value));
                  setDuplicateWarning(null);
                }}
                className="px-2 py-2.5 text-base font-bold rounded-2xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>วันที่ {d}</option>
                ))}
              </select>

              {/* Month 1-12 (มกราคม - ธันวาคม) */}
              <select
                value={payMonth}
                onChange={(e) => {
                  setPayMonth(Number(e.target.value));
                  setDuplicateWarning(null);
                }}
                className="px-2 py-2.5 text-base font-bold rounded-2xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain"
              >
                {monthNames.map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>

              {/* Year BE 2568 - 2570 */}
              <select
                value={payYearBE}
                onChange={(e) => {
                  setPayYearBE(Number(e.target.value));
                  setDuplicateWarning(null);
                }}
                className="px-2 py-2.5 text-base font-bold rounded-2xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain"
              >
                <option value={2568}>2568</option>
                <option value={2569}>2569</option>
                <option value={2570}>2570</option>
              </select>
            </div>

            <div className="mt-1 text-xs font-semibold text-notion-accent-blue">
              📅 วันที่เลือก: {payDay} {monthNames[payMonth - 1]} พ.ศ. {payYearBE}
            </div>
          </div>

          {/* 24-Hour Time Selector (Hours 00-23, Minutes 00-59) */}
          <div>
            <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1.5 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-notion-accent-blue" />
              <span>เวลาการโอนเงิน (ระบบ 24 ชั่วโมง)</span>
            </label>

            {paymentMethod === 'โอนเงิน' ? (
              <div className="space-y-1">
                <div className="grid grid-cols-2 gap-2">
                  {/* Hours 00 - 23 */}
                  <select
                    value={payHour}
                    onChange={(e) => setPayHour(e.target.value)}
                    className="px-3 py-2.5 text-base font-mono font-bold rounded-2xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain"
                  >
                    {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
                      <option key={h} value={h}>{h} นาฬิกา</option>
                    ))}
                  </select>

                  {/* Minutes 00 - 59 */}
                  <select
                    value={payMinute}
                    onChange={(e) => setPayMinute(e.target.value)}
                    className="px-3 py-2.5 text-base font-mono font-bold rounded-2xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain"
                  >
                    {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
                      <option key={m} value={m}>{m} นาที</option>
                    ))}
                  </select>
                </div>
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  🕒 เวลาที่โอน: {payHour}:{payMinute} น. (24 ชม.)
                </div>
              </div>
            ) : (
              <div className="w-full px-4 py-3 text-sm rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-500 italic border border-notion-border-light dark:border-notion-border-dark">
                ℹ️ ชำระหน้าร้าน ({paymentMethod}) ไม่ต้องระบุเวลาโอน
              </div>
            )}
          </div>
        </div>

        {/* Optional Note */}
        <div>
          <label className="block font-bold text-notion-text-muted mb-1.5">
            📝 หมายเหตุเพิ่มเติม (ถ้ามี)
          </label>
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="เช่น: โอนเข้าบัญชี กสิกรไทย, รับเงินสดหน้าร้านกับ ผจญ..."
            className="w-full px-4 py-2.5 text-base rounded-2xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain"
          />
        </div>

        <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-xs sm:text-sm text-blue-700 dark:text-blue-300 font-medium">
          🛡️ ระบบจะตรวจสอบไม่ให้เลขที่ใบเสร็จ (รูปแบบ A03AXI...) ซ้ำ และจะซิงค์ลงสมุดบัญชีรายรับประจำวันให้อัตโนมัติ
        </div>

        <div className="flex justify-end gap-3 pt-3">
          <NotionButton type="button" variant="secondary" onClick={onClose}>
            ยกเลิก
          </NotionButton>
          <NotionButton
            type="submit"
            variant="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'กำลังบันทึกข้อมูล...' : confirmDuplicateOverride ? 'ยืนยันลงชำระซ้ำ' : 'บันทึกการชำระเงิน'}
          </NotionButton>
        </div>
      </form>
    </NotionModal>
  );
};
