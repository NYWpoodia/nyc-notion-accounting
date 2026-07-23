import React, { useState, useMemo } from 'react';
import { CustomerContract, CustomerProfile, ProductCategory } from '../../types';
import { NotionCard } from '../ui/NotionCard';
import { NotionButton } from '../ui/NotionButton';
import { NotionBadge } from '../ui/NotionBadge';
import { formatCurrency, getTodayIsoDate } from '../../services/formatters';
import { ShoppingBag, Search, User, Phone, MapPin, Package, CreditCard, Calendar, CheckCircle2, ShieldCheck, Sparkles, UserCheck, Shield, Plus, Tag, Layers, Navigation } from 'lucide-react';

interface SalesViewProps {
  existingContracts: CustomerContract[];
  customerProfiles?: CustomerProfile[];
  onAddContract: (contract: CustomerContract) => void;
  onAddLedgerIncome: (amount: number, category: string, description: string, refContractNo: string, refCustomerName: string) => void;
}

// Sub-categories mapped strictly by Main Category (Queried matching Excel files)
const CATEGORY_SUB_MAPPING: Record<ProductCategory, string[]> = {
  'มือถือ': [
    'โทรศัพท์เคลื่อนที่',
    'แท็บเล็ต / iPad',
    'สมาร์ทวอทช์ / อุปกรณ์เสริม'
  ],
  'รถมอเตอร์ไซด์': [
    'รถจักรยานยนต์',
    'รถมอเตอร์ไซค์ไฟฟ้า',
    'รถสามล้อ / พ่วงข้าง'
  ],
  'เครื่องใช้ไฟฟ้า': [
    'ทีวีสี',
    'ตู้เย็น',
    'เครื่องซักผ้า-อบผ้า',
    'เครื่องปรับอากาศ',
    'พัดลม',
    'เครื่องใช้ไฟฟ้าเล็ก / ไมโครเวฟ',
    'คอมพิวเตอร์ / โน้ตบุ๊ก',
    'เครื่องเล่นเกมส์'
  ],
  'อื่นๆ': [
    'สินค้าอื่นๆ'
  ]
};

