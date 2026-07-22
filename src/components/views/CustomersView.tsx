import React, { useState } from 'react';
import { CustomerContract, ProductCategory } from '../../types';
import { NotionCard } from '../ui/NotionCard';
import { NotionBadge } from '../ui/NotionBadge';
import { NotionButton } from '../ui/NotionButton';
import { NotionModal } from '../ui/NotionModal';
import { SearchFilterBar } from '../ui/SearchFilterBar';
import { formatCurrency, formatThaiDate, getContractStatusStyle, getTodayIsoDate } from '../../services/formatters';
import { LayoutGrid, Table, Phone, MapPin, CreditCard, Eye, PlusCircle, Navigation, ExternalLink, UserCheck, ShieldCheck, CheckCircle2, Edit2, Save } from 'lucide-react';

interface CustomersViewProps {
  contracts: CustomerContract[];
  onQuickPay: (contractNo: string) => void;
  onAddContract: (contract: CustomerContract) => void;
  onUpdateContractCustomer?: (contractNo: string, updatedFields: Partial<CustomerContract>) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  contracts,
  onQuickPay,
  onAddContract,
  onUpdateContractCustomer,
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedContract, setSelectedContract] = useState<CustomerContract | null>(null);

  // New Customer Profile Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBpCode, setNewBpCode] = useState(`BP-6907-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newGuarantorName, setNewGuarantorName] = useState('');
  const [newGuarantorPhone, setNewGuarantorPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newLocationPin, setNewLocationPin] = useState('');
  const [geoLocating, setGeoLocating] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Edit Customer Master Profile Modal States
  const [editingCustomerContract, setEditingCustomerContract] = useState<CustomerContract | null>(null);
  const [editBpCode, setEditBpCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGuarantorName, setEditGuarantorName] = useState('');
  const [editGuarantorPhone, setEditGuarantorPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editLocationPin, setEditLocationPin] = useState('');
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);

  // Open Edit Customer Modal Handler
  const handleOpenEditModal = (c: CustomerContract) => {
    setEditingCustomerContract(c);
    setEditBpCode(c.bpCode || '');
    setEditName(c.customerName || '');
    setEditPhone(c.phone || '');
    setEditGuarantorName(c.guarantorName || '');
    setEditGuarantorPhone(c.guarantorPhone || '');
    setEditAddress(c.address || '');
    setEditLocationPin(c.locationPin || '');
    setEditSuccessMsg(null);
  };

  // Submit Edit Customer Details
  const handleSaveEditCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomerContract || !onUpdateContractCustomer) return;

    onUpdateContractCustomer(editingCustomerContract.contractNo, {
      bpCode: editBpCode.trim() || undefined,
      customerName: editName.trim(),
      phone: editPhone.trim(),
      guarantorName: editGuarantorName.trim() || undefined,
      guarantorPhone: editGuarantorPhone.trim() || undefined,
      address: editAddress.trim(),
      locationPin: editLocationPin.trim() || undefined,
    });

    setEditSuccessMsg('บันทึกการแก้ไขข้อมูลลูกค้า สัญญา และผู้ค้ำประกันเรียบร้อยแล้ว!');
    setTimeout(() => {
      setEditSuccessMsg(null);
      setEditingCustomerContract(null);
    }, 1200);
  };

  // Auto GPS Location Handler
  const handleGetCurrentLocation = (isEdit: boolean = false) => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์นี้ไม่รองรับการดึงพิกัด GPS อัตโนมัติ กรุณากรอกพิกัดด้วยตนเอง');
      return;
    }

    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        if (isEdit) {
          setEditLocationPin(`${lat}, ${lng}`);
        } else {
          setNewLocationPin(`${lat}, ${lng}`);
        }
        setGeoLocating(false);
      },
      (err) => {
        alert('ไม่สามารถดึงพิกัด GPS ได้ (กรุณาอนุญาตการเข้าถึงตำแหน่ง Location ในเบราว์เซอร์)');
        setGeoLocating(false);
      },
      { timeout: 10000 }
    );
  };

  // Open Google Maps Handler
  const handleOpenGoogleMaps = (location: string) => {
    if (!location) return;
    let url = location.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://www.google.com/maps?q=${encodeURIComponent(url)}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Create New Customer Master Profile Submit
  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim() || !newPhone.trim() || !newAddress.trim()) {
      alert('กรุณากรอกข้อมูล รหัส BP, ชื่อ-นามสกุล, เบอร์โทร และที่อยู่ให้ครบถ้วน');
      return;
    }

    const tempContractNo = `TEMP-${Math.floor(100000 + Math.random() * 900000)}`;

    const newCustomerProfile: CustomerContract = {
      id: `bp-${newBpCode.trim()}-${Date.now()}`,
      contractNo: tempContractNo,
      bpCode: newBpCode.trim(),
      customerName: newCustomerName.trim(),
      phone: newPhone.trim(),
      guarantorName: newGuarantorName.trim() || undefined,
      guarantorPhone: newGuarantorPhone.trim() || undefined,
      address: newAddress.trim(),
      locationPin: newLocationPin.trim() || undefined,
      category: 'มือถือ',
      productName: 'รอดำเนินการเปิดสัญญาผ่อน/เงินสด',
      totalPrice: 0,
      downPayment: 0,
      monthlyInstallment: 0,
      totalInstallments: 0,
      paidInstallments: 0,
      remainingBalance: 0,
      dueDateDay: 5,
      startDate: getTodayIsoDate(),
      status: 'D0 ชำระปกติ',
      payments: [],
    };

    onAddContract(newCustomerProfile);
    setSaveSuccessMsg(`บันทึกข้อมูลลูกค้ารายใหม่ (BP: ${newBpCode}) สำเร็จ!`);

    setTimeout(() => {
      setSaveSuccessMsg(null);
      setIsAddModalOpen(false);
      setNewCustomerName('');
      setNewPhone('');
      setNewGuarantorName('');
      setNewGuarantorPhone('');
      setNewAddress('');
      setNewLocationPin('');
      setNewBpCode(`BP-6907-${Math.floor(1000 + Math.random() * 9000)}`);
    }, 1500);
  };

  // Filter Contracts
  const filteredContracts = contracts.filter((c) => {
    if (selectedCategory && c.category !== selectedCategory) return false;
    if (selectedStatus && c.status !== selectedStatus) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = c.customerName.toLowerCase().includes(q);
      const matchBp = c.bpCode?.toLowerCase().includes(q);
      const matchContractNo = c.contractNo.toLowerCase().includes(q);
      const matchPhone = c.phone.includes(q);
      const matchGuarantor = c.guarantorName?.toLowerCase().includes(q);
      const matchGuarantorPhone = c.guarantorPhone?.includes(q);
      const matchAddress = c.address.toLowerCase().includes(q);
      const matchProduct = c.productName.toLowerCase().includes(q);

      return matchName || matchBp || matchContractNo || matchPhone || matchGuarantor || matchGuarantorPhone || matchAddress || matchProduct;
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in text-sm sm:text-base">
      {/* Search & Header Control Bar */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        placeholder="ค้นหาชื่อลูกค้า, BP, สัญญา, เบอร์โทร, ผู้ค้ำประกัน, หรือพิกัด GPS..."
      >
        <NotionButton
          variant="primary"
          icon={<PlusCircle className="w-4 h-4" />}
          onClick={() => {
            setSaveSuccessMsg(null);
            setIsAddModalOpen(true);
          }}
        >
          + เพิ่มข้อมูลลูกค้าใหม่
        </NotionButton>
      </SearchFilterBar>

      {/* Main Customers List View (Table / Grid) */}
      {filteredContracts.length === 0 ? (
        <NotionCard className="p-12 text-center text-notion-text-muted space-y-3">
          <CreditCard className="w-12 h-12 mx-auto text-notion-accent-blue opacity-50" />
          <p className="font-semibold text-base">ไม่พบข้อมูลลูกค้าหรือสัญญาตามเงื่อนไขที่ค้นหา</p>
          <p className="text-xs">ลองค้นหาด้วยคำค้นอื่น หรือกดกด "+ เพิ่มข้อมูลลูกค้าใหม่" เพื่อสร้างประวัติลูกค้า</p>
        </NotionCard>
      ) : viewMode === 'table' ? (
        <NotionCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="text-[11px] sm:text-xs text-notion-text-muted dark:text-notion-text-darkMuted uppercase bg-notion-sidebar-light dark:bg-notion-sidebar-dark border-b border-notion-border-light dark:border-notion-border-dark font-bold tracking-tight">
                <tr>
                  <th className="px-4 py-3 min-w-[120px]">รหัส BP / สัญญา</th>
                  <th className="px-4 py-3 min-w-[150px]">ชื่อ-นามสกุล ผู้ซื้อ</th>
                  <th className="px-4 py-3 min-w-[150px]">ผู้ค้ำประกัน (Guarantor)</th>
                  <th className="px-4 py-3 min-w-[100px]">เบอร์โทร</th>
                  <th className="px-4 py-3 min-w-[180px]">ที่อยู่ / พิกัด GPS</th>
                  <th className="px-4 py-3 min-w-[140px]">สินค้าที่ซื้อ</th>
                  <th className="px-4 py-3 min-w-[100px]">ค่างวด</th>
                  <th className="px-4 py-3 text-center min-w-[110px]">สถานะ D-Bucket</th>
                  <th className="px-4 py-3 text-right min-w-[170px]">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-notion-border-light dark:divide-notion-border-dark">
                {filteredContracts.map((contract) => {
                  const statusStyle = getContractStatusStyle(contract.status);
                  return (
                    <tr key={contract.id} className="notion-hover-bg transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          {contract.bpCode && (
                            <span className="font-mono text-xs font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-500/15 px-2 py-0.5 rounded w-fit">
                              {contract.bpCode}
                            </span>
                          )}
                          <span className="font-mono font-bold text-notion-accent-blue">
                            {contract.contractNo}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-notion-text-main dark:text-notion-text-darkMain">
                        {contract.customerName}
                      </td>
                      <td className="px-4 py-3.5">
                        {contract.guarantorName ? (
                          <div>
                            <span className="font-bold text-purple-700 dark:text-purple-300 block">{contract.guarantorName}</span>
                            {contract.guarantorPhone && (
                              <span className="font-mono text-xs text-purple-600 dark:text-purple-400">📞 {contract.guarantorPhone}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-400 italic text-xs">- ไม่ระบุ</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono">{contract.phone}</td>
                      <td className="px-4 py-3.5 text-xs">
                        <div className="truncate max-w-[180px] font-medium">{contract.address}</div>
                        {contract.locationPin ? (
                          <button
                            onClick={() => handleOpenGoogleMaps(contract.locationPin!)}
                            className="inline-flex items-center gap-1 text-notion-accent-blue hover:underline font-bold mt-0.5"
                            title="คลิกเพื่อเปิดแผนที่ Google Maps"
                          >
                            <Navigation className="w-3 h-3 text-emerald-500" />
                            <span>📍 {contract.locationPin}</span>
                          </button>
                        ) : (
                          <span className="text-stone-400 italic block mt-0.5">- ยังไม่ปักหมุด</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-medium">{contract.productName}</td>
                      <td className="px-4 py-3.5 font-bold text-emerald-700 dark:text-emerald-300">
                        {formatCurrency(contract.monthlyInstallment)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <NotionBadge variant={statusStyle.variant}>
                          {statusStyle.label}
                        </NotionBadge>
                      </td>
                      {/* Action Buttons with Edit Button ✏️ */}
                      <td className="px-4 py-3.5 text-right space-x-1">
                        <NotionButton
                          variant="ghost"
                          size="sm"
                          icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => setSelectedContract(contract)}
                        >
                          ดูสัญญา
                        </NotionButton>
                        <NotionButton
                          variant="secondary"
                          size="sm"
                          icon={<Edit2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                          onClick={() => handleOpenEditModal(contract)}
                          title="แก้ไขข้อมูลลูกค้า สัญญา ผู้ค้ำประกัน และพิกัด GPS"
                        >
                          แก้ไข
                        </NotionButton>
                        {contract.remainingBalance > 0 && (
                          <NotionButton
                            variant="secondary"
                            size="sm"
                            onClick={() => onQuickPay(contract.contractNo)}
                          >
                            รับชำระ
                          </NotionButton>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </NotionCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContracts.map((contract) => {
            const statusStyle = getContractStatusStyle(contract.status);
            return (
              <NotionCard key={contract.id} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      {contract.bpCode && (
                        <span className="font-mono text-xs font-bold text-cyan-700 bg-cyan-500/15 px-2 py-0.5 rounded">
                          {contract.bpCode}
                        </span>
                      )}
                      <span className="font-mono text-xs font-bold text-notion-accent-blue bg-notion-accent-blue/10 px-2 py-0.5 rounded">
                        {contract.contractNo}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-notion-text-main dark:text-notion-text-darkMain mt-1.5">
                      {contract.customerName}
                    </h3>
                  </div>
                  <NotionBadge variant={statusStyle.variant}>
                    {statusStyle.label}
                  </NotionBadge>
                </div>

                <div className="space-y-1.5 text-xs sm:text-sm text-notion-text-muted border-t border-b border-notion-border-light dark:border-notion-border-dark py-2.5">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-notion-accent-blue" />
                    <span className="font-bold text-notion-text-main dark:text-notion-text-darkMain">{contract.phone}</span>
                  </div>
                  {contract.guarantorName && (
                    <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-semibold">
                      <UserCheck className="w-4 h-4 text-purple-500" />
                      <span>ผู้ค้ำ: {contract.guarantorName} {contract.guarantorPhone ? `(${contract.guarantorPhone})` : ''}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-4 h-4 text-notion-text-muted shrink-0 mt-0.5" />
                    <span className="truncate">{contract.address}</span>
                  </div>
                  {contract.locationPin && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-notion-text-muted">พิกัด GPS:</span>
                      <button
                        onClick={() => handleOpenGoogleMaps(contract.locationPin!)}
                        className="inline-flex items-center gap-1 text-notion-accent-blue font-bold hover:underline"
                      >
                        <Navigation className="w-3.5 h-3.5 text-emerald-500" />
                        <span>📍 {contract.locationPin}</span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm pt-1">
                  <div>
                    <span className="text-notion-text-muted block">สินค้าที่ผ่อน:</span>
                    <strong className="text-notion-text-main dark:text-notion-text-darkMain">{contract.productName}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-notion-text-muted block">ยอดคงเหลือ:</span>
                    <strong className="text-rose-600 dark:text-rose-400 font-bold">{formatCurrency(contract.remainingBalance)}</strong>
                  </div>
                </div>

                {/* Grid View Action Buttons with Edit Button ✏️ */}
                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-notion-border-light dark:border-notion-border-dark">
                  <NotionButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedContract(contract)}
                  >
                    ดูรายละเอียด
                  </NotionButton>
                  <NotionButton
                    variant="secondary"
                    size="sm"
                    icon={<Edit2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                    onClick={() => handleOpenEditModal(contract)}
                  >
                    แก้ไข
                  </NotionButton>
                  {contract.remainingBalance > 0 && (
                    <NotionButton
                      variant="primary"
                      size="sm"
                      onClick={() => onQuickPay(contract.contractNo)}
                    >
                      รับชำระเงิน
                    </NotionButton>
                  )}
                </div>
              </NotionCard>
            );
          })}
        </div>
      )}

      {/* Add New Customer Master Profile Modal */}
      <NotionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        maxWidth="2xl"
        title="เพิ่มข้อมูลลูกค้าใหม่ (Customer Master Data)"
        subtitle="บันทึก รหัส BP, ชื่อ-นามสกุล, ที่อยู่, เบอร์โทร และพิกัด GPS เพื่อนำไปใช้เปิดสัญญาผ่อน/เงินสด"
        icon={<UserCheck className="w-6 h-6 text-notion-accent-blue" />}
      >
        {saveSuccessMsg ? (
          <div className="p-8 text-center space-y-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/30">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto animate-bounce" />
            <h3 className="font-bold text-xl text-emerald-700 dark:text-emerald-300">
              {saveSuccessMsg}
            </h3>
            <p className="text-sm text-notion-text-muted">กำลังปิดหน้าต่างและอัปเดตข้อมูลเข้าระบบ...</p>
          </div>
        ) : (
          <form onSubmit={handleCreateCustomerSubmit} className="space-y-4 text-sm sm:text-base">
            <div className="p-4 rounded-2xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1">
                    รหัส BP ลูกค้า *
                  </label>
                  <input
                    type="text"
                    required
                    value={newBpCode}
                    onChange={(e) => setNewBpCode(e.target.value)}
                    placeholder="เช่น BP-6907-0012"
                    className="w-full px-3.5 py-2 text-base font-mono font-bold rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark text-cyan-600 dark:text-cyan-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1">
                    เบอร์โทรศัพท์ติดต่อ ผู้ซื้อ *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="0812345678"
                    className="w-full px-3.5 py-2 text-base font-mono font-bold rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1">
                  ชื่อ-นามสกุล ลูกค้า ผู้ซื้อ *
                </label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="เช่น นาย สมชาย ใจดี"
                  className="w-full px-3.5 py-2 text-base font-bold rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-notion-text-muted mb-1">ชื่อ-นามสกุล ผู้ค้ำประกัน (Guarantor)</label>
                  <input
                    type="text"
                    value={newGuarantorName}
                    onChange={(e) => setNewGuarantorName(e.target.value)}
                    placeholder="เช่น นายจรินทร์ เมพ่วง"
                    className="w-full px-3.5 py-2 text-base font-semibold rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                  />
                </div>
                <div>
                  <label className="block font-bold text-notion-text-muted mb-1">เบอร์โทรศัพท์ ผู้ค้ำประกัน</label>
                  <input
                    type="tel"
                    value={newGuarantorPhone}
                    onChange={(e) => setNewGuarantorPhone(e.target.value)}
                    placeholder="0891234567"
                    className="w-full px-3.5 py-2 text-base font-mono font-bold rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1">
                  ที่อยู่ตามสำเนาทะเบียนบ้าน / ที่พักปัจจุบัน *
                </label>
                <textarea
                  required
                  rows={2}
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="ระบุที่อยู่ บ้านเลขที่ หมู่บ้าน ตำบล อำเภอ จังหวัด..."
                  className="w-full px-3.5 py-2 text-base font-medium rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                />
              </div>

              {/* GPS Location Pin Input & Auto-detect Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-notion-text-main dark:text-notion-text-darkMain flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-notion-accent-blue" />
                    <span>พิกัด GPS / ลิงก์ Google Maps โลเคชั่นบ้านลูกค้า</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleGetCurrentLocation(false)}
                    disabled={geoLocating}
                    className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-notion-sm transition-colors flex items-center gap-1"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>{geoLocating ? 'กำลังดึงพิกัด...' : '📍 ดึงพิกัด GPS ปัจจุบัน'}</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLocationPin}
                    onChange={(e) => setNewLocationPin(e.target.value)}
                    placeholder="พิกัด GPS เช่น 18.7883, 98.9853 หรือแปะลิงก์ Google Maps..."
                    className="flex-1 px-3.5 py-2 text-base font-mono rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                  />
                  {newLocationPin && (
                    <button
                      type="button"
                      onClick={() => handleOpenGoogleMaps(newLocationPin)}
                      className="px-3.5 py-2 bg-notion-accent-blue text-white font-bold text-xs rounded-xl flex items-center gap-1 shrink-0"
                      title="ทดสอบเปิดใน Google Maps"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>เปิดแผนที่</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-xs sm:text-sm text-blue-700 dark:text-blue-300 font-medium">
              💡 เมื่อบันทึกแล้ว ข้อมูลลูกค้ารายนี้จะถูกจัดเก็บในฐานข้อมูล สามารถค้นหาตามรหัส BP หรือชื่อ เพื่อนำไปใช้เปิดสัญญาผ่อน/เงินสดในระบบขายหน้าร้านได้ทันที
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <NotionButton type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>
                ยกเลิก
              </NotionButton>
              <NotionButton type="submit" variant="primary">
                บันทึกข้อมูลลูกค้า
              </NotionButton>
            </div>
          </form>
        )}
      </NotionModal>

      {/* EDIT CUSTOMER & GUARANTOR MASTER PROFILE MODAL */}
      <NotionModal
        isOpen={!!editingCustomerContract}
        onClose={() => setEditingCustomerContract(null)}
        maxWidth="2xl"
        title={`แก้ไขข้อมูลลูกค้า & ผู้ค้ำประกัน - สัญญา ${editingCustomerContract?.contractNo}`}
        subtitle={`ลูกค้า: ${editingCustomerContract?.customerName}`}
        icon={<Edit2 className="w-6 h-6 text-amber-500" />}
      >
        {editingCustomerContract && (
          <form onSubmit={handleSaveEditCustomerSubmit} className="space-y-4 text-sm sm:text-base">
            {editSuccessMsg && (
              <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>{editSuccessMsg}</span>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-notion-text-muted mb-1">รหัส BP ลูกค้า</label>
                  <input
                    type="text"
                    value={editBpCode}
                    onChange={(e) => setEditBpCode(e.target.value)}
                    placeholder="เช่น BP-6907-0015"
                    className="w-full px-3 py-2 text-base font-mono font-bold rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark text-cyan-600 dark:text-cyan-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1">ชื่อ-นามสกุล ลูกค้า ผู้ซื้อ *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-base font-bold rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                  />
                </div>

                <div>
                  <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1">เบอร์โทรศัพท์ติดต่อ ผู้ซื้อ *</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 text-base font-mono font-bold rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-notion-text-muted mb-1">ชื่อ-นามสกุล ผู้ค้ำประกัน (Guarantor)</label>
                  <input
                    type="text"
                    value={editGuarantorName}
                    onChange={(e) => setEditGuarantorName(e.target.value)}
                    placeholder="เช่น นายจรินทร์ เมพ่วง"
                    className="w-full px-3.5 py-2 text-base font-semibold rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                  />
                </div>

                <div>
                  <label className="block font-bold text-notion-text-muted mb-1">เบอร์โทรศัพท์ ผู้ค้ำประกัน</label>
                  <input
                    type="tel"
                    value={editGuarantorPhone}
                    onChange={(e) => setEditGuarantorPhone(e.target.value)}
                    placeholder="0891234567"
                    className="w-full px-3.5 py-2 text-base font-mono font-bold rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1">ที่อยู่ตามสำเนาทะเบียนบ้าน / ที่พักปัจจุบัน *</label>
                <textarea
                  required
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3.5 py-2 text-base font-medium rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                />
              </div>

              {/* GPS Location Pin Input & Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-notion-text-muted flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-notion-accent-blue" />
                    <span>พิกัด GPS / ลิงก์ Google Maps โลเคชั่นบ้านลูกค้า</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleGetCurrentLocation(true)}
                    disabled={geoLocating}
                    className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-notion-sm transition-colors flex items-center gap-1"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>{geoLocating ? 'กำลังดึงพิกัด...' : '📍 ดึงพิกัด GPS ปัจจุบัน'}</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={editLocationPin}
                  onChange={(e) => setEditLocationPin(e.target.value)}
                  placeholder="พิกัด GPS เช่น 18.7883, 98.9853 หรือแปะลิงก์ Google Maps..."
                  className="w-full px-3.5 py-2 text-base font-mono rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <NotionButton type="button" variant="secondary" onClick={() => setEditingCustomerContract(null)}>
                ยกเลิก
              </NotionButton>
              <NotionButton type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
                บันทึกการเปลี่ยนแปลงข้อมูลลูกค้า
              </NotionButton>
            </div>
          </form>
        )}
      </NotionModal>

      {/* Contract Details Notion Modal */}
      <NotionModal
        isOpen={!!selectedContract}
        onClose={() => setSelectedContract(null)}
        title={`รายละเอียดสัญญา ${selectedContract?.contractNo}`}
        subtitle={`ลูกค้า: ${selectedContract?.customerName}`}
        icon={<CreditCard className="w-5 h-5 text-notion-accent-blue" />}
        maxWidth="lg"
      >
        {selectedContract && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-xs sm:text-sm">
              <div>
                <span className="text-notion-text-muted font-bold block mb-0.5">รหัส BP / เลขที่สัญญา:</span>
                <div className="flex items-center gap-1.5">
                  {selectedContract.bpCode && (
                    <span className="font-mono font-bold text-xs text-cyan-700 bg-cyan-500/15 px-2 py-0.5 rounded">
                      {selectedContract.bpCode}
                    </span>
                  )}
                  <span className="font-mono font-bold text-xs text-notion-accent-blue bg-notion-accent-blue/10 px-2 py-0.5 rounded">
                    {selectedContract.contractNo}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-notion-text-muted font-bold block mb-0.5">ชื่อ-นามสกุล ผู้ซื้อ:</span>
                <p className="font-bold text-sm sm:text-base text-notion-text-main dark:text-notion-text-darkMain">
                  {selectedContract.customerName}
                </p>
              </div>

              <div>
                <span className="text-notion-text-muted font-bold block mb-0.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-notion-accent-blue" />
                  <span>เบอร์ติดต่อ ผู้ซื้อ:</span>
                </span>
                <p className="font-mono font-bold text-sm sm:text-base text-notion-accent-blue">
                  {selectedContract.phone}
                </p>
              </div>

              <div>
                <span className="text-notion-text-muted font-bold block mb-0.5 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-purple-500" />
                  <span>ชื่อผู้ค้ำประกัน (Guarantor):</span>
                </span>
                <p className="font-bold text-sm sm:text-base text-purple-700 dark:text-purple-300">
                  {selectedContract.guarantorName || '- ไม่ระบุผู้ค้ำประกัน'}
                </p>
              </div>

              <div>
                <span className="text-notion-text-muted font-bold block mb-0.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-purple-500" />
                  <span>เบอร์ติดต่อ ผู้ค้ำประกัน:</span>
                </span>
                <p className="font-mono font-bold text-sm sm:text-base text-purple-700 dark:text-purple-300">
                  {selectedContract.guarantorPhone || '- ไม่ระบุเบอร์โทร'}
                </p>
              </div>

              <div className="sm:col-span-2">
                <span className="text-notion-text-muted font-bold block mb-0.5 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-emerald-500" />
                  <span>พิกัด GPS โลเคชั่นบ้านผู้ซื้อ:</span>
                </span>
                {selectedContract.locationPin ? (
                  <button
                    type="button"
                    onClick={() => handleOpenGoogleMaps(selectedContract.locationPin!)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30 hover:bg-emerald-500/25 transition-all mt-0.5"
                    title="คลิกเพื่อนำทางบน Google Maps"
                  >
                    <Navigation className="w-4 h-4 text-emerald-500" />
                    <span>📍 พิกัด {selectedContract.locationPin}</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    <span className="text-xs font-normal underline">(คลิกเปิด Google Maps)</span>
                  </button>
                ) : (
                  <p className="text-stone-400 italic text-xs mt-0.5">- ยังไม่ได้ระบุพิกัด GPS</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <span className="text-notion-text-muted font-bold block mb-0.5">ที่อยู่ตามสำเนาทะเบียนบ้าน / ที่พักปัจจุบัน:</span>
                <p className="font-medium text-notion-text-main dark:text-notion-text-darkMain">
                  {selectedContract.address}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-notion-border-light dark:border-notion-border-dark space-y-3">
              <h4 className="font-bold text-sm sm:text-base text-notion-text-main dark:text-notion-text-darkMain">
                สินค้าที่ซื้อ & เงื่อนไขผ่อนชำระ (สถานะ {selectedContract.status})
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <span className="text-notion-text-muted">สินค้าที่ซื้อ:</span>
                  <p className="font-semibold text-notion-accent-blue mt-0.5">{selectedContract.productName}</p>
                </div>
                <div>
                  <span className="text-notion-text-muted">ราคาสินค้ารวม:</span>
                  <p className="font-bold mt-0.5">{formatCurrency(selectedContract.totalPrice)}</p>
                </div>
                <div>
                  <span className="text-notion-text-muted">เงินดาวน์ที่จ่ายแล้ว:</span>
                  <p className="font-semibold text-emerald-600 mt-0.5">{formatCurrency(selectedContract.downPayment)}</p>
                </div>
                <div>
                  <span className="text-notion-text-muted">ค่างวดต่อเดือน:</span>
                  <p className="font-bold text-rose-600 mt-0.5">{formatCurrency(selectedContract.monthlyInstallment)}</p>
                </div>
                <div>
                  <span className="text-notion-text-muted">จำนวนงวดที่ผ่อนแล้ว:</span>
                  <p className="font-semibold mt-0.5">{selectedContract.paidInstallments} / {selectedContract.totalInstallments} งวด</p>
                </div>
                <div>
                  <span className="text-notion-text-muted">ยอดหนี้คงเหลือ:</span>
                  <p className="font-bold text-rose-600 text-sm sm:text-base mt-0.5">{formatCurrency(selectedContract.remainingBalance)}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-notion-border-light dark:border-notion-border-dark">
              <NotionButton
                variant="secondary"
                icon={<Edit2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                onClick={() => {
                  const c = selectedContract;
                  setSelectedContract(null);
                  handleOpenEditModal(c);
                }}
              >
                ✏️ แก้ไขข้อมูลลูกค้า & ผู้ค้ำประกัน
              </NotionButton>

              <div className="flex gap-2">
                <NotionButton variant="secondary" onClick={() => setSelectedContract(null)}>
                  ปิดหน้าต่าง
                </NotionButton>
                {selectedContract.remainingBalance > 0 && (
                  <NotionButton
                    variant="primary"
                    onClick={() => {
                      const contractNo = selectedContract.contractNo;
                      setSelectedContract(null);
                      onQuickPay(contractNo);
                    }}
                  >
                    รับชำระเงินงวดนี้
                  </NotionButton>
                )}
              </div>
            </div>
          </div>
        )}
      </NotionModal>
    </div>
  );
};
