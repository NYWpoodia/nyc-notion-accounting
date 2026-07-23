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
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: fullMonth ? 'long' : 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
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
