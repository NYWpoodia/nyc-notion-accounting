import { ContractStatus } from '../types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('th-TH').format(amount);
}

// Format multiple receipt codes with semicolon delimiter e.g. "A03AXI0569000132; A03AXI0669000120"
export function formatReceiptNoList(str?: string): string {
  if (!str) return '-';
  const cleanStr = str.trim();
  if (cleanStr.includes(';')) {
    return cleanStr.split(';').map(s => s.trim()).filter(Boolean).join('; ');
  }
  // Match consecutive receipt codes concatenated without delimiters
  const matches = cleanStr.match(/A03AXI\d+/g);
  if (matches && matches.length > 1) {
    return Array.from(new Set(matches)).join('; ');
  }
  return cleanStr;
}

// Thai Full / Short Date e.g. "22 ก.ค. 2569"
export function formatThaiDate(dateStr?: string, fullMonth: boolean = false): string {
  if (!dateStr) return '-';
  
  const shortMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const longMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const monthList = fullMonth ? longMonths : shortMonths;

  const cleanStr = String(dateStr).trim();
  if (cleanStr === '-' || cleanStr === '0') return '-';

  // Handle DD/MM/YYYY or YYYY-MM-DD
  const parts = cleanStr.split(/[\/\.-]/);
  if (parts.length === 3) {
    let day = 0;
    let month = 0;
    let year = 0;

    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    } else {
      // DD/MM/YYYY
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    }

    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && month >= 1 && month <= 12) {
      const yearBE = year > 2500 ? year : year + 543;
      return `${day} ${monthList[month - 1]} ${yearBE}`;
    }
  }

  try {
    const date = new Date(cleanStr);
    if (isNaN(date.getTime())) return cleanStr;
    let y = date.getFullYear();
    if (y > 2500) y -= 543;
    const yearBE = y + 543;
    const m = date.getMonth();
    const d = date.getDate();
    return `${d} ${monthList[m]} ${yearBE}`;
  } catch {
    return cleanStr;
  }
}

// Thai Date & 24-Hour Time e.g. "22 ก.ค. 2569 เวลา 14:30 น."
export function formatThaiDateTime(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const dateFormatted = new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${dateFormatted} เวลา ${hours}:${minutes} น.`;
  } catch {
    return dateStr;
  }
}

// 24-Hour Time Format e.g. "14:30 น."
export function format24HourTime(timeStr?: string): string {
  if (!timeStr) return '-';
  const clean = timeStr.trim();
  if (clean.includes(':')) {
    const parts = clean.split(':');
    const h = String(parts[0]).padStart(2, '0');
    const m = String(parts[1]).padStart(2, '0');
    return `${h}:${m} น.`;
  }
  return `${clean} น.`;
}

export function getTodayIsoDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

export function getContractStatusStyle(status: ContractStatus): {
  variant: 'green' | 'amber' | 'rose' | 'blue' | 'purple' | 'default';
  label: string;
} {
  switch (status) {
    case 'D0 ชำระปกติ':
      return { variant: 'green', label: 'D0 ชำระปกติ' };
    case 'D1 ค้างชำระ 1 เดือน':
      return { variant: 'amber', label: 'D1 ค้าง 1 เดือน' };
    case 'D2 ค้างชำระ 2 เดือน':
      return { variant: 'amber', label: 'D2 ค้าง 2 เดือน' };
    case 'D3 ค้างชำระ 3 เดือน':
      return { variant: 'rose', label: 'D3 ค้าง 3 เดือน' };
    case 'D4 ค้างชำระ 4 เดือน':
      return { variant: 'rose', label: 'D4 ค้าง 4 เดือน' };
    case 'D5 ค้างชำระ 5 เดือน':
      return { variant: 'rose', label: 'D5 ค้าง 5 เดือน' };
    case 'D6 ค้างชำระ 6 เดือน':
      return { variant: 'purple', label: 'D6 ค้าง 6 เดือน' };
    case 'ปิดสัญญาแล้ว':
      return { variant: 'blue', label: 'ปิดสัญญาแล้ว' };
    default:
      return { variant: 'default', label: status || 'ไม่ระบุ' };
  }
}
