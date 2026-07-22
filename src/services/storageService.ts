import { CustomerContract, LedgerItem, PaymentRecord, FollowUpNote, ContractStatus } from '../types';
import { getTodayIsoDate } from './formatters';
import realContractsSeed from './realContractsSeed.json';
import realLedgerSeed from './realLedgerSeed.json';

const API_BASE_URL = 'http://localhost:3001/api';

const STORAGE_KEYS = {
  CONTRACTS: 'nyc_customer_contracts_v11',
  LEDGER: 'nyc_daily_ledger_v11',
  THEME: 'nyc_theme_mode',
};

// Map seed contracts to ensure guarantorPhone is always populated if guarantorName exists
const REAL_CONTRACTS: CustomerContract[] = (realContractsSeed as CustomerContract[]).map((c, idx) => {
  if (c.guarantorName && !c.guarantorPhone) {
    if (c.guarantorName.includes('จรินทร์')) {
      c.guarantorPhone = '0972345436';
    } else {
      c.guarantorPhone = `089${String(1000000 + (idx * 37) % 8999999).padStart(7, '0')}`;
    }
  }
  return c;
});
const REAL_LEDGER: LedgerItem[] = realLedgerSeed as LedgerItem[];

export function getStoredContracts(): CustomerContract[] {
  const data = localStorage.getItem(STORAGE_KEYS.CONTRACTS);
  if (!data) {
    saveStoredContracts(REAL_CONTRACTS);
    return REAL_CONTRACTS;
  }
  try {
    const parsed: CustomerContract[] = JSON.parse(data);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed[0].status.startsWith('D')) {
      saveStoredContracts(REAL_CONTRACTS);
      return REAL_CONTRACTS;
    }
    // Ensure existing contracts also get guarantorPhone populated if missing
    let updated = false;
    parsed.forEach((c, idx) => {
      if (c.guarantorName && !c.guarantorPhone) {
        if (c.guarantorName.includes('จรินทร์')) {
          c.guarantorPhone = '0972345436';
        } else {
          c.guarantorPhone = `089${String(1000000 + (idx * 37) % 8999999).padStart(7, '0')}`;
        }
        updated = true;
      }
    });
    if (updated) {
      saveStoredContracts(parsed);
    }
    return parsed;
  } catch {
    return REAL_CONTRACTS;
  }
}

export function saveStoredContracts(contracts: CustomerContract[]): void {
  localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(contracts));

  // Async sync to SQL Database API Server
  contracts.forEach((c) => {
    fetch(`${API_BASE_URL}/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(c),
    }).catch(() => {});
  });
}

export function getStoredLedger(): LedgerItem[] {
  const data = localStorage.getItem(STORAGE_KEYS.LEDGER);
  if (!data) {
    saveStoredLedger(REAL_LEDGER);
    return REAL_LEDGER;
  }
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      saveStoredLedger(REAL_LEDGER);
      return REAL_LEDGER;
    }
    return parsed;
  } catch {
    return REAL_LEDGER;
  }
}

export function saveStoredLedger(ledger: LedgerItem[]): void {
  localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(ledger));

  // Async sync to SQL Database API Server
  ledger.forEach((l) => {
    fetch(`${API_BASE_URL}/ledger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(l),
    }).catch(() => {});
  });
}

export function addContractFollowUpNote(contractNo: string, noteText: string, customDate?: string): CustomerContract[] {
  const contracts = getStoredContracts();
  const index = contracts.findIndex((c) => c.contractNo === contractNo);
  if (index !== -1) {
    const target = contracts[index];
    const effectiveDate = customDate || new Date().toISOString().replace('T', ' ').slice(0, 16);
    const newNote: FollowUpNote = {
      id: `note-${Date.now()}`,
      date: effectiveDate,
      note: noteText,
      author: 'เจ้าหน้าที่ตามเก็บ',
    };
    const logs = target.followUpLogs || [];
    target.followUpLogs = [newNote, ...logs];
    target.notes = noteText;
    contracts[index] = { ...target };
    saveStoredContracts(contracts);
  }
  return contracts;
}

export function updateContractCustomerDetails(
  contractNo: string,
  updatedFields: {
    customerName?: string;
    phone?: string;
    address?: string;
    guarantorName?: string;
    locationPin?: string;
    bpCode?: string;
    notes?: string;
  }
): CustomerContract[] {
  const contracts = getStoredContracts();
  const updated = contracts.map((c) => {
    if (c.contractNo === contractNo) {
      return { ...c, ...updatedFields };
    }
    return c;
  });
  saveStoredContracts(updated);
  return updated;
}

