import * as XLSX from 'xlsx';
import { CustomerContract, ProductCategory, ContractStatus, PaymentRecord, InstallmentScheduleItem } from '../types';
import { formatReceiptNoList, formatThaiDate } from './formatters';

export async function parseExcelFile(file: File): Promise<CustomerContract[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const contracts: CustomerContract[] = [];

  let category: ProductCategory = 'มือถือ';
  const fileName = file.name.toLowerCase();
  if (fileName.includes('มอเตอร์ไซด์') || fileName.includes('รถ')) {
    category = 'รถมอเตอร์ไซด์';
  } else if (fileName.includes('เครื่องใช้ไฟฟ้า') || fileName.includes('ไฟฟ้า')) {
    category = 'เครื่องใช้ไฟฟ้า';
  }

  workbook.SheetNames.forEach((sheetName, index) => {
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

    if (!rawRows || rawRows.length === 0) return;

    const contract = parseSingleCustomerSheet(sheetName, rawRows, category, index);
    if (contract) {
      contracts.push(contract);
    }
  });

  return contracts;
}

function parseExcelDateString(val: any): string | undefined {
  if (!val) return undefined;
  if (typeof val === 'number') {
    // Excel base date 1899-12-30
    const dateObj = new Date((val - (25567 + 2)) * 86400 * 1000);
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '0' || trimmed === '-') return undefined;
    const parts = trimmed.split(/[\/\.-]/);
    if (parts.length === 3) {
      let d = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10);
      let y = parseInt(parts[2], 10);
      if (y > 2500) y -= 543;
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
    return trimmed;
  }
  return undefined;
}

