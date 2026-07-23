import React, { useState } from 'react';
import { CustomerContract, PaymentRecord } from '../../types';
import { NotionModal } from '../ui/NotionModal';
import { NotionButton } from '../ui/NotionButton';
import { Calendar, Save, Trash2, Plus, Edit2, Check } from 'lucide-react';
import { formatCurrency } from '../../services/formatters';

interface EditScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: CustomerContract | null;
  onSave: (updatedContract: CustomerContract) => void;
}

export const EditScheduleModal: React.FC<EditScheduleModalProps> = ({
  isOpen,
  onClose,
  contract,
  onSave,
}) => {
  if (!contract) return null;

  const [startDate, setStartDate] = useState<string>(contract.startDate || '2026-04-27');
  const [dueDateDay, setDueDateDay] = useState<number>(contract.dueDateDay || 2);
  const [downPayment, setDownPayment] = useState<number>(contract.downPayment || 0);
  const [monthlyInstallment, setMonthlyInstallment] = useState<number>(contract.monthlyInstallment || 0);
  const [totalInstallments, setTotalInstallments] = useState<number>(contract.totalInstallments || 12);
  const [payments, setPayments] = useState<PaymentRecord[]>(contract.payments || []);

  const handleUpdatePayment = (index: number, field: keyof PaymentRecord, val: any) => {
    const next = [...payments];
    next[index] = { ...next[index], [field]: val };
    setPayments(next);
  };

  const handleAddPaymentRow = () => {
    const nextInstNo = payments.length + 1;
    const newPayment: PaymentRecord = {
      id: `pay-${contract.contractNo}-${Date.now()}`,
      contractNo: contract.contractNo,
      receiptNo: '',
      customerName: contract.customerName,
      amount: monthlyInstallment,
      paymentDate: new Date().toISOString().split('T')[0],
      installmentNo: nextInstNo,
      paymentMethod: 'โอนเงิน',
      note: '',
    };
    setPayments([...payments, newPayment]);
  };

  const handleDeletePaymentRow = (index: number) => {
    const next = payments.filter((_, i) => i !== index);
    setPayments(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const paidCount = payments.length;
    const totalPaidSum = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const financed = monthlyInstallment * totalInstallments;
    const newRemBal = Math.max(0, financed - totalPaidSum);

    const updated: CustomerContract = {
      ...contract,
      startDate,
      dueDateDay,
      downPayment,
      monthlyInstallment,
      totalInstallments,
      paidInstallments: paidCount,
      remainingBalance: newRemBal,
      totalPrice: financed + downPayment,
      payments,
    };

    onSave(updated);
    onClose();
  };

  return (
    <NotionModal isOpen={isOpen} onClose={onClose} maxWidth="3xl" title={`✏️ แก้ไขตารางผ่อนสัญญา: ${contract.contractNo}`}>
      <form onSubmit={handleSubmit} className="space-[#space-y-4] p-1 text-xs">
        {/* Basic Terms Settings */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 dark:bg-stone-800/40 p-3 rounded-xl border border-stone-200 dark:border-stone-700/60 mb-4">
          <div>
            <label className="block text-[11px] font-bold mb-1 text-stone-600 dark:text-stone-300">วันทำสัญญา</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2 py-1 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 font-semibold"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold mb-1 text-stone-600 dark:text-stone-300">วันครบกำหนดชำระ (ของเดือน)</label>
            <input
              type="number"
              min="1"
              max="31"
              value={dueDateDay}
              onChange={(e) => setDueDateDay(parseInt(e.target.value, 10) || 1)}
              className="w-full px-2 py-1 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 font-semibold"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold mb-1 text-stone-600 dark:text-stone-300">เงินดาวน์ (บาท)</label>
            <input
              type="number"
              value={downPayment}
              onChange={(e) => setDownPayment(parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 font-semibold"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold mb-1 text-stone-600 dark:text-stone-300">ค่างวดต่อเดือน (บาท)</label>
            <input
              type="number"
              value={monthlyInstallment}
              onChange={(e) => setMonthlyInstallment(parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 font-semibold"
            />
          </div>
        </div>

        {/* Payments Table */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-sm text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              รายการรับชำระเงินในสัญญา ({payments.length} งวด)
            </h4>
            <NotionButton type="button" variant="secondary" icon={<Plus className="w-3.5 h-3.5" />} onClick={handleAddPaymentRow}>
              เพิ่มงวดรับชำระ
            </NotionButton>
          </div>

          <div className="max-h-64 overflow-y-auto border border-stone-200 dark:border-stone-700 rounded-xl">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-bold sticky top-0">
                <tr>
                  <th className="p-2 text-center w-12">งวดที่</th>
                  <th className="p-2">วันที่รับชำระ</th>
                  <th className="p-2">จำนวนเงิน (บาท)</th>
                  <th className="p-2">เลขที่ใบเสร็จรับเงิน</th>
                  <th className="p-2">ช่องทางชำระ</th>
                  <th className="p-2 text-center w-10">ลบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                {payments.map((p, idx) => (
                  <tr key={p.id || idx} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                    <td className="p-2 text-center font-bold">
                      <input
                        type="number"
                        value={p.installmentNo || idx + 1}
                        onChange={(e) => handleUpdatePayment(idx, 'installmentNo', parseInt(e.target.value, 10) || idx + 1)}
                        className="w-10 text-center rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="date"
                        value={p.paymentDate}
                        onChange={(e) => handleUpdatePayment(idx, 'paymentDate', e.target.value)}
                        className="px-1.5 py-0.5 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 font-mono"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={p.amount}
                        onChange={(e) => handleUpdatePayment(idx, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-24 px-1.5 py-0.5 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 font-bold"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={p.receiptNo || ''}
                        onChange={(e) => handleUpdatePayment(idx, 'receiptNo', e.target.value)}
                        className="w-full px-1.5 py-0.5 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 font-mono text-notion-accent-blue font-bold"
                        placeholder="เช่น A03AXI..."
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={p.paymentMethod || 'โอนเงิน'}
                        onChange={(e) => handleUpdatePayment(idx, 'paymentMethod', e.target.value)}
                        className="px-1.5 py-0.5 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 font-semibold"
                      >
                        <option value="📱 QR">📱 QR</option>
                        <option value="🏦 บัญชี">🏦 บัญชี</option>
                        <option value="💵 เงินสด">💵 เงินสด</option>
                        <option value="โอนเงิน">โอนเงิน</option>
                      </select>
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeletePaymentRow(idx)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-700">
          <NotionButton type="button" variant="secondary" onClick={onClose}>
            ยกเลิก
          </NotionButton>
          <NotionButton type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
            บันทึกการแก้ไขลง Supabase DB
          </NotionButton>
        </div>
      </form>
    </NotionModal>
  );
};
