export type ProductCategory = 'มือถือ' | 'รถมอเตอร์ไซด์' | 'เครื่องใช้ไฟฟ้า' | 'อื่นๆ';

export type ContractStatus =
  | 'D0 ชำระปกติ'
  | 'D1 ค้างชำระ 1 เดือน'
  | 'D2 ค้างชำระ 2 เดือน'
  | 'D3 ค้างชำระ 3 เดือน'
  | 'D4 ค้างชำระ 4 เดือน'
  | 'D5 ค้างชำระ 5 เดือน'
  | 'D6 ค้างชำระ 6 เดือน'
  | 'ปิดสัญญาแล้ว';

export interface ProductItem {
  name: string;
  brand?: string;
  model?: string;
  color?: string;
  serialNo?: string;
  price: number;
}

export interface CustomerProfile {
  id: string;
  bpCode: string;
  customerName: string;
  phone: string;
  guarantorName?: string;
  guarantorPhone?: string;
  address: string;
  locationPin?: string;
  idCardNo?: string;
  createdAt?: string;
  notes?: string;
}

export interface PaymentRecord {
  id: string;
  contractNo: string;
  receiptNo?: string; // เลขที่ใบเสร็จ
  customerName: string;
  amount: number;
  fineAmount?: number;
  paymentDate: string; // ISO format YYYY-MM-DD
  paymentTime?: string; // HH:mm format (if transfer)
  installmentNo: number;
  paymentMethod: 'เงินสด' | 'โอนเงิน' | 'บัตรเครดิต' | 'อื่นๆ';
  note?: string;
}

export interface FollowUpNote {
  id: string;
  date: string; // YYYY-MM-DD HH:mm
  note: string;
  author?: string;
}

export interface CustomerContract {
  id: string; // unique ID or contractNo
  contractNo: string; // e.g. "A03AH136900010"
  bpCode?: string; // BP customer reference code e.g. "BP-6907-0012"
  customerName: string;
  guarantorName?: string; // ชื่อผู้ค้ำประกัน
  guarantorPhone?: string; // เบอร์โทรติดต่อผู้ค้ำประกัน
  phone: string;
  address: string;
  locationPin?: string; // GPS Coordinates e.g. "18.7883, 98.9853" or Google Maps URL
  googleMapsUrl?: string; // Link to Google Maps location
  idCardNo?: string;
  category: ProductCategory; // 3 Main Categories matching Excel: 'มือถือ' | 'รถมอเตอร์ไซด์' | 'เครื่องใช้ไฟฟ้า' | 'อื่นๆ'
  subCategory?: string; // ชนิดสินค้าย่อย เช่น โทรศัพท์เคลื่อนที่, ทีวีสี, ตู้เย็น
  productName: string;
  brand?: string;
  model?: string;
  color?: string;
  serialNo?: string;
  saleType?: 'เงินผ่อน' | 'เงินสด';
  items?: ProductItem[];
  totalPrice: number;
  downPayment: number;
  monthlyInstallment: number;
  totalInstallments: number;
  paidInstallments: number;
  remainingBalance: number;
  dueDateDay: number; // e.g., 5th or 15th of month
  startDate: string;
  status: ContractStatus;
  notes?: string;
  followUpLogs?: FollowUpNote[];
  payments: PaymentRecord[];
}

export type LedgerType = 'income' | 'expense';

export interface LedgerItem {
  id: string;
  date: string; // YYYY-MM-DD
  type: LedgerType;
  category: string;
  amount: number;
  description: string;
  refContractNo?: string;
  refCustomerName?: string;
}

export type ViewMode = 'dashboard' | 'sales' | 'customers' | 'debtors' | 'monthly-report' | 'ledger' | 'import';
