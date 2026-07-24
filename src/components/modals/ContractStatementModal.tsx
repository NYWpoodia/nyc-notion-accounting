import React, { useState } from 'react';
import { CustomerContract } from '../../types';
import { NotionModal } from '../ui/NotionModal';
import { NotionButton } from '../ui/NotionButton';
import { NotionBadge } from '../ui/NotionBadge';
import { formatCurrency, formatThaiDate, getContractStatusStyle, formatReceiptNoList } from '../../services/formatters';
import { Printer, FileText, User, Phone, MapPin, ShieldCheck, ShoppingBag, Calendar, Check, AlertCircle, Sparkles, Navigation, Receipt, Edit2 } from 'lucide-react';
import { EditScheduleModal } from './EditScheduleModal';

interface ContractStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: CustomerContract | null;
  onQuickPay?: (contractNo: string) => void;
  onSaveContract?: (updated: CustomerContract) => void;
}

export const ContractStatementModal: React.FC<ContractStatementModalProps> = ({
  isOpen,
  onClose,
  contract,
  onQuickPay,
  onSaveContract,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editDownPayment, setEditDownPayment] = useState<number | ''>('');
  const [editMonthlyInstallment, setEditMonthlyInstallment] = useState<number | ''>('');
  const [editTotalPrice, setEditTotalPrice] = useState<number | ''>('');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGuarantorName, setEditGuarantorName] = useState('');
  const [editGuarantorPhone, setEditGuarantorPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editLocationPin, setEditLocationPin] = useState('');
  const [editProductName, setEditProductName] = useState('');

  if (!contract) return null;

  const handleOpenEdit = () => {
    setEditDownPayment(contract.downPayment || 0);
    setEditMonthlyInstallment(contract.monthlyInstallment || 0);
    setEditTotalPrice(contract.totalPrice || 0);
    setEditCustomerName(contract.customerName || '');
    setEditPhone(contract.phone || '');
    setEditGuarantorName(contract.guarantorName || '');
    setEditGuarantorPhone(contract.guarantorPhone || '');
    setEditAddress(contract.address || '');
    setEditLocationPin(contract.locationPin || '');
    setEditProductName(contract.productName || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveContract) return;

    const downNum = typeof editDownPayment === 'number' ? editDownPayment : 0;
    const monthlyNum = typeof editMonthlyInstallment === 'number' ? editMonthlyInstallment : 0;
    const totalNum = typeof editTotalPrice === 'number' ? editTotalPrice : 0;

    const updated: CustomerContract = {
      ...contract,
      downPayment: downNum,
      monthlyInstallment: monthlyNum,
      totalPrice: totalNum,
      customerName: editCustomerName.trim(),
      phone: editPhone.trim(),
      guarantorName: editGuarantorName.trim() || undefined,
      guarantorPhone: editGuarantorPhone.trim() || undefined,
      address: editAddress.trim(),
      locationPin: editLocationPin.trim() || undefined,
      productName: editProductName.trim(),
    };

    onSaveContract(updated);
    setIsEditModalOpen(false);
  };

  const statusStyle = getContractStatusStyle(contract.status);

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  // Parse start date for schedule computation
  let startY = 2026;
  let startM = 7;
  let startD = 23;
  if (contract.startDate) {
    const parts = contract.startDate.split('-');
    if (parts.length === 3) {
      startY = parseInt(parts[0], 10);
      startM = parseInt(parts[1], 10);
      startD = parseInt(parts[2], 10);
    }
  }
  const startYearBE = startY > 2500 ? startY : startY + 543;

  // Financial calculations
  const monthlyNum = contract.monthlyInstallment || 0;
  const totalInst = Math.max(1, contract.totalInstallments || 12);
  const downNum = contract.downPayment || 0;
  const priceNum = contract.totalPrice || (monthlyNum * totalInst + downNum);
  const financedNum = contract.totalPrice ? Math.max(0, contract.totalPrice - downNum) : monthlyNum * totalInst;
  const finalInstAmount = monthlyNum;

  // Determine Due Day (default to 2 if 0 or undefined)
  const dueDay = contract.dueDateDay && contract.dueDateDay > 0 ? contract.dueDateDay : 2;

  // Determine Installment 1 Due Month & Year
  let firstDueM = 6;
  let firstDueY = 2026;

  if (contract.startDate) {
    const parts = contract.startDate.split('-');
    if (parts.length === 3) {
      const sY = parseInt(parts[0], 10);
      const sM = parseInt(parts[1], 10);
      const sD = parseInt(parts[2], 10);
      firstDueY = sY;
      firstDueM = sD >= dueDay ? sM + 2 : sM + 1;
    }
  }

  // Build Installment Schedule Array (Prefer exact Excel schedule if present)
  const hasExactSchedule = contract.schedule && contract.schedule.length > 0;

  const scheduleRows = hasExactSchedule
    ? contract.schedule!.map((item) => {
        const matchPay = contract.payments?.find((p) => p.installmentNo === item.installmentNo);
        const receiptNoStr = item.receiptNo || matchPay?.receiptNo || '';
        const paidDateStr = item.paidDate || matchPay?.paymentDate || '';
        const itemPaidAmount = item.paidAmount ?? 0;
        const isFullyPaid = item.isPaid || (itemPaidAmount >= item.installmentAmount && item.installmentAmount > 0);
        const isPartiallyPaid = !isFullyPaid && itemPaidAmount > 0;

        return {
          instNo: item.installmentNo,
          isFinal: item.installmentNo === totalInst,
          dueDateThai: item.dueDateThai || formatThaiDate(item.dueDate, true),
          dueDateIso: item.dueDate,
          expectedAmount: item.installmentAmount,
          isPaid: isFullyPaid,
          isPartiallyPaid,
          paidAmount: itemPaidAmount,
          isOverdue: !isFullyPaid && item.dueDate < new Date().toISOString().split('T')[0],
          paymentRecord: matchPay ? {
            ...matchPay,
            receiptNo: receiptNoStr,
            paymentDate: paidDateStr,
          } : (paidDateStr || receiptNoStr) ? {
            id: `pay-${contract.contractNo}-${item.installmentNo}`,
            contractNo: contract.contractNo,
            receiptNo: receiptNoStr,
            customerName: contract.customerName,
            amount: itemPaidAmount || item.installmentAmount,
            paymentDate: paidDateStr,
            installmentNo: item.installmentNo,
            paymentMethod: 'โอนเงิน' as const,
          } : undefined,
        };
      })
    : Array.from({ length: totalInst }, (_, idx) => {
        const instNo = idx + 1;
        const isFinal = instNo === totalInst;
        const expectedAmount = isFinal ? finalInstAmount : monthlyNum;

        let rawM = firstDueM + idx;
        let dueYear = firstDueY + Math.floor((rawM - 1) / 12);
        let dueMonth = ((rawM - 1) % 12) + 1;

        const dueYearBE = dueYear > 2500 ? dueYear : dueYear + 543;
        const dueDateThai = `${dueDay} ${monthNames[dueMonth - 1]} ${dueYearBE}`;
        const dueDateIso = `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

        const matchPay = contract.payments?.find(
          (p) => p.installmentNo === instNo || (p.installmentNo === undefined && contract.payments?.indexOf(p) === idx)
        );

        const todayIso = new Date().toISOString().split('T')[0];
        const isPaid = !!matchPay;
        const isOverdue = !isPaid && dueDateIso < todayIso;

        return {
          instNo,
          isFinal,
          dueDateThai,
          dueDateIso,
          expectedAmount,
          isPaid,
          isOverdue,
          paymentRecord: matchPay,
        };
      });

  const handlePrint = () => {
    window.print();
  };

  const handleOpenGoogleMaps = (pin: string) => {
    if (!pin) return;
    if (pin.startsWith('http://') || pin.startsWith('https://')) {
      window.open(pin, '_blank');
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pin)}`, '_blank');
    }
  };

  return (
    <NotionModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="4xl"
      title={`ใบสรุปข้อมูลสัญญา & ตารางการผ่อนชำระ (A4 Portrait)`}
      subtitle={`เลขที่สัญญา: ${contract.contractNo} • ลูกค้า: ${contract.customerName}`}
      icon={<FileText className="w-6 h-6 text-notion-accent-blue" />}
    >
      <div className="space-y-4">
        {/* Printable Area Wrapper */}
        <div id="printable-contract-statement" className="p-4 sm:p-6 bg-white dark:bg-notion-sidebar-dark rounded-2xl border border-notion-border-light dark:border-notion-border-dark space-y-5 text-notion-text-main dark:text-notion-text-darkMain">
          
          {/* Printable Document Header Banner */}
          <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-notion-border-light dark:border-notion-border-dark pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-notion-accent-blue/15 rounded-xl">
                  <FileText className="w-6 h-6 text-notion-accent-blue" />
                </span>
                <div>
                  <h2 className="font-extrabold text-xl sm:text-2xl tracking-tight text-notion-text-main dark:text-notion-text-darkMain">
                    ร้านนิยมพานิช (NYC)
                  </h2>
                  <p className="text-xs sm:text-sm font-semibold text-notion-text-muted">
                    ใบสรุปข้อมูลสัญญาผ่อนชำระ & ตารางการชำระค่างวด (NYC Contract Statement)
                  </p>
                </div>
              </div>
            </div>

            <div className="text-right space-y-1">
              <div className="flex items-center justify-end gap-2">
                <span className="text-xs text-notion-text-muted font-bold">เลขที่สัญญา:</span>
                <span className="font-mono font-extrabold text-lg text-notion-accent-blue bg-blue-500/10 px-3 py-1 rounded-xl">
                  {contract.contractNo}
                </span>
              </div>
              <div className="flex items-center justify-end gap-2 text-xs font-medium">
                <span className="text-notion-text-muted">สถานะสัญญา:</span>
                <NotionBadge variant={statusStyle.variant}>
                  {statusStyle.label}
                </NotionBadge>
              </div>
              <div className="text-[11px] font-mono text-notion-text-muted">
                วันที่ทำสัญญา: <strong>{startD} {monthNames[startM - 1]} พ.ศ. {startYearBE}</strong>
              </div>
            </div>
          </div>

          {/* Section 1: Customer & Guarantor Information (2-Column Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Buyer Info */}
            <div className="p-3.5 rounded-2xl bg-notion-sidebar-light dark:bg-stone-900 border border-notion-border-light dark:border-notion-border-dark space-y-2 text-xs sm:text-sm">
              <div className="font-bold text-notion-accent-blue flex items-center justify-between border-b border-notion-border-light dark:border-notion-border-dark pb-1.5">
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span>ข้อมูลผู้ซื้อ (Buyer Information)</span>
                </span>
                {contract.bpCode && (
                  <span className="font-mono text-xs px-2 py-0.5 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 rounded-lg">
                    BP: {contract.bpCode}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <div>
                  <span className="text-notion-text-muted font-semibold">ชื่อ-นามสกุล:</span>{' '}
                  <strong className="text-notion-text-main dark:text-notion-text-darkMain font-bold text-base">{contract.customerName}</strong>
                </div>
                <div>
                  <span className="text-notion-text-muted font-semibold">เบอร์โทรศัพท์:</span>{' '}
                  <strong className="font-mono font-bold">{contract.phone}</strong>
                </div>
                {contract.idCardNo && (
                  <div>
                    <span className="text-notion-text-muted font-semibold">เลขบัตรประชาชน:</span>{' '}
                    <span className="font-mono font-medium">🪪 {contract.idCardNo}</span>
                  </div>
                )}
                <div>
                  <span className="text-notion-text-muted font-semibold">ที่อยู่ตามสัญญา:</span>{' '}
                  <span className="font-medium">{contract.address}</span>
                </div>
                {contract.locationPin && (
                  <div className="pt-1 flex items-center gap-1 text-xs">
                    <span className="text-notion-text-muted font-semibold">พิกัด GPS:</span>{' '}
                    <button
                      type="button"
                      onClick={() => handleOpenGoogleMaps(contract.locationPin!)}
                      className="text-notion-accent-blue font-mono font-bold hover:underline inline-flex items-center gap-1"
                    >
                      <Navigation className="w-3 h-3 text-emerald-500" />
                      <span>📍 {contract.locationPin}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Guarantor Info */}
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2 text-xs sm:text-sm">
              <div className="font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5 border-b border-purple-500/20 pb-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>ข้อมูลผู้ค้ำประกัน (Guarantor Information)</span>
              </div>
              {contract.guarantorName ? (
                <div className="space-y-1">
                  <div>
                    <span className="text-notion-text-muted font-semibold">ชื่อ-นามสกุล ผู้ค้ำ:</span>{' '}
                    <strong className="font-bold text-purple-900 dark:text-purple-200 text-base">{contract.guarantorName}</strong>
                  </div>
                  <div>
                    <span className="text-notion-text-muted font-semibold">เบอร์โทรศัพท์ ผู้ค้ำ:</span>{' '}
                    <strong className="font-mono font-bold text-purple-900 dark:text-purple-200">{contract.guarantorPhone || '-'}</strong>
                  </div>
                  <p className="text-[11px] text-stone-500 pt-2 italic">
                    (ผู้ค้ำประกันตกลงผูกพันค้ำประกันการชำระหนี้ตามสัญญาขายผ่อนชำระฉบับนี้)
                  </p>
                </div>
              ) : (
                <div className="py-4 text-center text-stone-400 italic">
                  - ไม่มีข้อมูลผู้ค้ำประกันสำหรับสัญญานี้ -
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Product & Financial Terms Box */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-3 text-xs sm:text-sm">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>ข้อมูลสินค้า & เงื่อนไขการผ่อนชำระ (Product & Installment Terms)</span>
              </span>
              <span className="text-xs font-bold text-notion-accent-blue bg-blue-500/15 px-2.5 py-0.5 rounded-lg">
                หมวดหมู่: {contract.category}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <span className="text-notion-text-muted block mb-0.5">สินค้าที่ผ่อน:</span>
                <p className="font-bold text-sm text-notion-text-main dark:text-notion-text-darkMain">{contract.productName}</p>
                {contract.serialNo && (
                  <span className="font-mono text-[11px] text-stone-500 block">S/N: {contract.serialNo}</span>
                )}
              </div>

              <div>
                <span className="text-notion-text-muted block mb-0.5">ราคาสินค้าเต็ม:</span>
                <p className="font-bold text-sm text-notion-text-main dark:text-notion-text-darkMain">{formatCurrency(priceNum)}</p>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                  เงินดาวน์: {formatCurrency(downNum)}
                </span>
              </div>

              <div>
                <span className="text-notion-text-muted block mb-0.5">ยอดตั้งจัดผ่อนคงเหลือ:</span>
                <p className="font-bold text-sm text-rose-600 dark:text-rose-400">{formatCurrency(financedNum)}</p>
                <span className="text-[11px] text-stone-500 block">ชำระทุกวันที่ {contract.dueDateDay} ของเดือน</span>
              </div>

              <div>
                <span className="text-notion-text-muted block mb-0.5">แผนการผ่อน:</span>
                <p className="font-bold text-sm text-notion-accent-blue">
                  {totalInst} งวด • {formatCurrency(monthlyNum)}<span className="text-[10px] font-normal"> / เดือน</span>
                </p>
                <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold block">
                  งวดสุดท้าย (งวดที่ {totalInst}): {formatCurrency(finalInstAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Installment Payment Schedule Table (Excel Matching) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-notion-text-main dark:text-notion-text-darkMain flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-notion-accent-blue" />
                <span>ตารางการชำระค่างวดในสัญญา ({totalInst} งวด):</span>
              </h3>
              <div className="text-xs space-x-3 font-semibold text-notion-text-muted">
                <span>ยอดชำระแล้วรวม: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(contract.payments?.reduce((s, p) => s + p.amount, 0) || 0)}</strong></span>
                <span>คงเหลือรวม: <strong className="text-rose-600 dark:text-rose-400">{formatCurrency(contract.remainingBalance)}</strong></span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-notion-border-light dark:border-notion-border-dark">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-notion-text-muted uppercase bg-notion-sidebar-light dark:bg-stone-900 border-b border-notion-border-light dark:border-notion-border-dark font-bold">
                  <tr>
                    <th className="px-3 py-2.5 text-center w-14">งวดที่</th>
                    <th className="px-3 py-2.5 min-w-[120px]">วันกำหนดชำระ</th>
                    <th className="px-3 py-2.5 text-right min-w-[110px]">ยอดค่างวด (บาท)</th>
                    <th className="px-3 py-2.5 text-center min-w-[110px]">สถานะชำระ</th>
                    <th className="px-3 py-2.5 min-w-[140px]">เลขที่ใบเสร็จรับเงิน</th>
                    <th className="px-3 py-2.5 min-w-[130px]">วันที่รับชำระจริง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-notion-border-light dark:divide-notion-border-dark font-medium">
                  {/* Row 0: Down Payment (Always rendered for every contract) */}
                  <tr className="bg-emerald-500/5">
                    <td className="px-3 py-2 text-center font-bold text-emerald-700 dark:text-emerald-400">เงินดาวน์</td>
                    <td className="px-3 py-2 text-stone-600 dark:text-stone-300 font-semibold">วันทำสัญญา ({startD} {monthNames[startM - 1]} {startYearBE})</td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(downNum)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-lg">
                        <Check className="w-3 h-3" />
                        ชำระดาวน์แล้ว
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono font-semibold text-notion-accent-blue">A03AXI-DOWN-{contract.contractNo.slice(-6)}</td>
                    <td className="px-3 py-2 font-mono text-stone-600 dark:text-stone-300">{startD} {monthNames[startM - 1]} {startYearBE}</td>
                  </tr>

                  {/* Monthly Installment Rows 1 to N */}
                  {scheduleRows.map((row) => (
                    <tr
                      key={row.instNo}
                      className={
                        row.isPaid
                          ? 'bg-emerald-500/5'
                          : (row as any).isPartiallyPaid
                          ? 'bg-amber-500/8'
                          : row.isOverdue
                          ? 'bg-rose-500/5'
                          : 'notion-hover-bg'
                      }
                    >
                      <td className="px-3 py-2 text-center font-bold font-mono">
                        {row.instNo} {row.isFinal && <span className="text-[10px] text-amber-600 font-normal block">(ปิด)</span>}
                      </td>
                      <td className="px-3 py-2 font-semibold">
                        {row.dueDateThai}
                      </td>
                      <td className={`px-3 py-2 text-right font-bold ${row.isFinal ? 'text-amber-700 dark:text-amber-300' : 'text-notion-text-main dark:text-notion-text-darkMain'}`}>
                        {formatCurrency(row.expectedAmount)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {row.isPaid ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-lg">
                            <Check className="w-3 h-3" />
                            ชำระแล้ว
                          </span>
                        ) : (row as any).isPartiallyPaid ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-lg">
                            <AlertCircle className="w-3 h-3" />
                            ชำระบางส่วน ฿{((row as any).paidAmount || 0).toLocaleString('th-TH')}
                          </span>
                        ) : row.isOverdue ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-rose-500/15 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-lg">
                            <AlertCircle className="w-3 h-3" />
                            ค้างชำระ
                          </span>
                        ) : (
                          <span className="inline-block font-semibold text-[11px] bg-stone-100 dark:bg-stone-800 text-stone-500 px-2 py-0.5 rounded-lg">
                            รอชำระ
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono font-bold text-notion-accent-blue text-[11px]">
                        {formatReceiptNoList(row.paymentRecord?.receiptNo)}
                      </td>
                      <td className="px-3 py-2 font-mono text-stone-600 dark:text-stone-300">
                        {row.paymentRecord ? formatThaiDate(row.paymentRecord.paymentDate) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex items-center justify-between pt-2 no-print flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <NotionButton type="button" variant="secondary" onClick={onClose}>
              ปิดหน้าต่าง
            </NotionButton>
            {onSaveContract && (
              <NotionButton
                type="button"
                variant="secondary"
                icon={<Edit2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                onClick={handleOpenEdit}
              >
                แก้ไขข้อมูลสัญญา
              </NotionButton>
            )}
            {onQuickPay && contract.remainingBalance > 0 && (
              <NotionButton
                type="button"
                variant="primary"
                icon={<Receipt className="w-4 h-4" />}
                onClick={() => {
                  onClose();
                  onQuickPay(contract.contractNo);
                }}
              >
                ลงชำระค่างวด
              </NotionButton>
            )}
          </div>

          <NotionButton
            type="button"
            variant="primary"
            icon={<Printer className="w-4 h-4" />}
            onClick={handlePrint}
            className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
          >
            🖨️ พิมพ์สรุปสัญญา (A4 Portrait)
          </NotionButton>
        </div>
      </div>

      {/* SUB-MODAL FOR EDITING CONTRACT */}
      <NotionModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        maxWidth="xl"
        title={`แก้ไขข้อมูลสัญญาผ่อนชำระ (${contract.contractNo})`}
        subtitle="ปรับปรุงเงินดาวน์, ค่างวด, เบอร์โทรศัพท์ และข้อมูลสัญญา"
        icon={<Edit2 className="w-6 h-6 text-amber-500" />}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
            <h4 className="font-bold text-xs text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-amber-600" />
              <span>เงื่อนไขทางการเงิน & สินค้า</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-notion-text-muted mb-1">
                  💵 เงินดาวน์ (บาท)
                </label>
                <input
                  type="number"
                  value={editDownPayment}
                  onChange={(e) => setEditDownPayment(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-notion-bg-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-bold font-mono text-emerald-600"
                  placeholder="เช่น 5000"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-notion-text-muted mb-1">
                  📅 ค่างวด/เดือน (บาท)
                </label>
                <input
                  type="number"
                  value={editMonthlyInstallment}
                  onChange={(e) => setEditMonthlyInstallment(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-notion-bg-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-bold font-mono text-notion-accent-blue"
                  placeholder="เช่น 3288"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-notion-text-muted mb-1">
                  🏷️ ราคาสินค้ารวม (บาท)
                </label>
                <input
                  type="number"
                  value={editTotalPrice}
                  onChange={(e) => setEditTotalPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-notion-bg-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-bold font-mono"
                  placeholder="เช่น 39456"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-notion-text-muted mb-1">
                📦 สินค้าที่ซื้อ
              </label>
              <input
                type="text"
                value={editProductName}
                onChange={(e) => setEditProductName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-notion-bg-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-notion-sidebar-light dark:bg-stone-900 border border-notion-border-light dark:border-notion-border-dark space-y-2">
              <h4 className="font-bold text-xs text-notion-accent-blue flex items-center gap-1.5 pb-1 border-b border-notion-border-light dark:border-notion-border-dark">
                <User className="w-3.5 h-3.5" />
                <span>ข้อมูลผู้ซื้อ</span>
              </h4>
              <div>
                <label className="block text-[11px] font-semibold text-notion-text-muted mb-0.5">
                  ชื่อ-นามสกุล ผู้ซื้อ
                </label>
                <input
                  type="text"
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-notion-bg-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-notion-text-muted mb-0.5">
                  📱 เบอร์โทรศัพท์ผู้ซื้อ
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-notion-bg-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-mono font-bold text-notion-accent-blue"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
              <h4 className="font-bold text-xs text-purple-800 dark:text-purple-300 flex items-center gap-1.5 pb-1 border-b border-purple-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ข้อมูลผู้ค้ำประกัน</span>
              </h4>
              <div>
                <label className="block text-[11px] font-semibold text-notion-text-muted mb-0.5">
                  ชื่อ-นามสกุล ผู้ค้ำ
                </label>
                <input
                  type="text"
                  value={editGuarantorName}
                  onChange={(e) => setEditGuarantorName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-notion-bg-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-notion-text-muted mb-0.5">
                  📱 เบอร์โทรศัพท์ผู้ค้ำ
                </label>
                <input
                  type="text"
                  value={editGuarantorPhone}
                  onChange={(e) => setEditGuarantorPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-notion-bg-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-mono"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <label className="block text-xs font-semibold text-notion-text-muted mb-1">
                🏠 ที่อยู่ตามสัญญา
              </label>
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-notion-bg-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-notion-text-muted mb-1">
                📍 พิกัด GPS
              </label>
              <input
                type="text"
                value={editLocationPin}
                onChange={(e) => setEditLocationPin(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-notion-bg-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-mono"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-notion-border-light dark:border-notion-border-dark">
            <NotionButton
              type="button"
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
            >
              ยกเลิก
            </NotionButton>
            <NotionButton
              type="submit"
              variant="primary"
              icon={<Save className="w-4 h-4" />}
            >
              บันทึกการแก้ไข
            </NotionButton>
          </div>
        </form>
      </NotionModal>
    </NotionModal>
  );
};
