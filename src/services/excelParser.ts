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
    const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, raw: true, defval: null });

    if (!rawRows || rawRows.length === 0) return;

    const contract = parseSingleCustomerSheet(sheetName, rawRows, category, index);
    if (contract) {
      contracts.push(contract);
    }
  });

  return contracts;
}

function parseExcelDateString(val: any): string | undefined {
  if (!val && val !== 0) return undefined;

  // Handle JS Date objects (XLSX sometimes returns these even with raw:true)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return undefined;
    // JS Date stores CE year - use UTC to avoid timezone shifts
    const yyyy = val.getUTCFullYear();
    const mm = String(val.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(val.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  if (typeof val === 'number') {
    // Excel serial date (base date = Dec 30, 1899)
    // Serial 1 = Jan 1 1900, Serial 25569 = Jan 1 1970
    if (val < 1000) return undefined; // Not a date serial
    const utcMs = (val - 25569) * 86400 * 1000;
    const dateObj = new Date(utcMs);
    if (isNaN(dateObj.getTime())) return undefined;
    const yyyy = dateObj.getUTCFullYear();
    const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getUTCDate()).padStart(2, '0');
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
      // Convert Buddhist Era to CE
      if (y > 2500) y -= 543;
      if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
    // Return as-is if it already looks like ISO format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    return undefined;
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

      // isPaid = ชำระครบยอดงวด (>= installmentAmount)
      // isPartiallyPaid = ชำระบางส่วน (0 < paidAmount < installmentAmount)
      const isFullyPaid = instAmount > 0 && paidAmount >= instAmount;
      const isPartiallyPaid = paidAmount > 0 && paidAmount < instAmount;

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
        isPaid: isFullyPaid,
        note: isPartiallyPaid ? `ชำระบางส่วน ฿${paidAmount.toLocaleString('th-TH')}${noteRaw ? '; ' + noteRaw : ''}` : (noteRaw || undefined),
      });

      // Count paidInstallments only for FULLY PAID installments
      if (isFullyPaid) {
        paidInstallments++;
        payments.push({
          id: `pay-${sheetName}-${instNo}`,
          contractNo: sheetName,
          receiptNo: formatReceiptNoList(receiptRaw),
          customerName: customerName || sheetName,
          amount: paidAmount,
          paymentDate: formattedPaidDate || new Date().toISOString().split('T')[0],
          installmentNo: instNo,
          paymentMethod: noteRaw.includes('ตัวแทน') || noteRaw.includes('โอน') ? 'โอนเงิน' : 'เงินสด',
          note: noteRaw || undefined,
        });
      } else if (isPartiallyPaid && formattedPaidDate) {
        // Record partial payment too (for reference), but don't count as paidInstallments
        payments.push({
          id: `pay-partial-${sheetName}-${instNo}`,
          contractNo: sheetName,
          receiptNo: formatReceiptNoList(receiptRaw),
          customerName: customerName || sheetName,
          amount: paidAmount,
          paymentDate: formattedPaidDate,
          installmentNo: instNo,
          paymentMethod: noteRaw.includes('ตัวแทน') || noteRaw.includes('โอน') ? 'โอนเงิน' : 'เงินสด',
          note: `ชำระบางส่วน ฿${paidAmount.toLocaleString('th-TH')}${noteRaw ? '; ' + noteRaw : ''}`,
        });
      }

      // Only update remainingBalance when we have a POSITIVE balance (not overwrite with 0 from unpaid rows)
      if (remBal !== null && !isNaN(remBal) && remBal > 0) {
        remainingBalance = remBal;
      }
    }

    // Check Customer Row (Row starting with 'ลูกค้า')
    if (typeof row[0] === 'string' && row[0].includes('ลูกค้า')) {
      // Try col 2 first (C), then other columns for name
      for (let ci = 1; ci < row.length; ci++) {
        if (row[ci] && typeof row[ci] === 'string' && row[ci].trim().length > 2 && !row[ci].includes('ลูกค้า')) {
          if (!customerName) customerName = row[ci].replace(/-/g, '').trim();
          break;
        }
      }
      // Address usually in col 3 (D)
      if (row[3] && typeof row[3] === 'string' && row[3].trim().length > 2) address = row[3].trim();
      // Phone: find a cell with 9-10 digit number
      for (let ci = 3; ci < row.length; ci++) {
        if (row[ci] && /^\d{9,10}$/.test(String(row[ci]).trim())) {
          phone = String(row[ci]).trim();
          break;
        }
      }
    }

    // Check Guarantor Row
    if (typeof row[0] === 'string' && (row[0].includes('ผู้ค้ำ') || row[0].includes('ค้ำประกัน'))) {
      for (let ci = 1; ci < row.length; ci++) {
        if (row[ci] && typeof row[ci] === 'string' && row[ci].trim().length > 2 && !row[ci].includes('ค้ำ') && !row[ci].includes('ประกัน')) {
          if (!guarantorName) guarantorName = row[ci].replace(/-/g, '').trim();
          break;
        }
      }
      for (let ci = 3; ci < row.length; ci++) {
        if (row[ci] && /^\d{9,10}$/.test(String(row[ci]).trim())) {
          guarantorPhone = String(row[ci]).trim();
          break;
        }
      }
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

  // Use Thailand local date (UTC+7)
  const nowUtc = new Date();
  const thaiOffset = 7 * 60 * 60 * 1000;
  const thaiNow = new Date(nowUtc.getTime() + thaiOffset);
  const todayIso = thaiNow.toISOString().split('T')[0];

  if (paidInstallments > 0 && paidInstallments >= totalInstallments && totalInstallments > 0) {
    status = 'ปิดสัญญาแล้ว';
  } else {
    let overdueCount = 0;

    // Try 1: Use exact schedule dates from Excel
    const validScheduleDates = schedule.filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s.dueDate || ''));
    if (validScheduleDates.length > 0) {
      overdueCount = validScheduleDates.filter((s) => !s.isPaid && s.dueDate! < todayIso).length;
    } else if (startDate && monthlyInstallment > 0) {
      // Fallback: estimate based on contract start date + dueDateDay
      // How many installments should have been paid by today?
      const startParts = startDate.split('-');
      const startYear = parseInt(startParts[0], 10);
      const startMonth = parseInt(startParts[1], 10);
      const todayParts = todayIso.split('-');
      const todayYear = parseInt(todayParts[0], 10);
      const todayMonth = parseInt(todayParts[1], 10);
      const monthsElapsed = (todayYear - startYear) * 12 + (todayMonth - startMonth);
      const expectedPaid = Math.min(totalInstallments, Math.max(0, monthsElapsed));
      overdueCount = Math.max(0, expectedPaid - paidInstallments);
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
