import * as XLSX from 'xlsx';
import { CustomerContract, ProductCategory, ContractStatus } from '../types';

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

  rows.forEach((row) => {
    if (!Array.isArray(row) || row.length === 0) return;

    // Check Installment Table Row (First column is installment number 1, 2, 3...)
    if (typeof row[0] === 'number' && row.length >= 3) {
      const instNo = row[0];
      const instAmount = Number(row[2]) || 0;
      const paidDate = row[4];
      const paidAmount = Number(row[5]) || 0;
      const remBal = row[6] !== undefined ? Number(row[6]) : null;

      totalInstallments = Math.max(totalInstallments, instNo);
      if (monthlyInstallment === 0 && instAmount > 0) monthlyInstallment = instAmount;

      if (paidAmount > 0 || (paidDate && paidDate !== 0 && paidDate !== '0')) {
        paidInstallments++;
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

    // Check Product Row
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

  const totalPrice = monthlyInstallment * totalInstallments || 12000;
  const downPayment = Math.floor(totalPrice * 0.1);

  // Status mapping D0 - D6 & ปิดสัญญาแล้ว
  let status: ContractStatus = 'D0 ชำระปกติ';
  if (remainingBalance === 0 && totalInstallments > 0 && paidInstallments >= totalInstallments) {
    status = 'ปิดสัญญาแล้ว';
  } else if (remainingBalance > 0) {
    const overdueMonths = Math.min(6, Math.max(1, totalInstallments - paidInstallments));
    if (overdueMonths === 1) status = 'D1 ค้างชำระ 1 เดือน';
    else if (overdueMonths === 2) status = 'D2 ค้างชำระ 2 เดือน';
    else if (overdueMonths === 3) status = 'D3 ค้างชำระ 3 เดือน';
    else if (overdueMonths === 4) status = 'D4 ค้างชำระ 4 เดือน';
    else if (overdueMonths === 5) status = 'D5 ค้างชำระ 5 เดือน';
    else if (overdueMonths >= 6) status = 'D6 ค้างชำระ 6 เดือน';
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
    dueDateDay: (index % 28) + 1,
    startDate: '2026-01-01',
    status,
    payments: [],
  };
}
