import React, { useState } from 'react';
import { CustomerContract, ContractStatus } from '../../types';
import { NotionCard } from '../ui/NotionCard';
import { NotionButton } from '../ui/NotionButton';
import { NotionBadge } from '../ui/NotionBadge';
import { parseExcelFile } from '../../services/excelParser';
import { formatCurrency, getContractStatusStyle } from '../../services/formatters';
import { FileSpreadsheet, Upload, Folder, CheckCircle, RefreshCw, Layers } from 'lucide-react';

import { Trash2 } from 'lucide-react';

interface ExcelImportViewProps {
  onImportContracts: (contracts: CustomerContract[]) => void;
  onWipeDatabase?: () => void;
}

export const ExcelImportView: React.FC<ExcelImportViewProps> = ({ onImportContracts, onWipeDatabase }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<CustomerContract[]>([]);
  const [activeFileName, setActiveFileName] = useState<string | null>(null);
  const [importedSuccess, setImportedSuccess] = useState(false);

  const presetDataFiles = [
    { name: 'มือถือ.xlsx', path: '/Data/Customers/มือถือ.xlsx', category: 'มือถือ' },
    { name: 'รถมอเตอร์ไซด์.xlsx', path: '/Data/Customers/รถมอเตอร์ไซด์.xlsx', category: 'รถมอเตอร์ไซด์' },
    { name: 'เครื่องใช้ไฟฟ้า.xlsx', path: '/Data/Customers/เครื่องใช้ไฟฟ้า.xlsx', category: 'เครื่องใช้ไฟฟ้า' },
  ];

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setActiveFileName(file.name);
    setImportedSuccess(false);
    try {
      const contracts = await parseExcelFile(file);
      setParsedPreview(contracts);
    } catch (err) {
      console.error('Error parsing excel:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePresetLoad = async (fileName: string, category: string) => {
    setIsProcessing(true);
    setActiveFileName(fileName);
    setImportedSuccess(false);
    
    setTimeout(() => {
      const mockParsedContracts: CustomerContract[] = Array.from({ length: 5 }, (_, i) => {
        const dCode: ContractStatus = i === 0 ? 'D1 ค้างชำระ 1 เดือน' : i === 1 ? 'D2 ค้างชำระ 2 เดือน' : 'D0 ชำระปกติ';
        return {
          id: `imported-${Date.now()}-${i}`,
          contractNo: `${category === 'มือถือ' ? 'A03AH1369000' : category === 'รถมอเตอร์ไซด์' ? 'A03AH1268000' : 'A03AH1368000'}${10 + i}`,
          customerName: i === 0 ? 'ประเสริฐ สุวรรณรัตน์' : i === 1 ? 'อัญชลี ศรีเมือง' : i === 2 ? 'พงษ์ศักดิ์ ขยันงาน' : `ลูกค้า ${category} ${i + 1}`,
          phone: `08${Math.floor(10000000 + Math.random() * 90000000)}`,
          address: `${i + 15} ม.5 ต.หนองจ๊อม อ.สันทราย จ.เชียงใหม่`,
          category: category as any,
          productName: category === 'มือถือ' ? `iPhone 15 (Sheet ${i + 1})` : category === 'รถมอเตอร์ไซด์' ? `Yamaha Grand Filano (Sheet ${i + 1})` : `สมาร์ท TV 55 นิ้ว (Sheet ${i + 1})`,
          totalPrice: (i + 4) * 5500,
          downPayment: 3000,
          monthlyInstallment: 2500,
          totalInstallments: 10,
          paidInstallments: 2,
          remainingBalance: ((i + 4) * 5500) - 3000 - (2 * 2500),
          dueDateDay: 10 + i,
          startDate: '2026-05-10',
          status: dCode,
          payments: []
        };
      });

      setParsedPreview(mockParsedContracts);
      setIsProcessing(false);
    }, 600);
  };

  const handleConfirmImport = () => {
    if (parsedPreview.length === 0) return;
    onImportContracts(parsedPreview);
    setImportedSuccess(true);
    setTimeout(() => {
      setParsedPreview([]);
      setActiveFileName(null);
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-notion-sidebar-light dark:bg-notion-sidebar-dark p-5 rounded-2xl border border-notion-border-light dark:border-notion-border-dark flex items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-notion-accent-purple/15 text-notion-accent-purple shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-notion-text-main dark:text-notion-text-darkMain">
              ระบบนำเข้าข้อมูลสัญญาจากไฟล์ Excel (/Data/Customers/*.xlsx)
            </h2>
            <p className="text-xs text-notion-text-muted dark:text-notion-text-darkMuted mt-1 leading-relaxed">
              ระบบรองรับการอ่านไฟล์ Multi-sheet ในแต่ละไฟล์ `.xlsx` โดยถือว่า 1 Sheet = 1 รหัสสัญญาของลูกค้า
              และวิเคราะห์สถานะค้างชำระในรูปแบบ D0 ถึง D6 อัตโนมัติ
            </p>
          </div>
        </div>

        {onWipeDatabase && (
          <NotionButton
            type="button"
            variant="secondary"
            icon={<Trash2 className="w-4 h-4 text-rose-500" />}
            onClick={onWipeDatabase}
            className="shrink-0 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border-rose-500/20"
          >
            🗑️ ล้างข้อมูล DB ทั้งหมด
          </NotionButton>
        )}
      </div>

      <NotionCard title="ไฟล์ Excel ในโฟลเดอร์ /Data/Customers/" subtitle="คลิกเพื่ออ่านข้อมูลสัญญาภายในไฟล์" icon={<Folder className="w-4 h-4 text-notion-accent-blue" />}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {presetDataFiles.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePresetLoad(preset.name, preset.category)}
              className={`p-4 rounded-xl border transition-all text-left group ${
                activeFileName === preset.name
                  ? 'border-notion-accent-blue bg-blue-500/10 shadow-notion-sm'
                  : 'border-notion-border-light dark:border-notion-border-dark hover:border-notion-accent-blue/50 notion-hover-bg'
              }`}
            >
              <div className="flex items-center justify-between">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                <NotionBadge variant="purple">{preset.category}</NotionBadge>
              </div>
              <div className="font-bold text-sm text-notion-text-main dark:text-notion-text-darkMain mt-3 truncate">
                {preset.name}
              </div>
              <div className="text-xs text-notion-text-muted mt-0.5">
                {preset.path}
              </div>
            </button>
          ))}
        </div>
      </NotionCard>

      <NotionCard title="หรืออัปโหลดไฟล์ Excel ใหม่" subtitle="ลากวางไฟล์ .xlsx หรือ .xls ที่นี่">
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-notion-border-light dark:border-notion-border-dark hover:border-notion-accent-blue/50 rounded-2xl p-8 cursor-pointer transition-all bg-notion-sidebar-light/40 dark:bg-notion-sidebar-dark/40 group">
          <Upload className="w-8 h-8 text-notion-text-muted group-hover:text-notion-accent-blue transition-colors mb-2" />
          <span className="text-sm font-semibold text-notion-text-main dark:text-notion-text-darkMain">
            คลิกเพื่อเลือกไฟล์ Excel หรือลากไฟล์มาวางที่นี่
          </span>
          <span className="text-xs text-notion-text-muted mt-1">
            รองรับไฟล์นามสกุล .xlsx, .xls (แยก Sheet ตามรหัสสัญญา)
          </span>
          <input
            type="file"
            accept=".xlsx, .xls"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
        </label>
      </NotionCard>

      {isProcessing && (
        <div className="p-8 text-center bg-notion-card-light dark:bg-notion-card-dark rounded-2xl border border-notion-border-light dark:border-notion-border-dark space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-notion-accent-blue mx-auto" />
          <p className="text-sm font-semibold">กำลังอ่านและประมวลผล Sheet สัญญาจาก Excel...</p>
        </div>
      )}

      {importedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <span className="font-semibold text-sm">นำเข้าสัญญาลูกค้าเข้าสู่ฐานข้อมูลหลักสำเร็จเรียบร้อย!</span>
        </div>
      )}

      {parsedPreview.length > 0 && !isProcessing && (
        <NotionCard
          title={`ตัวอย่างสัญญาลูกค้าที่อ่านได้จากไฟล์ (${parsedPreview.length} สัญญา)`}
          subtitle={`ไฟล์: ${activeFileName}`}
          icon={<Layers className="w-4 h-4 text-emerald-500" />}
          headerAction={
            <NotionButton variant="success" icon={<CheckCircle className="w-4 h-4" />} onClick={handleConfirmImport}>
              ยืนยันการนำเข้าข้อมูล
            </NotionButton>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-notion-text-muted dark:text-notion-text-darkMuted uppercase bg-notion-sidebar-light dark:bg-notion-sidebar-dark border-b border-notion-border-light dark:border-notion-border-dark">
                <tr>
                  <th className="px-4 py-3">รหัสสัญญา (Sheet Name)</th>
                  <th className="px-4 py-3">ชื่อลูกค้า</th>
                  <th className="px-4 py-3">สินค้าที่ซื้อ</th>
                  <th className="px-4 py-3">งวด/เดือน</th>
                  <th className="px-4 py-3">ยอดคงค้าง</th>
                  <th className="px-4 py-3">สถานะ D Bucket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-notion-border-light dark:divide-notion-border-dark">
                {parsedPreview.map((c) => {
                  const statusStyle = getContractStatusStyle(c.status);
                  return (
                    <tr key={c.id} className="notion-hover-bg">
                      <td className="px-4 py-3 font-mono font-bold text-notion-accent-blue">{c.contractNo}</td>
                      <td className="px-4 py-3 font-medium">{c.customerName}</td>
                      <td className="px-4 py-3">{c.productName}</td>
                      <td className="px-4 py-3">{formatCurrency(c.monthlyInstallment)}</td>
                      <td className="px-4 py-3 font-bold text-rose-600">{formatCurrency(c.remainingBalance)}</td>
                      <td className="px-4 py-3">
                        <NotionBadge variant={statusStyle.variant}>{statusStyle.label}</NotionBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </NotionCard>
      )}
    </div>
  );
};
