import React, { useState } from 'react';
import { CustomerContract, CustomerProfile, ProductCategory } from '../../types';
import { NotionCard } from '../ui/NotionCard';
import { NotionBadge } from '../ui/NotionBadge';
import { NotionButton } from '../ui/NotionButton';
import { NotionModal } from '../ui/NotionModal';
import { SearchFilterBar } from '../ui/SearchFilterBar';
import { formatCurrency, formatThaiDate, getContractStatusStyle, getTodayIsoDate } from '../../services/formatters';
import {
  LayoutGrid,
  Table,
  Phone,
  MapPin,
  CreditCard,
  Eye,
  PlusCircle,
  Navigation,
  ExternalLink,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  Edit2,
  Save,
  Trash2,
  FileText,
  AlertTriangle,
  User,
  Layers,
  Users,
} from 'lucide-react';
import { ContractStatementModal } from '../modals/ContractStatementModal';

interface CustomersViewProps {
  customerProfiles: CustomerProfile[];
  contracts: CustomerContract[];
  onQuickPay: (contractNo: string) => void;
  onAddCustomerProfile: (profile: CustomerProfile) => void;
  onUpdateCustomerProfile?: (id: string, updatedFields: Partial<CustomerProfile>) => void;
  onDeleteCustomerProfile?: (id: string) => void;
  onDeleteContract?: (contractNo: string) => void;
  onUpdateContract?: (contractNo: string, updatedFields: Partial<CustomerContract>) => void;
  onCleanDuplicates?: () => void;
  onWipeDatabase?: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customerProfiles = [],
  contracts = [],
  onQuickPay,
  onAddCustomerProfile,
  onUpdateCustomerProfile,
  onDeleteCustomerProfile,
  onDeleteContract,
  onUpdateContract,
  onCleanDuplicates,
  onWipeDatabase,
}) => {
  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<'profiles' | 'contracts'>('profiles');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Selected Profile or Contract for popup modals
  const [selectedProfile, setSelectedProfile] = useState<CustomerProfile | null>(null);
  const [selectedContract, setSelectedContract] = useState<CustomerContract | null>(null);

  // New Customer Master Profile Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBpCode, setNewBpCode] = useState(`${1040000 + Math.floor(Math.random() * 90000)}`);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newIdCardNo, setNewIdCardNo] = useState('');
  const [newGuarantorName, setNewGuarantorName] = useState('');
  const [newGuarantorPhone, setNewGuarantorPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newLocationPin, setNewLocationPin] = useState('');
  const [geoLocating, setGeoLocating] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Edit Customer Profile Modal States
  const [editingProfile, setEditingProfile] = useState<CustomerProfile | null>(null);
  const [editBpCode, setEditBpCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editIdCardNo, setEditIdCardNo] = useState('');
  const [editGuarantorName, setEditGuarantorName] = useState('');
  const [editGuarantorPhone, setEditGuarantorPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editLocationPin, setEditLocationPin] = useState('');
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);

  // Edit Contract Modal States
  const [editingContract, setEditingContract] = useState<CustomerContract | null>(null);
  const [editContractPhone, setEditContractPhone] = useState('');
  const [editContractDownPayment, setEditContractDownPayment] = useState<number | ''>('');
  const [editContractMonthlyInst, setEditContractMonthlyInst] = useState<number | ''>('');
  const [editContractTotalPrice, setEditContractTotalPrice] = useState<number | ''>('');
  const [editContractCustomerName, setEditContractCustomerName] = useState('');
  const [editContractGuarantorName, setEditContractGuarantorName] = useState('');
  const [editContractGuarantorPhone, setEditContractGuarantorPhone] = useState('');
  const [editContractProductName, setEditContractProductName] = useState('');
  const [editContractAddress, setEditContractAddress] = useState('');
  const [editContractLocationPin, setEditContractLocationPin] = useState('');
  const [editContractSuccessMsg, setEditContractSuccessMsg] = useState<string | null>(null);

  // Delete Confirmations
  const [deleteConfirmProfile, setDeleteConfirmProfile] = useState<CustomerProfile | null>(null);
  const [deleteConfirmContract, setDeleteConfirmContract] = useState<CustomerContract | null>(null);

  // Helper to get linked contracts for a customer profile
  const getCustomerContracts = (profile: CustomerProfile): CustomerContract[] => {
    if (!profile) return [];
    return (contracts || []).filter(
      (c) =>
        Boolean(c && ((c.bpCode && profile.bpCode && c.bpCode === profile.bpCode) ||
        (c.phone && profile.phone && c.phone === profile.phone) ||
        (c.customerName && profile.customerName && c.customerName === profile.customerName)))
    );
  };

  // Open Edit Customer Modal Handler
  const handleOpenEditModal = (p: CustomerProfile) => {
    setEditingProfile(p);
    setEditBpCode(p.bpCode || '');
    setEditName(p.customerName || '');
    setEditPhone(p.phone || '');
    setEditIdCardNo(p.idCardNo || '');
    setEditGuarantorName(p.guarantorName || '');
    setEditGuarantorPhone(p.guarantorPhone || '');
    setEditAddress(p.address || '');
    setEditLocationPin(p.locationPin || '');
    setEditSuccessMsg(null);
  };

  // Open Edit Contract Modal Handler
  const handleOpenEditContractModal = (c: CustomerContract) => {
    setEditingContract(c);
    setEditContractPhone(c.phone || '');
    setEditContractDownPayment(c.downPayment || 0);
    setEditContractMonthlyInst(c.monthlyInstallment || 0);
    setEditContractTotalPrice(c.totalPrice || 0);
    setEditContractCustomerName(c.customerName || '');
    setEditContractGuarantorName(c.guarantorName || '');
    setEditContractGuarantorPhone(c.guarantorPhone || '');
    setEditContractProductName(c.productName || '');
    setEditContractAddress(c.address || '');
    setEditContractLocationPin(c.locationPin || '');
    setEditContractSuccessMsg(null);
  };

  // Save Edit Contract Submit
  const handleSaveEditContractSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContract || !onUpdateContract) return;

    const downNum = typeof editContractDownPayment === 'number' ? editContractDownPayment : 0;
    const monthlyNum = typeof editContractMonthlyInst === 'number' ? editContractMonthlyInst : 0;
    const totalNum = typeof editContractTotalPrice === 'number' ? editContractTotalPrice : 0;

    onUpdateContract(editingContract.contractNo, {
      phone: editContractPhone.trim(),
      downPayment: downNum,
      monthlyInstallment: monthlyNum,
      totalPrice: totalNum,
      customerName: editContractCustomerName.trim(),
      guarantorName: editContractGuarantorName.trim() || undefined,
      guarantorPhone: editContractGuarantorPhone.trim() || undefined,
      productName: editContractProductName.trim(),
      address: editContractAddress.trim(),
      locationPin: editContractLocationPin.trim() || undefined,
    });

    setEditContractSuccessMsg(`บันทึกการแก้ไขสัญญาเลขที่ ${editingContract.contractNo} สำเร็จ!`);
    setTimeout(() => {
      setEditContractSuccessMsg(null);
      setEditingContract(null);
    }, 1200);
  };

  // Save Edit Customer Submit
  const handleSaveEditCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !onUpdateCustomerProfile) return;

    onUpdateCustomerProfile(editingProfile.id, {
      bpCode: editBpCode.trim(),
      customerName: editName.trim(),
      phone: editPhone.trim(),
      idCardNo: editIdCardNo.trim() || undefined,
      guarantorName: editGuarantorName.trim() || undefined,
      guarantorPhone: editGuarantorPhone.trim() || undefined,
      address: editAddress.trim(),
      locationPin: editLocationPin.trim() || undefined,
    });

    setEditSuccessMsg('บันทึกการแก้ไขข้อมูลลูกค้า Master Data เรียบร้อยแล้ว!');
    setTimeout(() => {
      setEditSuccessMsg(null);
      setEditingProfile(null);
    }, 1200);
  };

  // Confirm Delete Customer Profile
  const handleConfirmDeleteCustomer = () => {
    if (deleteConfirmProfile && onDeleteCustomerProfile) {
      if (selectedProfile?.id === deleteConfirmProfile.id) setSelectedProfile(null);
      if (editingProfile?.id === deleteConfirmProfile.id) setEditingProfile(null);
      onDeleteCustomerProfile(deleteConfirmProfile.id);
      setDeleteConfirmProfile(null);
    }
  };

  // Confirm Delete Single Contract
  const handleConfirmDeleteContract = () => {
    if (deleteConfirmContract && onDeleteContract) {
      if (selectedContract?.contractNo === deleteConfirmContract.contractNo) setSelectedContract(null);
      onDeleteContract(deleteConfirmContract.contractNo);
      setDeleteConfirmContract(null);
    }
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
      () => {
        alert('ไม่สามารถดึงพิกัด GPS ได้');
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

    const newProfile: CustomerProfile = {
      id: `cust-${newBpCode.trim()}-${Date.now()}`,
      bpCode: newBpCode.trim(),
      customerName: newCustomerName.trim(),
      phone: newPhone.trim(),
      idCardNo: newIdCardNo.trim() || undefined,
      address: newAddress.trim(),
      locationPin: newLocationPin.trim() || undefined,
      createdAt: getTodayIsoDate(),
    };

    onAddCustomerProfile(newProfile);
    setSaveSuccessMsg(`บันทึกข้อมูลลูกค้ารายใหม่ (BP: ${newBpCode}) เข้าฐานข้อมูลสำเร็จ!`);

    setTimeout(() => {
      setSaveSuccessMsg(null);
      setIsAddModalOpen(false);
      setNewCustomerName('');
      setNewPhone('');
      setNewIdCardNo('');
      setNewAddress('');
      setNewLocationPin('');
      setNewBpCode(`${1040000 + Math.floor(Math.random() * 90000)}`);
    }, 1500);
  };

  // Filter Profiles (Tab 1)
  const filteredProfiles = (customerProfiles || []).filter((p) => {
    if (!p) return false;
    const linked = getCustomerContracts(p);
    if (selectedCategory && !linked.some((c) => c && c.category === selectedCategory)) return false;
    if (selectedStatus && !linked.some((c) => c && c.status === selectedStatus)) return false;

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (p.customerName || '').toLowerCase().includes(q);
      const matchBp = (p.bpCode || '').toLowerCase().includes(q);
      const matchPhone = (p.phone || '').includes(q);
      const matchIdCard = (p.idCardNo || '').toLowerCase().includes(q);
      const matchGuarantor = (p.guarantorName || '').toLowerCase().includes(q);
      const matchGuarantorPhone = (p.guarantorPhone || '').includes(q);
      const matchAddress = (p.address || '').toLowerCase().includes(q);
      const matchContract = linked.some((c) => c && ((c.contractNo || '').toLowerCase().includes(q) || (c.productName || '').toLowerCase().includes(q)));

      return matchName || matchBp || matchPhone || matchIdCard || matchGuarantor || matchGuarantorPhone || matchAddress || matchContract;
    }

    return true;
  });

  // Filter Contracts (Tab 2)
  const filteredContracts = (contracts || []).filter((c) => {
    if (!c) return false;
    if (selectedCategory && c.category !== selectedCategory) return false;
    if (selectedStatus && c.status !== selectedStatus) return false;

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (c.customerName || '').toLowerCase().includes(q);
      const matchBp = (c.bpCode || '').toLowerCase().includes(q);
      const matchContractNo = (c.contractNo || '').toLowerCase().includes(q);
      const matchPhone = (c.phone || '').includes(q);
      const matchGuarantor = (c.guarantorName || '').toLowerCase().includes(q);
      const matchGuarantorPhone = (c.guarantorPhone || '').includes(q);
      const matchAddress = (c.address || '').toLowerCase().includes(q);
      const matchProduct = (c.productName || '').toLowerCase().includes(q);

      return matchName || matchBp || matchContractNo || matchPhone || matchGuarantor || matchGuarantorPhone || matchAddress || matchProduct;
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in text-sm sm:text-base">
      {/* Top Main Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-notion-border-light dark:border-notion-border-dark pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('profiles')}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all text-xs sm:text-sm flex items-center gap-2 ${
              activeTab === 'profiles'
                ? 'bg-notion-accent-blue text-white shadow-notion-sm'
                : 'bg-notion-sidebar-light dark:bg-notion-sidebar-dark text-notion-text-muted hover:text-notion-text-main border border-notion-border-light dark:border-notion-border-dark'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>👥 ฐานข้อมูลลูกค้า Master ({customerProfiles.length} ราย)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contracts')}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all text-xs sm:text-sm flex items-center gap-2 ${
              activeTab === 'contracts'
                ? 'bg-emerald-600 text-white shadow-notion-sm'
                : 'bg-notion-sidebar-light dark:bg-notion-sidebar-dark text-notion-text-muted hover:text-notion-text-main border border-notion-border-light dark:border-notion-border-dark'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>📄 รายการสัญญาผ่อน/ขายสดทั้งหมด ({contracts.length} สัญญา)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onWipeDatabase && (
            <NotionButton
              type="button"
              variant="secondary"
              icon={<Trash2 className="w-4 h-4 text-rose-500" />}
              onClick={onWipeDatabase}
              className="bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border-rose-500/20"
            >
              🗑️ ล้างข้อมูล DB ทั้งหมด
            </NotionButton>
          )}
          {onCleanDuplicates && (
            <NotionButton
              type="button"
              variant="secondary"
              icon={<Layers className="w-4 h-4 text-amber-500" />}
              onClick={onCleanDuplicates}
            >
              🧹 ล้างข้อมูลสัญญาซ้ำ
            </NotionButton>
          )}
          <NotionButton
            variant="primary"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => {
              setSaveSuccessMsg(null);
              setIsAddModalOpen(true);
            }}
          >
            + เพิ่มข้อมูลลูกค้าใหม่ (Master Data)
          </NotionButton>
        </div>
      </div>

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
        placeholder={
          activeTab === 'profiles'
            ? 'ค้นหาชื่อลูกค้า Master, รหัส BP, เบอร์โทร, ผู้ค้ำ หรือพิกัด GPS...'
            : 'ค้นหาเลขที่สัญญา, ชื่อลูกค้า, รหัส BP, เบอร์โทร, สินค้า, หรือพิกัด GPS...'
        }
      />

      {/* TAB 1: CUSTOMER MASTER PROFILES DATABASE */}
      {activeTab === 'profiles' && (
        <>
          {filteredProfiles.length === 0 ? (
            <NotionCard className="p-12 text-center text-notion-text-muted space-y-3">
              <User className="w-12 h-12 mx-auto text-notion-accent-blue opacity-50" />
              <p className="font-semibold text-base">ไม่พบข้อมูลลูกค้าในฐานข้อมูล</p>
              <p className="text-xs">กด "+ เพิ่มข้อมูลลูกค้าใหม่ (Master Data)" เพื่อบันทึกประวัติลูกค้าลงในฐานข้อมูล</p>
            </NotionCard>
          ) : viewMode === 'table' ? (
            <NotionCard className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="text-[11px] sm:text-xs text-notion-text-muted dark:text-notion-text-darkMuted uppercase bg-notion-sidebar-light dark:bg-notion-sidebar-dark border-b border-notion-border-light dark:border-notion-border-dark font-bold tracking-tight">
                    <tr>
                      <th className="px-4 py-3 min-w-[120px]">รหัส BP ลูกค้า</th>
                      <th className="px-4 py-3 min-w-[160px]">ชื่อ-นามสกุล ลูกค้า</th>
                      <th className="px-4 py-3 min-w-[170px]">ผู้ค้ำประกัน (Guarantor)</th>
                      <th className="px-4 py-3 min-w-[120px]">เบอร์โทรศัพท์ลูกค้า</th>
                      <th className="px-4 py-3 min-w-[140px]">สัญญาผ่อนที่ครอบครอง</th>
                      <th className="px-4 py-3 text-right min-w-[170px]">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-notion-border-light dark:divide-notion-border-dark">
                    {filteredProfiles.map((profile) => {
                      const linkedContracts = getCustomerContracts(profile);
                      return (
                        <tr key={profile.id} className="notion-hover-bg transition-colors">
                          <td className="px-4 py-3.5 font-mono font-bold">
                            <span className="text-cyan-700 dark:text-cyan-400 bg-cyan-500/15 px-2 py-0.5 rounded">
                              {profile.bpCode}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-notion-text-main dark:text-notion-text-darkMain">
                            <div>{profile.customerName}</div>
                            {profile.idCardNo && (
                              <div className="text-[11px] font-mono text-notion-text-muted font-normal">
                                🪪 {profile.idCardNo}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-purple-700 dark:text-purple-300 font-medium">
                            {profile.guarantorName ? (
                              <div>
                                <div className="font-bold">{profile.guarantorName}</div>
                                {profile.guarantorPhone ? (
                                  <span className="text-xs font-mono text-notion-text-muted block mt-0.5">{profile.guarantorPhone}</span>
                                ) : (
                                  <span className="text-[11px] text-stone-400 italic block mt-0.5">- ไม่มีเบอร์</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-stone-400 italic">- ไม่มี</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-mono font-semibold">{profile.phone}</td>
                          <td className="px-4 py-3.5">
                            {linkedContracts.length > 0 ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 font-bold text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded">
                                  <FileText className="w-3 h-3" />
                                  {linkedContracts.length} สัญญา
                                </span>
                                <div className="text-[11px] font-mono text-notion-text-muted truncate max-w-[140px]">
                                  {linkedContracts.map((c) => c.contractNo).join(', ')}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/15 px-2 py-0.5 rounded">
                                ยังไม่มีสัญญาผ่อน
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-1">
                            <NotionButton
                              variant="ghost"
                              size="sm"
                              icon={<Eye className="w-3.5 h-3.5" />}
                              onClick={() => setSelectedProfile(profile)}
                            >
                              ดูประวัติ
                            </NotionButton>
                            <NotionButton
                              variant="secondary"
                              size="sm"
                              icon={<Edit2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                              onClick={() => handleOpenEditModal(profile)}
                              title="แก้ไขข้อมูลลูกค้า Master Data"
                            >
                              แก้ไข
                            </NotionButton>
                            {onDeleteCustomerProfile && (
                              <NotionButton
                                variant="ghost"
                                size="sm"
                                icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                                onClick={() => setDeleteConfirmProfile(profile)}
                                title="ลบข้อมูลลูกค้าและสัญญาที่เกี่ยวข้อง"
                              >
                                <span className="text-rose-500">ลบ</span>
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
              {filteredProfiles.map((profile) => {
                const linkedContracts = getCustomerContracts(profile);
                return (
                  <NotionCard key={profile.id} className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-cyan-700 bg-cyan-500/15 px-2 py-0.5 rounded">
                          {profile.bpCode}
                        </span>
                        <h3 className="font-bold text-base text-notion-text-main dark:text-notion-text-darkMain mt-1.5">
                          {profile.customerName}
                        </h3>
                      </div>
                      {linkedContracts.length > 0 ? (
                        <NotionBadge variant="emerald">
                          {linkedContracts.length} สัญญาผ่อน
                        </NotionBadge>
                      ) : (
                        <NotionBadge variant="amber">
                          ยังไม่มีสัญญาผ่อน
                        </NotionBadge>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs sm:text-sm text-notion-text-muted border-t border-b border-notion-border-light dark:border-notion-border-dark py-2.5">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-notion-accent-blue" />
                        <span className="font-bold text-notion-text-main dark:text-notion-text-darkMain">{profile.phone}</span>
                      </div>
                      {profile.guarantorName && (
                        <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-semibold">
                          <UserCheck className="w-4 h-4 text-purple-500" />
                          <span>ผู้ค้ำ: {profile.guarantorName} {profile.guarantorPhone ? `(${profile.guarantorPhone})` : ''}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-4 h-4 text-notion-text-muted shrink-0 mt-0.5" />
                        <span className="truncate">{profile.address}</span>
                      </div>
                      {profile.locationPin && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-notion-text-muted">พิกัด GPS:</span>
                          <button
                            onClick={() => handleOpenGoogleMaps(profile.locationPin!)}
                            className="inline-flex items-center gap-1 text-notion-accent-blue font-bold hover:underline"
                          >
                            <Navigation className="w-3.5 h-3.5 text-emerald-500" />
                            <span>📍 {profile.locationPin}</span>
                            <ExternalLink className="w-3 h-3 ml-0.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-notion-border-light dark:border-notion-border-dark flex-wrap">
                      <NotionButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedProfile(profile)}
                      >
                        ดูรายละเอียด
                      </NotionButton>
                      <NotionButton
                        variant="secondary"
                        size="sm"
                        icon={<Edit2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                        onClick={() => handleOpenEditModal(profile)}
                      >
                        แก้ไข
                      </NotionButton>
                      {onDeleteCustomerProfile && (
                        <NotionButton
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                          onClick={() => setDeleteConfirmProfile(profile)}
                        >
                          <span className="text-rose-500">ลบ</span>
                        </NotionButton>
                      )}
                    </div>
                  </NotionCard>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: CONTRACTS DATABASE */}
      {activeTab === 'contracts' && (
        <>
          {filteredContracts.length === 0 ? (
            <NotionCard className="p-12 text-center text-notion-text-muted space-y-3">
              <CreditCard className="w-12 h-12 mx-auto text-notion-accent-blue opacity-50" />
              <p className="font-semibold text-base">ไม่พบข้อมูลสัญญาผ่อนชำระตามเงื่อนไขที่ค้นหา</p>
              <p className="text-xs">สามารถไปที่หน้า "เปิดสัญญาขาย" เพื่อทำสัญญาใหม่ได้ตลอดเวลา</p>
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
                          <td className="px-4 py-3.5 text-purple-700 dark:text-purple-300 font-medium">
                            {contract.guarantorName ? (
                              <div>
                                <div>{contract.guarantorName}</div>
                                {contract.guarantorPhone && (
                                  <span className="text-xs text-notion-text-muted">{contract.guarantorPhone}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-stone-400 italic">- ไม่มี</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-mono font-semibold">{contract.phone}</td>
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
                          <td className="px-4 py-3.5 text-right space-x-1">
                            <NotionButton
                              variant="ghost"
                              size="sm"
                              icon={<Eye className="w-3.5 h-3.5" />}
                              onClick={() => setSelectedContract(contract)}
                            >
                              ดูสัญญา
                            </NotionButton>
                            {onUpdateContract && (
                              <NotionButton
                                variant="secondary"
                                size="sm"
                                icon={<Edit2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                                onClick={() => handleOpenEditContractModal(contract)}
                              >
                                แก้ไขสัญญา
                              </NotionButton>
                            )}
                            {contract.remainingBalance > 0 && (
                              <NotionButton
                                variant="secondary"
                                size="sm"
                                onClick={() => onQuickPay(contract.contractNo)}
                              >
                                รับชำระ
                              </NotionButton>
                            )}
                            {onDeleteContract && (
                              <NotionButton
                                variant="ghost"
                                size="sm"
                                icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                                onClick={() => setDeleteConfirmContract(contract)}
                                title="ลบสัญญาผ่อนชำระ"
                              >
                                <span className="text-rose-500">ลบ</span>
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
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-4 h-4 text-notion-text-muted shrink-0 mt-0.5" />
                        <span className="truncate">{contract.address}</span>
                      </div>
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

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-notion-border-light dark:border-notion-border-dark flex-wrap">
                      <NotionButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedContract(contract)}
                      >
                        ดูรายละเอียด
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
                      {onDeleteContract && (
                        <NotionButton
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                          onClick={() => setDeleteConfirmContract(contract)}
                        >
                          <span className="text-rose-500">ลบ</span>
                        </NotionButton>
                      )}
                    </div>
                  </NotionCard>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add New Customer Master Profile Modal */}
      <NotionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        maxWidth="2xl"
        title="เพิ่มข้อมูลลูกค้าใหม่ (Customer Master Data)"
        subtitle="บันทึก รหัส BP, ชื่อ-นามสกุล, เบอร์โทร, เลขบัตรประชาชน และที่อยู่ลูกค้า"
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
            <div className="p-4 sm:p-5 rounded-2xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark space-y-4">
              
              {/* Row 1: BP Code & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1.5 text-xs sm:text-sm">
                    รหัส BP ลูกค้า *
                  </label>
                  <input
                    type="text"
                    required
                    value={newBpCode}
                    onChange={(e) => setNewBpCode(e.target.value)}
                    placeholder="เช่น 1043342"
                    className="w-full px-3.5 py-2.5 text-base font-mono font-bold rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark text-cyan-600 dark:text-cyan-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1.5 text-xs sm:text-sm">
                    เบอร์โทรศัพท์ติดต่อ *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="0812345678"
                    className="w-full px-3.5 py-2.5 text-base font-mono font-bold rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                  />
                </div>
              </div>

              {/* Row 2: Customer Name */}
              <div>
                <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1.5 text-xs sm:text-sm">
                  ชื่อ-นามสกุล ลูกค้า ผู้ซื้อ *
                </label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="เช่น นาย สมชาย ใจดี"
                  className="w-full px-3.5 py-2.5 text-base font-bold rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                />
              </div>

              {/* Row 3: ID Card / Foreigner Card Number */}
              <div>
                <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1.5 text-xs sm:text-sm">
                  เลขประจำตัวประชาชน / บัตรคนต่างด้าว / พาสปอร์ต
                </label>
                <input
                  type="text"
                  value={newIdCardNo}
                  onChange={(e) => setNewIdCardNo(e.target.value)}
                  placeholder="เช่น 1509900123456 หรือ 0001234567890"
                  className="w-full px-3.5 py-2.5 text-base font-mono font-bold rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark text-emerald-600 dark:text-emerald-400"
                />
              </div>

              {/* Row 4: Address */}
              <div>
                <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1.5 text-xs sm:text-sm">
                  ที่อยู่ตามสำเนาทะเบียนบ้าน / ที่พักปัจจุบัน *
                </label>
                <textarea
                  required
                  rows={2}
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="ระบุที่อยู่ บ้านเลขที่ หมู่บ้าน ตำบล อำเภอ จังหวัด..."
                  className="w-full px-3.5 py-2.5 text-base font-medium rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                />
              </div>

              {/* Row 5: GPS Location Pin */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label className="font-bold text-notion-text-main dark:text-notion-text-darkMain flex items-center gap-1.5 text-xs sm:text-sm">
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
                    className="flex-1 px-3.5 py-2.5 text-base font-mono rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                  />
                  {newLocationPin && (
                    <button
                      type="button"
                      onClick={() => handleOpenGoogleMaps(newLocationPin)}
                      className="px-3.5 py-2.5 bg-notion-accent-blue text-white font-bold text-xs rounded-xl flex items-center gap-1 shrink-0"
                      title="ทดสอบเปิดใน Google Maps"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>เปิดแผนที่</span>
                    </button>
                  )}
                </div>
              </div>
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

      {/* EDIT CUSTOMER MASTER PROFILE MODAL */}
      <NotionModal
        isOpen={!!editingProfile}
        onClose={() => setEditingProfile(null)}
        maxWidth="2xl"
        title={`แก้ไขข้อมูลลูกค้า Master Data - BP: ${editingProfile?.bpCode}`}
        subtitle={`ลูกค้า: ${editingProfile?.customerName}`}
        icon={<Edit2 className="w-6 h-6 text-amber-500" />}
      >
        {editingProfile && (
          <form onSubmit={handleSaveEditCustomerSubmit} className="space-y-4 text-sm sm:text-base">
            {editSuccessMsg && (
              <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>{editSuccessMsg}</span>
              </div>
            )}

            <div className="p-4 sm:p-5 rounded-2xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark space-y-4">
              
              {/* Row 1: BP Code & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-notion-text-muted mb-1.5 text-xs sm:text-sm">
                    รหัส BP ลูกค้า
                  </label>
                  <input
                    type="text"
                    value={editBpCode}
                    onChange={(e) => setEditBpCode(e.target.value)}
                    placeholder="เช่น 1043342"
                    className="w-full px-3.5 py-2.5 text-base font-mono font-bold rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark text-cyan-600 dark:text-cyan-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1.5 text-xs sm:text-sm">
                    เบอร์โทรศัพท์ติดต่อ *
                  </label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base font-mono font-bold rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                  />
                </div>
              </div>

              {/* Row 2: Customer Name */}
              <div>
                <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1.5 text-xs sm:text-sm">
                  ชื่อ-นามสกุล ลูกค้า ผู้ซื้อ *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base font-bold rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                />
              </div>

              {/* Row 3: ID Card / Foreigner Card Number */}
              <div>
                <label className="block font-bold text-notion-text-muted mb-1.5 text-xs sm:text-sm">
                  เลขประจำตัวประชาชน / บัตรคนต่างด้าว / พาสปอร์ต
                </label>
                <input
                  type="text"
                  value={editIdCardNo}
                  onChange={(e) => setEditIdCardNo(e.target.value)}
                  placeholder="เช่น 1509900123456 หรือ 0001234567890"
                  className="w-full px-3.5 py-2.5 text-base font-mono font-bold rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark text-emerald-600 dark:text-emerald-400"
                />
              </div>

              {/* Row 4: Address */}
              <div>
                <label className="block font-bold text-notion-text-main dark:text-notion-text-darkMain mb-1.5 text-xs sm:text-sm">
                  ที่อยู่ตามสำเนาทะเบียนบ้าน / ที่พักปัจจุบัน *
                </label>
                <textarea
                  required
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base font-medium rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                />
              </div>

              {/* Row 5: GPS Location Pin */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label className="font-bold text-notion-text-muted flex items-center gap-1.5 text-xs sm:text-sm">
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

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editLocationPin}
                    onChange={(e) => setEditLocationPin(e.target.value)}
                    placeholder="พิกัด GPS เช่น 18.7883, 98.9853 หรือแปะลิงก์ Google Maps..."
                    className="flex-1 px-3.5 py-2.5 text-base font-mono rounded-xl bg-notion-card-light dark:bg-notion-card-dark border border-notion-border-light dark:border-notion-border-dark"
                  />
                  {editLocationPin && (
                    <button
                      type="button"
                      onClick={() => handleOpenGoogleMaps(editLocationPin)}
                      className="px-3.5 py-2.5 bg-notion-accent-blue text-white font-bold text-xs rounded-xl flex items-center gap-1 shrink-0"
                      title="ทดสอบเปิดใน Google Maps"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>เปิดแผนที่</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <NotionButton type="button" variant="secondary" onClick={() => setEditingProfile(null)}>
                ยกเลิก
              </NotionButton>
              <NotionButton type="submit" variant="primary">
                บันทึกการแก้ไข
              </NotionButton>
            </div>
          </form>
        )}
      </NotionModal>

      {/* VIEW CUSTOMER PROFILE DETAILS & LINKED CONTRACTS MODAL */}
      <NotionModal
        isOpen={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
        maxWidth="3xl"
        title={`รายละเอียดประวัติลูกค้า - ${selectedProfile?.customerName}`}
        subtitle={`รหัส BP: ${selectedProfile?.bpCode || '-'} | เบอร์โทร: ${selectedProfile?.phone}`}
        icon={<User className="w-6 h-6 text-notion-accent-blue" />}
      >
        {selectedProfile && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark">
              <div>
                <span className="text-xs text-notion-text-muted">ชื่อ-นามสกุล ผู้ซื้อ:</span>
                <p className="font-bold text-base text-notion-text-main dark:text-notion-text-darkMain">{selectedProfile.customerName}</p>
              </div>
              <div>
                <span className="text-xs text-notion-text-muted">รหัส BP:</span>
                <p className="font-mono font-bold text-cyan-700 dark:text-cyan-300">{selectedProfile.bpCode}</p>
              </div>
              <div>
                <span className="text-xs text-notion-text-muted">เบอร์โทรศัพท์:</span>
                <p className="font-mono font-semibold">{selectedProfile.phone}</p>
              </div>
              <div>
                <span className="text-xs text-notion-text-muted">เลขบัตรประชาชน / บัตรคนต่างด้าว:</span>
                <p className="font-mono font-semibold text-emerald-700 dark:text-emerald-300">{selectedProfile.idCardNo || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-notion-text-muted">ผู้ค้ำประกัน:</span>
                <p className="font-semibold text-purple-700 dark:text-purple-300">
                  {selectedProfile.guarantorName || '-'} {selectedProfile.guarantorPhone ? `(${selectedProfile.guarantorPhone})` : ''}
                </p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-xs text-notion-text-muted">ที่อยู่:</span>
                <p className="font-medium text-sm">{selectedProfile.address}</p>
              </div>
              {selectedProfile.locationPin && (
                <div className="sm:col-span-2 flex items-center justify-between pt-1">
                  <span className="text-xs text-notion-text-muted">พิกัด GPS:</span>
                  <button
                    onClick={() => handleOpenGoogleMaps(selectedProfile.locationPin!)}
                    className="inline-flex items-center gap-1 text-notion-accent-blue font-bold hover:underline text-xs"
                  >
                    <Navigation className="w-3.5 h-3.5 text-emerald-500" />
                    <span>📍 {selectedProfile.locationPin}</span>
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Linked Contracts List */}
            <div className="space-y-2">
              <h4 className="font-bold text-sm sm:text-base flex items-center justify-between">
                <span>สัญญาผ่อนชำระในครอบครอง</span>
                <span className="text-xs font-normal text-notion-text-muted">
                  ({getCustomerContracts(selectedProfile).length} สัญญา)
                </span>
              </h4>

              {getCustomerContracts(selectedProfile).length === 0 ? (
                <div className="p-6 text-center text-amber-600 bg-amber-500/10 rounded-xl border border-amber-500/20 text-sm font-medium">
                  ยังไม่มีประวัติสัญญาผ่อนชำระ สามารถเลือกจากระบบขายหน้าร้านเพื่อทำสัญญาใหม่ได้ทันที
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {getCustomerContracts(selectedProfile).map((contract) => {
                    const statusStyle = getContractStatusStyle(contract.status);
                    return (
                      <div
                        key={contract.id}
                        className="p-3 rounded-xl border border-notion-border-light dark:border-notion-border-dark bg-notion-card-light dark:bg-notion-card-dark flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-notion-accent-blue bg-notion-accent-blue/10 px-2 py-0.5 rounded">
                              {contract.contractNo}
                            </span>
                            <NotionBadge variant={statusStyle.variant}>
                              {statusStyle.label}
                            </NotionBadge>
                          </div>
                          <p className="font-semibold text-sm mt-1">{contract.productName}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-notion-text-muted block">ยอดคงเหลือ:</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">
                            {formatCurrency(contract.remainingBalance)}
                          </span>
                        </div>
                        {contract.remainingBalance > 0 && (
                          <NotionButton
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedProfile(null);
                              onQuickPay(contract.contractNo);
                            }}
                          >
                            รับชำระ
                          </NotionButton>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-notion-border-light dark:border-notion-border-dark">
              <NotionButton variant="secondary" onClick={() => setSelectedProfile(null)}>
                ปิดหน้าต่าง
              </NotionButton>
            </div>
          </div>
        )}
      </NotionModal>

      {/* VIEW CONTRACT DETAILS A4 STATEMENT MODAL */}
      <ContractStatementModal
        isOpen={!!selectedContract}
        onClose={() => setSelectedContract(null)}
        contract={selectedContract}
        onQuickPay={onQuickPay}
        onSaveContract={(updated) => {
          setSelectedContract(updated);
          if (onUpdateContract) {
            onUpdateContract(updated.contractNo, updated);
          }
        }}
      />

      {/* ===== DELETE CUSTOMER PROFILE CONFIRMATION MODAL ===== */}
      <NotionModal
        isOpen={!!deleteConfirmProfile}
        onClose={() => setDeleteConfirmProfile(null)}
        maxWidth="md"
        title="ยืนยันการลบข้อมูลลูกค้า Master Data"
        icon={<Trash2 className="w-6 h-6 text-rose-500" />}
      >
        {deleteConfirmProfile && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                    ⚠️ คำเตือน: การลบลูกค้ารายนี้จะลบข้อมูลสัญญาผ่อนชำระทั้งหมดที่เกี่ยวข้องออกด้วย!
                  </p>
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                    การกระทำนี้ไม่สามารถย้อนกลับได้ โปรดตรวจสอบความถูกต้องก่อนยืนยัน
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-sm bg-white dark:bg-notion-bg-dark p-3 rounded-lg border border-rose-200 dark:border-rose-900">
                <div className="flex items-center gap-2">
                  <span className="text-notion-text-muted w-24 shrink-0">รหัส BP:</span>
                  <span className="font-mono font-bold text-cyan-700 dark:text-cyan-300">{deleteConfirmProfile.bpCode}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-notion-text-muted w-24 shrink-0">ชื่อลูกค้า:</span>
                  <span className="font-bold text-notion-text-main dark:text-notion-text-darkMain">{deleteConfirmProfile.customerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-notion-text-muted w-24 shrink-0">เบอร์โทร:</span>
                  <span className="font-semibold font-mono">{deleteConfirmProfile.phone}</span>
                </div>
                <div className="flex items-start gap-2 pt-1 border-t border-notion-border-light dark:border-notion-border-dark">
                  <span className="text-notion-text-muted w-24 shrink-0">สัญญาที่ลบด้วย:</span>
                  <div className="font-semibold text-rose-600 dark:text-rose-400">
                    {getCustomerContracts(deleteConfirmProfile).length > 0 ? (
                      <div>
                        <div>พบ {getCustomerContracts(deleteConfirmProfile).length} สัญญาผ่อนชำระ:</div>
                        <div className="font-mono text-xs text-notion-text-muted">
                          {getCustomerContracts(deleteConfirmProfile).map((c) => c.contractNo).join(', ')}
                        </div>
                      </div>
                    ) : (
                      <span className="text-notion-text-muted italic">ไม่มีสัญญาผ่อนชำระ</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <NotionButton
                variant="secondary"
                onClick={() => setDeleteConfirmProfile(null)}
              >
                ยกเลิก
              </NotionButton>
              <NotionButton
                variant="ghost"
                icon={<Trash2 className="w-4 h-4 text-rose-500" />}
                onClick={handleConfirmDeleteCustomer}
              >
                <span className="text-rose-600 font-bold">🗑️ ยืนยันลบลูกค้าและข้อมูลสัญญา</span>
              </NotionButton>
            </div>
          </div>
        )}
      </NotionModal>

      {/* ===== DELETE SINGLE CONTRACT CONFIRMATION MODAL ===== */}
      <NotionModal
        isOpen={!!deleteConfirmContract}
        onClose={() => setDeleteConfirmContract(null)}
        maxWidth="sm"
        title="ยืนยันการลบสัญญาผ่อนชำระ"
        icon={<Trash2 className="w-6 h-6 text-rose-500" />}
      >
        {deleteConfirmContract && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 space-y-3">
              <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                ⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบสัญญาผ่อนชำระนี้?
              </p>
              <div className="space-y-1.5 text-sm bg-white dark:bg-notion-bg-dark p-3 rounded-lg border border-rose-200 dark:border-rose-900">
                <div className="flex items-center gap-2">
                  <span className="text-notion-text-muted w-24 shrink-0">เลขที่สัญญา:</span>
                  <span className="font-mono font-bold text-notion-accent-blue">{deleteConfirmContract.contractNo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-notion-text-muted w-24 shrink-0">ชื่อลูกค้า:</span>
                  <span className="font-bold">{deleteConfirmContract.customerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-notion-text-muted w-24 shrink-0">สินค้าที่ผ่อน:</span>
                  <span className="font-semibold">{deleteConfirmContract.productName}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <NotionButton
                variant="secondary"
                onClick={() => setDeleteConfirmContract(null)}
              >
                ยกเลิก
              </NotionButton>
              <NotionButton
                variant="ghost"
                icon={<Trash2 className="w-4 h-4 text-rose-500" />}
                onClick={handleConfirmDeleteContract}
              >
                <span className="text-rose-600 font-bold">🗑️ ยืนยันลบสัญญา</span>
              </NotionButton>
            </div>
          </div>
        )}
      </NotionModal>

      {/* ===== EDIT CONTRACT MODAL ===== */}
      <NotionModal
        isOpen={!!editingContract}
        onClose={() => setEditingContract(null)}
        maxWidth="2xl"
        title={`แก้ไขข้อมูลสัญญาผ่อนชำระ (${editingContract?.contractNo})`}
        subtitle="แก้ไขเงินดาวน์, ค่างวด, เบอร์โทร, ข้อมูลผู้ซื้อ, ผู้ค้ำประกัน และสินค้า"
        icon={<Edit2 className="w-6 h-6 text-amber-500" />}
      >
        {editContractSuccessMsg ? (
          <div className="p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <p className="font-extrabold text-base text-emerald-600 dark:text-emerald-400">
              {editContractSuccessMsg}
            </p>
          </div>
        ) : editingContract ? (
          <form onSubmit={handleSaveEditContractSubmit} className="space-y-4">
            {/* Financial Terms Section */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-3">
              <h4 className="font-bold text-xs text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-amber-600" />
                <span>เงื่อนไขทางการเงิน & สินค้า (Financials & Product)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-notion-text-muted mb-1">
                    💵 เงินดาวน์ (บาท)
                  </label>
                  <input
                    type="number"
                    value={editContractDownPayment}
                    onChange={(e) => setEditContractDownPayment(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-notion-bg-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-bold font-mono text-emerald-600"
                    placeholder="เช่น 5000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-notion-text-muted mb-1">
                    📅 ค่างวดต่อเดือน (บาท)
                  </label>
                  <input
                    type="number"
                    value={editContractMonthlyInst}
                    onChange={(e) => setEditContractMonthlyInst(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-notion-bg-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-bold font-mono text-notion-accent-blue"
                    placeholder="เช่น 3288"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-notion-text-muted mb-1">
                    🏷️ ราคาสินค้ารวม (บาท)
                  </label>
                  <input
                    type="number"
                    value={editContractTotalPrice}
                    onChange={(e) => setEditContractTotalPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-notion-bg-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-bold font-mono"
                    placeholder="เช่น 39456"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-notion-text-muted mb-1">
                  📦 สินค้าที่ซื้อ
                </label>
                <input
                  type="text"
                  value={editContractProductName}
                  onChange={(e) => setEditContractProductName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-notion-bg-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-medium"
                  placeholder="เช่น ตู้เย็น THE COOL 3PJUMBOPREMIUM"
                />
              </div>
            </div>

            {/* Buyer & Guarantor Info Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Buyer */}
              <div className="p-3 rounded-xl bg-notion-sidebar-light dark:bg-stone-900 border border-notion-border-light dark:border-notion-border-dark space-y-2">
                <h4 className="font-bold text-xs text-notion-accent-blue flex items-center gap-1.5 pb-1 border-b border-notion-border-light dark:border-notion-border-dark">
                  <User className="w-3.5 h-3.5" />
                  <span>ข้อมูลผู้ซื้อ</span>
                </h4>
                <div>
                  <label className="block text-[11px] font-semibold text-notion-text-muted mb-0.5">
                    ชื่อ-นามสกุล ผู้ซื้อ
                  </label>
                  <input
                    type="text"
                    value={editContractCustomerName}
                    onChange={(e) => setEditContractCustomerName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-notion-bg-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-notion-text-muted mb-0.5">
                    📱 เบอร์โทรศัพท์ผู้ซื้อ
                  </label>
                  <input
                    type="text"
                    value={editContractPhone}
                    onChange={(e) => setEditContractPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-notion-bg-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-mono font-bold text-notion-accent-blue"
                  />
                </div>
              </div>

              {/* Guarantor */}
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                <h4 className="font-bold text-xs text-purple-800 dark:text-purple-300 flex items-center gap-1.5 pb-1 border-b border-purple-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>ข้อมูลผู้ค้ำประกัน</span>
                </h4>
                <div>
                  <label className="block text-[11px] font-semibold text-notion-text-muted mb-0.5">
                    ชื่อ-นามสกุล ผู้ค้ำ
                  </label>
                  <input
                    type="text"
                    value={editContractGuarantorName}
                    onChange={(e) => setEditContractGuarantorName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-notion-bg-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-semibold"
                    placeholder="ถ้ามี"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-notion-text-muted mb-0.5">
                    📱 เบอร์โทรศัพท์ผู้ค้ำ
                  </label>
                  <input
                    type="text"
                    value={editContractGuarantorPhone}
                    onChange={(e) => setEditContractGuarantorPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-notion-bg-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-mono"
                    placeholder="ถ้ามี"
                  />
                </div>
              </div>
            </div>

            {/* Address & GPS */}
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-semibold text-notion-text-muted mb-1">
                  🏠 ที่อยู่ตามสัญญา
                </label>
                <input
                  type="text"
                  value={editContractAddress}
                  onChange={(e) => setEditContractAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-notion-bg-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-notion-text-muted mb-1">
                  📍 พิกัด GPS (ละติจูด, ลองจิจูด หรือ Google Maps URL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editContractLocationPin}
                    onChange={(e) => setEditContractLocationPin(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-notion-bg-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark font-mono"
                    placeholder="เช่น 18.7883, 98.9853"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((pos) => {
                          setEditContractLocationPin(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
                        });
                      }
                    }}
                    className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 flex items-center gap-1"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>ดึงพิกัด</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-notion-border-light dark:border-notion-border-dark">
              <NotionButton
                type="button"
                variant="secondary"
                onClick={() => setEditingContract(null)}
              >
                ยกเลิก
              </NotionButton>
              <NotionButton
                type="submit"
                variant="primary"
                icon={<Save className="w-4 h-4" />}
              >
                บันทึกการแก้ไขสัญญา
              </NotionButton>
            </div>
          </form>
        ) : null}
      </NotionModal>
    </div>
  );
};