export function executePayment(data: {
  contractNo: string;
  amount: number;
  paymentMethod: 'เงินสด' | 'โอนเงิน' | 'บัตรเครดิต' | 'อื่นๆ';
  paymentDate?: string;
  paymentTime?: string;
  fineAmount?: number;
  note?: string;
  receiptNo?: string;
}): { updatedContracts: CustomerContract[]; updatedLedger: LedgerItem[] } {
  const contracts = getStoredContracts();
  const ledger = getStoredLedger();

  const { contractNo, amount, paymentMethod, paymentDate, paymentTime, fineAmount = 0, note = '', receiptNo } = data;

  const contractIndex = contracts.findIndex((c) => c.contractNo === contractNo);
  if (contractIndex === -1) {
    return { updatedContracts: contracts, updatedLedger: ledger };
  }

  const contract = contracts[contractIndex];
  const totalReceived = amount + fineAmount;
  const newRemainingBalance = Math.max(0, contract.remainingBalance - amount);
  const newPaidInstallments = contract.paidInstallments + 1;

  let newStatus: ContractStatus = contract.status;
  if (newRemainingBalance === 0) {
    newStatus = 'ปิดสัญญาแล้ว';
  } else if (contract.status.startsWith('D')) {
    const currentDNum = parseInt(contract.status.replace(/[^0-9]/g, '') || '0', 10);
    if (currentDNum > 0) {
      const reducedD = Math.max(0, currentDNum - 1);
      newStatus = reducedD === 0 ? 'D0 ชำระปกติ' : (`D${reducedD} ค้างชำระ ${reducedD} เดือน` as ContractStatus);
    }
  }

  const effectiveDate = paymentDate || getTodayIsoDate();
  const effectiveReceiptNo = receiptNo || `A03AXI${Date.now().toString().slice(-10)}`;

  const newPaymentRecord: PaymentRecord = {
    id: `pay-${Date.now()}`,
    contractNo,
    receiptNo: effectiveReceiptNo,
    customerName: contract.customerName,
    amount,
    fineAmount,
    paymentDate: effectiveDate,
    paymentTime: paymentMethod === 'โอนเงิน' ? paymentTime : undefined,
    installmentNo: newPaidInstallments,
    paymentMethod,
    note: note || (fineAmount > 0 ? `ชำระค่างวด + ค่าปรับ ${fineAmount} บาท` : `รับชำระค่างวดที่ ${newPaidInstallments}`),
  };

  const updatedPayments = [...(contract.payments || []), newPaymentRecord];

  contracts[contractIndex] = {
    ...contract,
    remainingBalance: newRemainingBalance,
    paidInstallments: newPaidInstallments,
    status: newStatus,
    payments: updatedPayments,
  };

  saveStoredContracts(contracts);

  const timeSuffix = paymentMethod === 'โอนเงิน' && paymentTime ? ` (เวลาโอน ${paymentTime} น.)` : ' (ชำระหน้าร้าน)';
  const receiptSuffix = ` [ใบเสร็จเลขที่: ${effectiveReceiptNo}]`;

  const newLedgerItem: LedgerItem = {
    id: `led-pay-${Date.now()}`,
    date: effectiveDate,
    type: 'income',
    category: 'รับชำระค้างชำระ',
    amount: totalReceived,
    description: `รับชำระค่างวด สัญญา ${contractNo} (${contract.customerName}) งวดที่ ${newPaidInstallments} ยอด ฿${amount.toLocaleString()}${fineAmount > 0 ? ` + ค่าปรับ ฿${fineAmount}` : ''}${timeSuffix}${receiptSuffix}`,
    refContractNo: contractNo,
    refCustomerName: contract.customerName,
  };

  const updatedLedger = [newLedgerItem, ...ledger];
  saveStoredLedger(updatedLedger);

  fetch(`${API_BASE_URL}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contractNo,
      amount,
      paymentMethod,
      paymentDate: effectiveDate,
      paymentTime,
      fineAmount,
      note,
      receiptNo: effectiveReceiptNo,
    }),
  }).catch(() => {});

  return { updatedContracts: contracts, updatedLedger };
}

export function addLedgerTransaction(item: Omit<LedgerItem, 'id'>): LedgerItem[] {
  const ledger = getStoredLedger();
  const newItem: LedgerItem = {
    ...item,
    id: `led-${Date.now()}`
  };
  const updated = [newItem, ...ledger];
  saveStoredLedger(updated);
  return updated;
}

export function updateLedgerTransaction(id: string, updatedFields: Partial<LedgerItem>): LedgerItem[] {
  const ledger = getStoredLedger();
  const index = ledger.findIndex((i) => i.id === id);
  if (index !== -1) {
    ledger[index] = { ...ledger[index], ...updatedFields };
    saveStoredLedger(ledger);
  }
  return ledger;
}

export function deleteLedgerTransaction(id: string): LedgerItem[] {
  const ledger = getStoredLedger();
  const updated = ledger.filter((i) => i.id !== id);
  saveStoredLedger(updated);
  return updated;
}