export const SalesView: React.FC<SalesViewProps> = ({
  existingContracts,
  customerProfiles = [],
  onAddContract,
  onAddLedgerIncome,
}) => {
  const [saleType, setSaleType] = useState<'เงินผ่อน' | 'เงินสด'>('เงินผ่อน');

  // Buyer Search & Auto-fill State (Searches by BP, Name, Phone, or ID Card No)
  const [buyerSearchQuery, setBuyerSearchQuery] = useState('');
  const [showBuyerDropdown, setShowBuyerDropdown] = useState(false);

  // Guarantor Search & Auto-fill State (Searches by BP, Name, Phone, or ID Card No)
  const [guarantorSearchQuery, setGuarantorSearchQuery] = useState('');
  const [showGuarantorDropdown, setShowGuarantorDropdown] = useState(false);

  // Form Fields - Customer Info
  const [contractNo, setContractNo] = useState('');
  const [bpCode, setBpCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [locationPin, setLocationPin] = useState('');
  const [idCardNo, setIdCardNo] = useState('');
  const [geoLocating, setGeoLocating] = useState(false);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์นี้ไม่รองรับการดึงพิกัด GPS อัตโนมัติ กรุณากรอกพิกัดด้วยตนเอง');
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setLocationPin(`${lat}, ${lng}`);
        setGeoLocating(false);
      },
      () => {
        alert('ไม่สามารถดึงพิกัด GPS ได้');
        setGeoLocating(false);
      }
    );
  };

  // 3 Main Categories matching Excel files strictly
  const [category, setCategory] = useState<ProductCategory>('มือถือ');
  const [customSubCategoryMap, setCustomSubCategoryMap] = useState<Record<string, string[]>>({});

  // Compute sub-categories specifically for the currently selected category
  const availableSubCategories = useMemo(() => {
    const defaults = CATEGORY_SUB_MAPPING[category] || [];
    const fromContracts = existingContracts
      .filter((c) => c.category === category && c.subCategory)
      .map((c) => c.subCategory!);
    const customList = customSubCategoryMap[category] || [];
    return Array.from(new Set([...defaults, ...fromContracts, ...customList])).filter(Boolean);
  }, [category, existingContracts, customSubCategoryMap]);

  const [subCategory, setSubCategory] = useState<string>('โทรศัพท์เคลื่อนที่');
  const [isAddingNewSub, setIsAddingNewSub] = useState<boolean>(false);
  const [newSubInput, setNewSubInput] = useState<string>('');

  const handleCategoryChange = (newCat: ProductCategory) => {
    setCategory(newCat);
    const defaults = CATEGORY_SUB_MAPPING[newCat] || [];
    const fromContracts = existingContracts
      .filter((c) => c.category === newCat && c.subCategory)
      .map((c) => c.subCategory!);
    const customList = customSubCategoryMap[newCat] || [];
    const combined = Array.from(new Set([...defaults, ...fromContracts, ...customList])).filter(Boolean);
    setSubCategory(combined[0] || '');
  };

  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [serialNo, setSerialNo] = useState('');
  
  // Helper functions for Thai currency comma formatting
  const formatInputWithCommas = (val: string | number) => {
    const digitsOnly = String(val).replace(/\D/g, '');
    if (!digitsOnly) return '';
    return Number(digitsOnly).toLocaleString('en-US');
  };

  const parseDigitsOnly = (val: string | number) => {
    const digitsOnly = String(val).replace(/\D/g, '');
    return digitsOnly ? Number(digitsOnly) : 0;
  };

  const [totalPrice, setTotalPrice] = useState<string>('15,000');

  // Form Fields - Payment & Installment Terms (Up to 60 Installments)
  const [downPayment, setDownPayment] = useState<string>('3,000');
  const [totalInstallments, setTotalInstallments] = useState<number>(12);
  const [monthlyInstallment, setMonthlyInstallment] = useState<string>('1,000');
  const [dueDateDay, setDueDateDay] = useState<number>(15);
  const now = new Date();
  const [startDay, setStartDay] = useState<number>(now.getDate());
  const [startMonth, setStartMonth] = useState<number>(now.getMonth() + 1);
  const [startYearBE, setStartYearBE] = useState<number>(2569);

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const startDate = `${startYearBE > 2500 ? startYearBE - 543 : startYearBE}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
  const [paymentMethod, setPaymentMethod] = useState<'โอนเงิน' | 'เงินสด' | 'บัตรเครดิต'>('โอนเงิน');

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add new custom sub-category handler for the currently selected category
  const handleAddNewSubCategory = () => {
    if (!newSubInput.trim()) return;
    const trimmed = newSubInput.trim();
    const currentList = customSubCategoryMap[category] || [];
    if (!currentList.includes(trimmed)) {
      setCustomSubCategoryMap({
        ...customSubCategoryMap,
        [category]: [...currentList, trimmed]
      });
    }
    setSubCategory(trimmed);
    setNewSubInput('');
    setIsAddingNewSub(false);
  };

  // Filter matching buyers from Customer Master Profiles first, then fallback to existing contracts
  const matchingMasterProfiles = customerProfiles.filter((p) => {
    if (!buyerSearchQuery.trim()) return false;
    const q = buyerSearchQuery.toLowerCase().trim();
    return (
      p.customerName.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      (p.bpCode && p.bpCode.toLowerCase().includes(q)) ||
      (p.idCardNo && p.idCardNo.includes(q))
    );
  });

  const matchingContractsBuyers = existingContracts.filter((c) => {
    if (!buyerSearchQuery.trim()) return false;
    const q = buyerSearchQuery.toLowerCase().trim();
    return (
      c.customerName.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.bpCode && c.bpCode.toLowerCase().includes(q)) ||
      (c.idCardNo && c.idCardNo.includes(q)) ||
      c.contractNo.toLowerCase().includes(q)
    );
  });

  // Filter matching guarantors by BP Code, Name, Phone, or ID Card No
  const matchingGuarantors = existingContracts.filter((c) => {
    if (!guarantorSearchQuery.trim()) return false;
    const q = guarantorSearchQuery.toLowerCase().trim();
    const gNameMatches = c.guarantorName && c.guarantorName.toLowerCase().includes(q);
    const cNameMatches = c.customerName.toLowerCase().includes(q);
    const phoneMatches = c.phone.includes(q);
    const idMatches = c.idCardNo && c.idCardNo.includes(q);
    const bpMatches = c.bpCode && c.bpCode.toLowerCase().includes(q);
    return gNameMatches || cNameMatches || phoneMatches || idMatches || bpMatches;
  });

  const handleSelectExistingBuyerProfile = (p: CustomerProfile) => {
    setCustomerName(p.customerName);
    setPhone(p.phone);
    setAddress(p.address);
    if (p.locationPin) setLocationPin(p.locationPin);
    if (p.idCardNo) setIdCardNo(p.idCardNo);
    if (p.guarantorName) setGuarantorName(p.guarantorName);
    if (p.guarantorPhone) setGuarantorPhone(p.guarantorPhone);
    setBpCode(p.bpCode || `BP-6907-${Math.floor(1000 + Math.random() * 9000)}`);
    setBuyerSearchQuery('');
    setShowBuyerDropdown(false);
  };

  const handleSelectExistingBuyer = (c: CustomerContract) => {
    setCustomerName(c.customerName);
    setPhone(c.phone);
    setAddress(c.address);
    if (c.locationPin) setLocationPin(c.locationPin);
    if (c.idCardNo) setIdCardNo(c.idCardNo);
    if (c.guarantorName) setGuarantorName(c.guarantorName);
    if (c.guarantorPhone) setGuarantorPhone(c.guarantorPhone);
    setBpCode(c.bpCode || `BP-${c.contractNo}`);
    setBuyerSearchQuery('');
    setShowBuyerDropdown(false);
  };

  const handleSelectExistingGuarantor = (c: CustomerContract) => {
    const nameToUse = c.guarantorName || c.customerName;
    setGuarantorName(nameToUse);
    setGuarantorSearchQuery('');
    setShowGuarantorDropdown(false);
  };

  // Auto-calculate monthly installment with commas
  const handleCalculateInstallment = (priceVal: number, downVal: number, instCount: number) => {
    const financed = Math.max(0, priceVal - downVal);
    if (instCount > 0 && financed > 0) {
      const calcMonthly = Math.ceil(financed / instCount);
      setMonthlyInstallment(formatInputWithCommas(calcMonthly));
    } else {
      setMonthlyInstallment('0');
    }
  };

  const handlePriceChange = (val: string) => {
    const formatted = formatInputWithCommas(val);
    setTotalPrice(formatted);
    const p = parseDigitsOnly(val);
    const d = parseDigitsOnly(downPayment);
    handleCalculateInstallment(p, d, totalInstallments);
  };

  const handleDownPaymentChange = (val: string) => {
    const formatted = formatInputWithCommas(val);
    setDownPayment(formatted);
    const p = parseDigitsOnly(totalPrice);
    const d = parseDigitsOnly(val);
    handleCalculateInstallment(p, d, totalInstallments);
  };

  const handleMonthlyInstallmentChange = (val: string) => {
    const formatted = formatInputWithCommas(val);
    setMonthlyInstallment(formatted);
  };

  const handleInstallmentCountChange = (count: number) => {
    const cappedCount = Math.min(60, Math.max(1, count));
    setTotalInstallments(cappedCount);
    const p = parseDigitsOnly(totalPrice);
    const d = parseDigitsOnly(downPayment);
    handleCalculateInstallment(p, d, cappedCount);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseDigitsOnly(totalPrice);
    if (!contractNo.trim() || !customerName.trim() || !phone.trim() || priceNum <= 0) {
      alert('กรุณากรอก เลขที่สัญญา, ชื่อผู้ซื้อ, เบอร์โทร และราคาสินค้าให้ครบถ้วน');
      return;
    }

    const downNum = saleType === 'เงินสด' ? priceNum : parseDigitsOnly(downPayment);
    const monthlyNum = saleType === 'เงินสด' ? 0 : parseDigitsOnly(monthlyInstallment);
    const remainingNum = Math.max(0, priceNum - downNum);
    const statusVal = saleType === 'เงินสด' || remainingNum === 0 ? 'ปิดสัญญาแล้ว' : 'D0 ชำระปกติ';

    const fullProductName = [subCategory, brand, model, color].filter(Boolean).join(' ') || `${category} สินค้าใหม่`;

    const newContract: CustomerContract = {
      id: `contract-${contractNo.trim()}-${Date.now()}`,
      contractNo: contractNo.trim(),
      bpCode: bpCode.trim() || `BP-${contractNo.trim()}`,
      customerName: customerName.trim(),
      guarantorName: guarantorName.trim() || undefined,
      guarantorPhone: guarantorPhone.trim() || undefined,
      phone: phone.trim(),
      address: address.trim(),
      locationPin: locationPin.trim() || undefined,
      idCardNo: idCardNo.trim() || undefined,
      category,
      subCategory,
      productName: fullProductName,
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      color: color.trim() || undefined,
      serialNo: serialNo.trim() || undefined,
      saleType,
      totalPrice: priceNum,
      downPayment: downNum,
      monthlyInstallment: monthlyNum,
      totalInstallments: saleType === 'เงินสด' ? 1 : totalInstallments,
      paidInstallments: saleType === 'เงินสด' ? 1 : 0,
      remainingBalance: remainingNum,
      dueDateDay,
      startDate,
      status: statusVal,
      payments: downNum > 0 ? [
        {
          id: `pay-down-${Date.now()}`,
          contractNo: contractNo.trim(),
          customerName: customerName.trim(),
          amount: downNum,
          paymentDate: startDate,
          installmentNo: saleType === 'เงินสด' ? 1 : 0,
          paymentMethod,
          note: saleType === 'เงินสด' ? 'ชำระเงินสดเต็มจำนวน' : 'ชำระเงินดาวน์วันทำสัญญา'
        }
      ] : []
    };

    onAddContract(newContract);

    // Auto sync income to Daily Ledger
    if (saleType === 'เงินสด') {
      onAddLedgerIncome(
        priceNum,
        'ขายสดหน้าร้าน',
        `ขายสดหน้าร้าน สัญญา ${contractNo} (${customerName}) สินค้า ${fullProductName}`,
        contractNo,
        customerName
      );
    } else if (downNum > 0) {
      onAddLedgerIncome(
        downNum,
        'ขายสดหน้าร้าน',
        `รับเงินดาวน์ขายผ่อน สัญญา ${contractNo} (${customerName}) สินค้า ${fullProductName}`,
        contractNo,
        customerName
      );
    }

    setSuccessMsg(
      `เปิดสัญญาขายสำเร็จ! สัญญาเลขที่ ${contractNo} (${customerName}) บันทึกข้อมูลเข้าฐานข้อมูลและซิงค์ลงสมุดบัญชีประจำวันให้อัตโนมัติแล้ว`
    );

    // Reset Form
    setTimeout(() => {
      setSuccessMsg(null);
      setContractNo('');
      setBpCode('');
      setCustomerName('');
      setGuarantorName('');
      setPhone('');
      setAddress('');
      setIdCardNo('');
      setBrand('');
      setModel('');
      setColor('');
      setSerialNo('');
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Top Banner Header */}
      <div className="bg-notion-card-light dark:bg-notion-card-dark p-6 rounded-2xl border border-notion-border-light dark:border-notion-border-dark shadow-notion-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-notion-accent-blue/15 text-notion-accent-blue flex items-center justify-center font-bold text-xl">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-notion-text-main dark:text-notion-text-darkMain">
                เปิดสัญญาขายสินค้าใหม่ (Sales POS System)
              </h1>
              <p className="text-xs text-notion-text-muted mt-0.5">
                กรอกเลขที่สัญญาใหม่, ค้นหาผู้ซื้อ/ผู้ค้ำจาก BP/เบอร์/เลขบัตรประชาชน, เลือก 3 หมวดสินค้าหลักตาม Excel และผ่อนได้สูงสุด 60 งวด
              </p>
            </div>
          </div>

          {/* Sale Type Switcher */}
          <div className="flex items-center p-1 bg-notion-sidebar-light dark:bg-notion-sidebar-dark rounded-xl border border-notion-border-light dark:border-notion-border-dark text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSaleType('เงินผ่อน')}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                saleType === 'เงินผ่อน'
                  ? 'bg-notion-accent-blue text-white shadow-notion-sm'
                  : 'text-notion-text-muted hover:text-notion-text-main'
              }`}
            >
              🛒 ขายเงินผ่อน (Installment Sale)
            </button>
            <button
              type="button"
              onClick={() => setSaleType('เงินสด')}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                saleType === 'เงินสด'
                  ? 'bg-emerald-600 text-white shadow-notion-sm'
                  : 'text-notion-text-muted hover:text-notion-text-main'
              }`}
            >
              💵 ขายเงินสด (Cash Sale)
            </button>
          </div>
        </div>
      </div>

      {successMsg ? (
        <div className="p-8 text-center space-y-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/30">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto animate-bounce" />
          <h3 className="font-bold text-lg text-emerald-700 dark:text-emerald-300">
            บันทึกการขายสำเร็จเรียบร้อย!
          </h3>
          <p className="text-xs text-notion-text-muted max-w-md mx-auto">{successMsg}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: ข้อมูลสัญญา, ผู้ซื้อ & ผู้ค้ำประกัน */}
          <NotionCard
            title="1. ข้อมูลสัญญา, ผู้ซื้อ และผู้ค้ำประกัน (Contract & Buyer / Guarantor Info)"
            subtitle="กรอกเลขที่สัญญาใหม่ ค้นหาผู้ซื้อ/ผู้ค้ำประกันจาก BP, เบอร์โทร, เลขบัตรประชาชน หรือกรอกใหม่"
            icon={<User className="w-4 h-4 text-notion-accent-blue" />}
          >
            <div className="space-y-4 text-xs">
              {/* Dual Lookup Grid: Buyer Lookup & Guarantor Lookup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                {/* 1. Buyer Search Bar */}
                <div className="space-y-1.5 relative">
                  <label className="block font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>ค้นหาข้อมูลผู้ซื้อเดิม (ค้นจาก รหัส BP / เบอร์โทร / บัตรประชาชน)</span>
                  </label>
                  <input
                    type="text"
                    value={buyerSearchQuery}
                    onChange={(e) => {
                      setBuyerSearchQuery(e.target.value);
                      setShowBuyerDropdown(true);
                    }}
                    placeholder="พิมพ์ รหัส BP (เช่น 1043342), ชื่อ, เบอร์โทร หรือเลขบัตรประชาชน..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain"
                  />
                  {showBuyerDropdown && (matchingMasterProfiles.length > 0 || matchingContractsBuyers.length > 0) && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-48 overflow-y-auto rounded-xl border border-notion-border-light dark:border-notion-border-dark bg-notion-card-light dark:bg-notion-card-dark divide-y divide-notion-border-light dark:divide-notion-border-dark shadow-notion-md">
                      {matchingMasterProfiles.slice(0, 5).map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectExistingBuyerProfile(p)}
                          className="p-2.5 flex items-center justify-between notion-hover-bg cursor-pointer bg-cyan-500/5 hover:bg-cyan-500/10"
                        >
                          <div>
                            <span className="font-bold text-notion-accent-blue">{p.customerName}</span>
                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-mono font-bold text-[10px]">
                              BP: {p.bpCode}
                            </span>
                            <span className="ml-1.5 text-notion-text-muted font-mono">({p.phone})</span>
                          </div>
                          <span className="text-[10px] text-cyan-600 font-semibold bg-cyan-500/10 px-1.5 py-0.5 rounded">
                            Master Profile
                          </span>
                        </div>
                      ))}

                      {matchingContractsBuyers
                        .filter((c) => !matchingMasterProfiles.some((p) => p.bpCode === c.bpCode || p.phone === c.phone))
                        .slice(0, 5)
                        .map((c) => (
                          <div
                            key={c.id}
                            onClick={() => handleSelectExistingBuyer(c)}
                            className="p-2.5 flex items-center justify-between notion-hover-bg cursor-pointer"
                          >
                            <div>
                              <span className="font-bold text-notion-accent-blue">{c.customerName}</span>
                              <span className="ml-1.5 px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-[10px]">
                                BP: {c.bpCode || c.contractNo}
                              </span>
                              <span className="ml-1.5 text-notion-text-muted font-mono">({c.phone})</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* 2. Guarantor Search Bar */}
                <div className="space-y-1.5 relative">
                  <label className="block font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    <span>ค้นหาข้อมูลผู้ค้ำประกัน (ค้นจาก BP / ชื่อ / เบอร์โทร / บัตรประชาชน)</span>
                  </label>
                  <input
                    type="text"
                    value={guarantorSearchQuery}
                    onChange={(e) => {
                      setGuarantorSearchQuery(e.target.value);
                      setShowGuarantorDropdown(true);
                    }}
                    placeholder="พิมพ์ชื่อผู้ค้ำเดิม, BP, เบอร์โทร หรือเลขบัตรประชาชน..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain"
                  />
                  {showGuarantorDropdown && matchingGuarantors.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-48 overflow-y-auto rounded-xl border border-notion-border-light dark:border-notion-border-dark bg-notion-card-light dark:bg-notion-card-dark divide-y divide-notion-border-light dark:divide-notion-border-dark shadow-notion-md">
                      {matchingGuarantors.slice(0, 5).map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectExistingGuarantor(c)}
                          className="p-2 flex items-center justify-between notion-hover-bg cursor-pointer"
                        >
                          <div>
                            <span className="font-bold text-purple-600 dark:text-purple-400">
                              {c.guarantorName || c.customerName}
                            </span>
                            <span className="ml-1.5 text-notion-text-muted font-mono">({c.phone})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-notion-text-muted mb-1">
                    เลขที่สัญญา (กรอกใหม่) *
                  </label>
                  <input
                    type="text"
                    required
                    value={contractNo}
                    onChange={(e) => setContractNo(e.target.value)}
                    placeholder="กรอกเลขที่สัญญาใหม่ เช่น A03AH136900..."
                    className="w-full px-3 py-2 rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-accent-blue font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-notion-text-muted mb-1">
                    รหัส BP (BP Code)
                  </label>
                  <input
                    type="text"
                    value={bpCode}
                    onChange={(e) => setBpCode(e.target.value)}
                    placeholder="เช่น: 1043342, 2949309"
                    className="w-full px-3 py-2 rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-mono font-bold text-emerald-600 dark:text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-notion-text-muted mb-1">
                    ชื่อ-นามสกุล ผู้ซื้อ *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="เช่น: นางจรรยา ปัญญา"
                    className="w-full px-3 py-2 rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-notion-text-muted mb-1">
                    ชื่อ-นามสกุล ผู้ค้ำประกัน (Guarantor)
                  </label>
                  <input
                    type="text"
                    value={guarantorName}
                    onChange={(e) => setGuarantorName(e.target.value)}
                    placeholder="เช่น: นายจรินทร์ เมพ่วง"
                    className="w-full px-3 py-2 rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-notion-text-muted mb-1">
                    เบอร์ติดต่อ ผู้ค้ำประกัน
                  </label>
                  <input
                    type="text"
                    value={guarantorPhone}
                    onChange={(e) => setGuarantorPhone(e.target.value)}
                    placeholder="0891234567"
                    className="w-full px-3 py-2 rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-notion-text-muted mb-1">
                    เบอร์ติดต่อ ผู้ซื้อ *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0624395309"
                    className="w-full px-3 py-2 rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-notion-text-muted mb-1">
                    เลขบัตรประชาชน ผู้ซื้อ
                  </label>
                  <input
                    type="text"
                    value={idCardNo}
                    onChange={(e) => setIdCardNo(e.target.value)}
                    placeholder="1509900..."
                    className="w-full px-3 py-2 rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-mono"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-notion-text-muted mb-1">
                    ที่อยู่ตามสัญญา *
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="เลขที่ 88 หมู่ 7 ตำบลวังทอง อำเภอเมืองกำแพงเพชร จังหวัดกำแพงเพชร 62000"
                    className="w-full px-3 py-2 rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark"
                  />
                </div>

                <div className="sm:col-span-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-notion-text-muted flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-notion-accent-blue" />
                      <span>พิกัด GPS / ลิงก์ Google Maps โลเคชั่นบ้านลูกค้า</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGetCurrentLocation}
                      disabled={geoLocating}
                      className="px-2.5 py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>{geoLocating ? 'กำลังดึงพิกัด...' : '📍 ดึงพิกัด GPS ปัจจุบัน'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={locationPin}
                    onChange={(e) => setLocationPin(e.target.value)}
                    placeholder="พิกัด GPS เช่น 18.7883, 98.9853 หรือแปะลิงก์ Google Maps..."
                    className="w-full px-3 py-2 rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-mono text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </NotionCard>

          {/* SECTION 2: เลือก 3 หมวดหมู่หลักตาม Excel & เพิ่มชนิดสินค้าย่อย */}
          <NotionCard
            title="2. หมวดหมู่สินค้าตามไฟล์ Excel (Product Category & Details)"
            subtitle="เลือก 3 หมวดหมู่หลักตามไฟล์ Excel (มือถือ / รถมอเตอร์ไซด์ / เครื่องใช้ไฟฟ้า) พร้อมระบุชนิดสินค้าย่อย"
            icon={<Package className="w-4 h-4 text-emerald-500" />}
          >
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 3 Main Categories matching Excel files */}
                <div>
                  <label className="block font-bold text-notion-text-muted mb-1 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-notion-accent-blue" />
                    <span>หมวดหมู่หลัก (ตาม 3 ไฟล์ Excel) *</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-bold text-notion-accent-blue"
                  >
                    <option value="มือถือ">📱 มือถือ (จากไฟล์ มือถือ.xlsx)</option>
                    <option value="รถมอเตอร์ไซด์">🛵 รถมอเตอร์ไซด์ (จากไฟล์ รถมอเตอร์ไซด์.xlsx)</option>
                    <option value="เครื่องใช้ไฟฟ้า">📺 เครื่องใช้ไฟฟ้า (จากไฟล์ เครื่องใช้ไฟฟ้า.xlsx)</option>
                    <option value="อื่นๆ">📦 อื่นๆ</option>
                  </select>
                </div>

                {/* Sub-Category Selector with Dynamic Add */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-notion-text-muted flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>ชนิด/ประเภทสินค้าย่อย *</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewSub(!isAddingNewSub)}
                      className="text-[11px] font-bold text-notion-accent-blue hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isAddingNewSub ? 'ยกเลิก' : 'เพิ่มชนิดย่อย'}</span>
                    </button>
                  </div>

                  {isAddingNewSub ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        value={newSubInput}
                        onChange={(e) => setNewSubInput(e.target.value)}
                        placeholder="พิมพ์ชนิดสินค้าย่อย..."
                        className="w-full px-3 py-2 rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-emerald-500 font-bold text-emerald-600 dark:text-emerald-400"
                      />
                      <button
                        type="button"
                        onClick={handleAddNewSubCategory}
                        className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold shrink-0 shadow-notion-sm hover:opacity-90 transition-opacity"
                      >
                        เพิ่ม
                      </button>
                    </div>
                  ) : (
                    <select
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-bold text-emerald-600 dark:text-emerald-400"
                    >
                      {availableSubCategories.map((sub) => (
                        <option key={sub} value={sub}>
                          • {sub}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-notion-text-muted mb-1">
                    ยี่ห้อ / แบรนด์ (Brand)
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="เช่น: HONDA, Samsung, Apple, Sharp"
                    className="w-full px-3 py-2 rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-notion-text-muted mb-1">
                    รุ่น / โมเดล (Model)
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="เช่น: GIORNO, Wave 110i, Galaxy S24"
                    className="w-full px-3 py-2 rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-notion-text-muted mb-1">
                    สีสินค้า (Color)
                  </label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="เช่น: เทา-ดำ, ขาว, แดง"
                    className="w-full px-3 py-2 rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-notion-text-muted mb-1">
                    หมายเลขเครื่อง / Serial No / เลขตัวถัง
                  </label>
                  <input
                    type="text"
                    value={serialNo}
                    onChange={(e) => setSerialNo(e.target.value)}
                    placeholder="เช่น: JK16E-2174181..."
                    className="w-full px-3 py-2 rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-mono"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-notion-text-muted mb-1">
                    ราคาสินค้าเต็ม (บาท) *
                  </label>
                  <input
                    type="text"
                    required
                    value={totalPrice}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    placeholder="18,000"
                    className="w-full px-3 py-2 rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400"
                  />
                </div>
              </div>
            </div>
          </NotionCard>

          {/* SECTION 3: เงื่อนไขการชำระเงิน & ผ่อนชำระ (Up to 60 Installments) */}
          <NotionCard
            title={saleType === 'เงินผ่อน' ? '3. เงื่อนไขการผ่อนชำระ (ผ่อนได้สูงสุด 60 งวด)' : '3. เงื่อนไขการชำระเงินสด (Cash Payment Terms)'}
            subtitle={saleType === 'เงินผ่อน' ? 'ระบุเงินดาวน์, เลือกจำนวนงวดผ่อน (สูงสุด 60 งวด / 5 ปี) และคำนวณค่างวดต่อเดือน' : 'ระบุช่องทางชำระเงินสดเต็มจำนวน'}
            icon={<CreditCard className="w-4 h-4 text-purple-500" />}
          >
            <div className="space-y-4 text-xs">
              {saleType === 'เงินผ่อน' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block font-semibold text-notion-text-muted mb-1">
                        เงินดาวน์ (บาท)
                      </label>
                      <input
                        type="text"
                        value={downPayment}
                        onChange={(e) => handleDownPaymentChange(e.target.value)}
                        placeholder="8,000"
                        className="w-full px-3 py-2 rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-mono font-bold text-emerald-600 dark:text-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-notion-text-muted mb-1">
                        จำนวนงวดผ่อน (สูงสุด 60 งวด)
                      </label>
                      <select
                        value={totalInstallments}
                        onChange={(e) => handleInstallmentCountChange(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-bold text-notion-accent-blue"
                      >
                        <option value={3}>3 งวด (3 เดือน)</option>
                        <option value={6}>6 งวด (6 เดือน)</option>
                        <option value={10}>10 งวด (10 เดือน)</option>
                        <option value={12}>12 งวด (1 ปี)</option>
                        <option value={18}>18 งวด (1.5 ปี)</option>
                        <option value={24}>24 งวด (2 ปี)</option>
                        <option value={30}>30 งวด (2.5 ปี)</option>
                        <option value={36}>36 งวด (3 ปี)</option>
                        <option value={48}>48 งวด (4 ปี)</option>
                        <option value={60}>60 งวด (5 ปี - สูงสุด)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-notion-text-muted mb-1">
                        ค่างวดผ่อนต่อเดือน (บาท) *
                      </label>
                      <input
                        type="text"
                        required
                        value={monthlyInstallment}
                        onChange={(e) => handleMonthlyInstallmentChange(e.target.value)}
                        placeholder="1,109"
                        className="w-full px-3 py-2 rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-mono font-bold text-sm text-notion-accent-blue"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-notion-text-muted mb-1">
                        กำหนดชำระทุกวันที่
                      </label>
                      <select
                        value={dueDateDay}
                        onChange={(e) => setDueDateDay(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-bold text-notion-accent-blue"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>
                            ทุกวันที่ {d} ของเดือน
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-notion-text-muted mb-1 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-notion-accent-blue" />
                        <span>วันที่ทำสัญญา / ชำระดาวน์ (วันที่แบบไทย)</span>
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <select
                          value={startDay}
                          onChange={(e) => setStartDay(Number(e.target.value))}
                          className="px-2 py-2 text-sm font-bold rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain"
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d}>วันที่ {d}</option>
                          ))}
                        </select>
                        <select
                          value={startMonth}
                          onChange={(e) => setStartMonth(Number(e.target.value))}
                          className="px-2 py-2 text-sm font-bold rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain"
                        >
                          {monthNames.map((m, idx) => (
                            <option key={m} value={idx + 1}>{m}</option>
                          ))}
                        </select>
                        <select
                          value={startYearBE}
                          onChange={(e) => setStartYearBE(Number(e.target.value))}
                          className="px-2 py-2 text-sm font-bold rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain"
                        >
                          <option value={2568}>2568</option>
                          <option value={2569}>2569</option>
                          <option value={2570}>2570</option>
                        </select>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-notion-accent-blue">
                        📅 วันที่เลือก: {startDay} {monthNames[startMonth - 1]} พ.ศ. {startYearBE}
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-notion-text-muted mb-1">
                        ช่องทางรับเงินดาวน์
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['โอนเงิน', 'เงินสด', 'บัตรเครดิต'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPaymentMethod(m)}
                            className={`py-1.5 rounded-xl font-semibold border transition-all ${
                              paymentMethod === m
                                ? 'bg-notion-accent-blue text-white border-notion-accent-blue'
                                : 'bg-notion-sidebar-light dark:bg-notion-sidebar-dark border-notion-border-light text-notion-text-muted'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Comprehensive Installment & Final Payment Calculation Box */}
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-3">
                    <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                      <span className="font-bold text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>สรุปการคำนวณเงินดาวน์ & ยอดผ่อนงวดสุดท้าย</span>
                      </span>
                      <NotionBadge variant="success">คำนวณงวดสุดท้ายอัตโนมัติ</NotionBadge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                      <div>
                        <span className="text-notion-text-muted block mb-0.5">ราคาสินค้าเต็ม:</span>
                        <p className="font-bold text-sm text-notion-text-main dark:text-notion-text-darkMain">
                          {formatCurrency(parseDigitsOnly(totalPrice))}
                        </p>
                      </div>

                      <div>
                        <span className="text-notion-text-muted block mb-0.5">เงินดาวน์วันทำสัญญา:</span>
                        <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(parseDigitsOnly(downPayment))}
                        </p>
                        <span className="text-[10px] text-stone-500 block">โอนดาวน์: {startDay} {monthNames[startMonth - 1]} {startYearBE}</span>
                      </div>

                      <div>
                        <span className="text-notion-text-muted block mb-0.5">ยอดตั้งจัดผ่อนคงเหลือ:</span>
                        <p className="font-bold text-sm text-rose-600 dark:text-rose-400">
                          {formatCurrency(Math.max(0, parseDigitsOnly(totalPrice) - parseDigitsOnly(downPayment)))}
                        </p>
                      </div>

                      <div>
                        <span className="text-notion-text-muted block mb-0.5">กำหนดชำระค่างวด:</span>
                        <p className="font-bold text-sm text-purple-700 dark:text-purple-300">
                          ทุกวันที่ {dueDateDay}
                        </p>
                        <span className="text-[10px] text-stone-500 block">ของทุกๆ เดือน</span>
                      </div>

                      <div>
                        <span className="text-notion-text-muted block mb-0.5">งวดที่ 1 ถึง {Math.max(1, totalInstallments - 1)} ({Math.max(1, totalInstallments - 1)} งวด):</span>
                        <p className="font-bold text-sm text-notion-accent-blue">
                          {formatCurrency(parseDigitsOnly(monthlyInstallment))}<span className="text-[10px] font-normal"> / เดือน</span>
                        </p>
                        <span className="text-[10px] text-stone-500 block">ชำระทุกวันที่ {dueDateDay}</span>
                      </div>

                      <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30">
                        <span className="text-amber-800 dark:text-amber-300 font-bold block mb-0.5">🎯 งวดสุดท้าย (งวดที่ {totalInstallments}):</span>
                        <p className="font-bold text-sm text-amber-700 dark:text-amber-300">
                          {formatCurrency(
                            Math.max(
                              0,
                              (parseDigitsOnly(totalPrice) - parseDigitsOnly(downPayment)) - 
                              (parseDigitsOnly(monthlyInstallment) * Math.max(0, totalInstallments - 1))
                            )
                          )}
                        </p>
                        <span className="text-[10px] text-amber-800/80 dark:text-amber-300/80 font-semibold block">ชำระวันที่ {dueDateDay} (งวดปิด)</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Cash Sale Form */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-notion-text-muted mb-1">
                        ยอดเงินสดที่รับชำระเต็มจำนวน (บาท)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={totalPrice}
                        className="w-full px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 border border-notion-border-light dark:border-notion-border-dark font-mono font-bold text-base text-emerald-600 dark:text-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-notion-text-muted mb-1">
                        ช่องทางรับเงินสด
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['โอนเงิน', 'เงินสด', 'บัตรเครดิต'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPaymentMethod(m)}
                            className={`py-2 rounded-xl font-semibold border transition-all ${
                              paymentMethod === m
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-notion-sidebar-light dark:bg-notion-sidebar-dark border-notion-border-light text-notion-text-muted'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-emerald-500 shrink-0" />
                    <div>
                      <p className="font-bold text-emerald-800 dark:text-emerald-300">
                        การขายเงินสด: สถานะสัญญาจะเป็น "ปิดสัญญาแล้ว" ทันที
                      </p>
                      <p className="text-notion-text-muted mt-0.5">
                        ระบบจะบันทึกรายรับขายสดหน้าร้านจำนวน {formatCurrency(Number(totalPrice) || 0)} ลงในสมุดบัญชีประจำวันให้อัตโนมัติ
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4 border-t border-notion-border-light dark:border-notion-border-dark">
                <NotionButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  icon={<Sparkles className="w-5 h-5" />}
                >
                  {saleType === 'เงินผ่อน' ? 'เปิดสัญญาขายเงินผ่อน' : 'บันทึกการขายเงินสด'}
                </NotionButton>
              </div>
            </div>
          </NotionCard>
        </form>
      )}
    </div>
  );
};