export function parseSingleCustomerSheet(
  sheetName: string,
  rows: any[][],
  category: ProductCategory,
  index: number = 0
): CustomerContract {
  let customerName = '';
  let phone = '';
  let address = '';
  let guarantorName = '';
  let guarantorPhone = '';
  let productName = '';
  let monthlyInstallment = 0;
  let totalInstallments = 0;
  let paidInstallments = 0;
  let remainingBalance = 0;
  let startDate = '2026-04-27';
  let dueDateDay = 15;
  const payments: PaymentRecord[] = [];
  const schedule: InstallmentScheduleItem[] = [];

  rows.forEach((row) => {
    if (!Array.isArray(row) || row.length === 0) return;

    // Check Installment Table Row (First column is installment number 1, 2, 3...)
    if (typeof row[0] === 'number' && row.length >= 3) {
      const instNo = row[0];
      const dueVal = row[1];
      const instAmount = Number(row[2]) || 0;
      const paidDateRaw = row[4];
      const paidAmount = Number(row[5]) || 0;
      const remBal = row[6] !== undefined ? Number(row[6]) : null;
      const noteRaw = row[7] ? String(row[7]).trim() : '';
      const receiptRaw = row[8] ? String(row[8]).trim() : '';

      totalInstallments = Math.max(totalInstallments, instNo);
      if (monthlyInstallment === 0 && instAmount > 0) monthlyInstallment = instAmount;

      const parsedDueIso = parseExcelDateString(dueVal);
      const dueDateThaiStr = parsedDueIso ? formatThaiDate(parsedDueIso, true) : (dueVal ? String(dueVal) : '');
      const formattedPaidDate = parseExcelDateString(paidDateRaw);

      // Extract Due Date Day from installment 1
      if (instNo === 1 && parsedDueIso) {
        const parts = parsedDueIso.split('-');
        if (parts.length === 3) {
          dueDateDay = parseInt(parts[2], 10) || 15;
        }
      }

      // Add to schedule array directly from Excel row!
      schedule.push({
        installmentNo: instNo,
        dueDate: parsedDueIso || String(dueVal || ''),
        dueDateThai: dueDateThaiStr,
        installmentAmount: instAmount,
        paidDate: formattedPaidDate,
        paidAmount: paidAmount,
        remainingBalance: remBal !== null ? remBal : undefined,
        receiptNo: formatReceiptNoList(receiptRaw),
        isPaid: paidAmount > 0 || !!formattedPaidDate,
        note: noteRaw || undefined,
      });

      // Check if payment was made for this installment
      if (paidAmount > 0 || formattedPaidDate) {
        paidInstallments++;
        payments.push({
          id: `pay-${sheetName}-${instNo}`,
          contractNo: sheetName,
          receiptNo: formatReceiptNoList(receiptRaw),
          customerName: customerName || sheetName,
          amount: paidAmount > 0 ? paidAmount : instAmount,
          paymentDate: formattedPaidDate || new Date().toISOString().split('T')[0],
          installmentNo: instNo,
          paymentMethod: noteRaw.includes('ตัวแทน') || noteRaw.includes('โอน') ? 'โอนเงิน' : 'เงินสด',
          note: noteRaw || undefined,
        });
      }

      if (remBal !== null && !isNaN(remBal) && remBal >= 0) {
        remainingBalance = remBal;
      }
    }

    // Check Customer Row (Row starting with 'ลูกค้า')
    if (row[0] === 'ลูกค้า' || (typeof row[0] === 'string' && row[0].includes('ลูกค้า'))) {
      if (row[2] && typeof row[2] === 'string') customerName = row[2].replace(/-/g, '').trim();
      if (row[3] && typeof row[3] === 'string') address = row[3].trim();
      if (row[4] && (typeof row[4] === 'string' || typeof row[4] === 'number')) phone = String(row[4]).trim();
    }

    // Check Guarantor Row (Row starting with 'ผู้ค้ำประกัน' or 'ผู้ค้ำ')
    if (row[0] === 'ผู้ค้ำประกัน1' || (typeof row[0] === 'string' && (row[0].includes('ผู้ค้ำ') || row[0].includes('ผู้ค้ำประกัน')))) {
      if (row[2] && typeof row[2] === 'string') guarantorName = row[2].replace(/-/g, '').trim();
      if (row[4] && (typeof row[4] === 'string' || typeof row[4] === 'number')) guarantorPhone = String(row[4]).trim();
    }

    // Check Product Row or Start Date Row
    row.forEach((cell) => {
      if (typeof cell === 'string' && cell.includes('วันทำสัญญา')) {
        const idxCell = row.indexOf(cell);
        if (idxCell !== -1 && row[idxCell + 1]) {
          const parsedStart = parseExcelDateString(row[idxCell + 1]);
          if (parsedStart) startDate = parsedStart;
        }
      }
    });

    if (
      typeof row[0] === 'string' &&
      (row[0].includes('โทรศัพท์') ||
        row[0].includes('รถ') ||
        row[0].includes('เครื่อง') ||
        row[0].includes('ทีวี') ||
        row[0].includes('ตู้เย็น') ||
        row[0].includes('จักรยานยนต์'))
    ) {
      const catText = row[0];
      const brandText = row[1] || '';
      const modelText = row[2] || '';
      const colorText = row[3] || '';
      productName = [catText, brandText, modelText, colorText].filter(Boolean).join(' ');
    }
  });

  const cleanContractNo = sheetName.trim();
  if (!customerName) customerName = `ลูกค้า สัญญา ${cleanContractNo}`;
  if (!phone) phone = `08${Math.floor(10000000 + Math.random() * 90000000)}`;
  if (!address) address = 'เชียงใหม่';
  if (!productName) productName = `${category} (สัญญา ${cleanContractNo})`;

  const rawFinancedNum = monthlyInstallment * totalInstallments || 12000;
  const downPayment = Math.round(rawFinancedNum * 0.1);
  const totalPrice = rawFinancedNum + downPayment;

  // Status mapping D0 - D6 & ปิดสัญญาแล้ว
  // Count ONLY installments whose due date has ALREADY PASSED and are NOT paid
  let status: ContractStatus = 'D0 ชำระปกติ';
  if (remainingBalance === 0 && totalInstallments > 0 && paidInstallments >= totalInstallments) {
    status = 'ปิดสัญญาแล้ว';
  } else {
    const todayIso = new Date().toISOString().split('T')[0];
    let overdueCount = 0;

    if (schedule.length > 0) {
      // Use exact schedule dates from Excel
      overdueCount = schedule.filter((s) => !s.isPaid && s.dueDate && s.dueDate < todayIso).length;
    } else {
      // Fallback: count based on paidInstallments vs expected paid by now
      overdueCount = Math.max(0, paidInstallments - totalInstallments);
    }

    const capped = Math.min(6, overdueCount);
    if (capped === 0) status = 'D0 ชำระปกติ';
    else if (capped === 1) status = 'D1 ค้างชำระ 1 เดือน';
    else if (capped === 2) status = 'D2 ค้างชำระ 2 เดือน';
    else if (capped === 3) status = 'D3 ค้างชำระ 3 เดือน';
    else if (capped === 4) status = 'D4 ค้างชำระ 4 เดือน';
    else if (capped === 5) status = 'D5 ค้างชำระ 5 เดือน';
    else status = 'D6 ค้างชำระ 6 เดือน';
  }

  return {
    id: `contract-${cleanContractNo}`,
    contractNo: cleanContractNo,
    customerName,
    guarantorName: guarantorName || undefined,
    guarantorPhone: guarantorPhone || undefined,
    phone,
    address,
    category,
    productName,
    totalPrice,
    downPayment,
    monthlyInstallment,
    totalInstallments,
    paidInstallments,
    remainingBalance,
    dueDateDay: dueDateDay || (index % 28) + 1,
    startDate,
    status,
    payments,
    schedule: schedule.length > 0 ? schedule : undefined,
  };
}
