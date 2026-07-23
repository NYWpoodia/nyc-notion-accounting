import { supabase } from './supabaseClient';
import { CustomerContract, CustomerProfile, LedgerItem } from '../types';
import { getStoredContracts, getStoredCustomerProfiles, getStoredLedger, saveStoredContracts, saveStoredCustomerProfiles, saveStoredLedger } from './storageService';

// Supabase Table Names
const TABLES = {
  CONTRACTS: 'nyc_contracts',
  PROFILES: 'nyc_customer_profiles',
  LEDGER: 'nyc_ledger',
};

// Map Contract object to Supabase row format
function mapContractToRow(c: CustomerContract) {
  return {
    id: c.id,
    contract_no: c.contractNo,
    bp_code: c.bpCode || '',
    customer_name: c.customerName,
    phone: c.phone,
    guarantor_name: c.guarantorName || null,
    guarantor_phone: c.guarantorPhone || null,
    address: c.address,
    location_pin: c.locationPin || null,
    id_card_no: c.idCardNo || null,
    category: c.category,
    sub_category: c.subCategory || null,
    product_name: c.productName,
    brand: c.brand || null,
    model: c.model || null,
    color: c.color || null,
    serial_no: c.serialNo || null,
    sale_type: c.saleType || 'เงินผ่อน',
    total_price: c.totalPrice,
    down_payment: c.downPayment,
    monthly_installment: c.monthlyInstallment,
    total_installments: c.totalInstallments,
    paid_installments: c.paidInstallments,
    remaining_balance: c.remainingBalance,
    due_date_day: c.dueDateDay,
    start_date: c.startDate,
    status: c.status,
    payments: c.payments || [],
    schedule: c.schedule || [],
    updated_at: new Date().toISOString(),
  };
}

// Map Supabase row format to Contract object
function mapRowToContract(row: any): CustomerContract {
  return {
    id: row.id,
    contractNo: row.contract_no,
    bpCode: row.bp_code || undefined,
    customerName: row.customer_name,
    phone: row.phone,
    guarantorName: row.guarantor_name || undefined,
    guarantorPhone: row.guarantor_phone || undefined,
    address: row.address,
    locationPin: row.location_pin || undefined,
    idCardNo: row.id_card_no || undefined,
    category: row.category,
    subCategory: row.sub_category || undefined,
    productName: row.product_name,
    brand: row.brand || undefined,
    model: row.model || undefined,
    color: row.color || undefined,
    serialNo: row.serial_no || undefined,
    saleType: row.sale_type || 'เงินผ่อน',
    totalPrice: Number(row.total_price),
    downPayment: Number(row.down_payment),
    monthlyInstallment: Number(row.monthly_installment),
    totalInstallments: Number(row.total_installments),
    paidInstallments: Number(row.paid_installments),
    remainingBalance: Number(row.remaining_balance),
    dueDateDay: Number(row.due_date_day),
    startDate: row.start_date,
    status: row.status,
    payments: row.payments || [],
    schedule: row.schedule || undefined,
  };
}

// Map CustomerProfile object to Supabase row format
function mapProfileToRow(p: CustomerProfile) {
  return {
    id: p.id,
    bp_code: p.bpCode,
    customer_name: p.customerName,
    phone: p.phone,
    guarantor_name: p.guarantorName || null,
    guarantor_phone: p.guarantorPhone || null,
    address: p.address,
    location_pin: p.locationPin || null,
    id_card_no: p.idCardNo || null,
  };
}

function mapRowToProfile(row: any): CustomerProfile {
  return {
    id: row.id,
    bpCode: row.bp_code,
    customerName: row.customer_name,
    phone: row.phone,
    guarantorName: row.guarantor_name || undefined,
    guarantorPhone: row.guarantor_phone || undefined,
    address: row.address,
    locationPin: row.location_pin || undefined,
    idCardNo: row.id_card_no || undefined,
  };
}

// Map LedgerItem to Supabase row format
function mapLedgerToRow(item: LedgerItem) {
  return {
    id: item.id,
    date: item.date,
    type: item.type,
    amount: item.amount,
    category: item.category,
    description: item.description,
    ref_contract_no: item.refContractNo || null,
    ref_customer_name: item.refCustomerName || null,
  };
}

function mapRowToLedger(row: any): LedgerItem {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    amount: Number(row.amount),
    category: row.category,
    description: row.description,
    refContractNo: row.ref_contract_no || undefined,
    refCustomerName: row.ref_customer_name || undefined,
  };
}

// ==========================================
// DB SERVICE METHODS
// ==========================================

export async function fetchContractsFromDB(): Promise<CustomerContract[]> {
  try {
    const { data, error } = await supabase.from(TABLES.CONTRACTS).select('*');
    if (error || !data || data.length === 0) {
      console.warn('Supabase DB empty or table not created yet. Loading local seed data...');
      const local = getStoredContracts();
      // Try to seed Supabase asynchronously
      seedContractsToSupabase(local);
      return local;
    }
    const contracts = data.map(mapRowToContract);
    saveStoredContracts(contracts); // Keep local storage in sync
    return contracts;
  } catch (err) {
    console.error('Error fetching contracts from Supabase:', err);
    return getStoredContracts();
  }
}

export async function saveContractToDB(contract: CustomerContract): Promise<void> {
  try {
    const row = mapContractToRow(contract);
    const { error } = await supabase.from(TABLES.CONTRACTS).upsert(row);
    if (error) {
      console.error('Supabase upsert contract error:', error);
    }
  } catch (err) {
    console.error('Failed to save contract to Supabase:', err);
  }
}

export async function fetchCustomerProfilesFromDB(): Promise<CustomerProfile[]> {
  try {
    const { data, error } = await supabase.from(TABLES.PROFILES).select('*');
    if (error || !data || data.length === 0) {
      const local = getStoredCustomerProfiles();
      seedProfilesToSupabase(local);
      return local;
    }
    const profiles = data.map(mapRowToProfile);
    saveStoredCustomerProfiles(profiles);
    return profiles;
  } catch (err) {
    console.error('Error fetching profiles from Supabase:', err);
    return getStoredCustomerProfiles();
  }
}

export async function saveCustomerProfileToDB(profile: CustomerProfile): Promise<void> {
  try {
    const row = mapProfileToRow(profile);
    const { error } = await supabase.from(TABLES.PROFILES).upsert(row);
    if (error) {
      console.error('Supabase upsert profile error:', error);
    }
  } catch (err) {
    console.error('Failed to save profile to Supabase:', err);
  }
}

export async function fetchLedgerFromDB(): Promise<LedgerItem[]> {
  try {
    const { data, error } = await supabase.from(TABLES.LEDGER).select('*');
    if (error || !data || data.length === 0) {
      const local = getStoredLedger();
      seedLedgerToSupabase(local);
      return local;
    }
    const ledger = data.map(mapRowToLedger);
    saveStoredLedger(ledger);
    return ledger;
  } catch (err) {
    console.error('Error fetching ledger from Supabase:', err);
    return getStoredLedger();
  }
}

export async function saveLedgerItemToDB(item: LedgerItem): Promise<void> {
  try {
    const row = mapLedgerToRow(item);
    const { error } = await supabase.from(TABLES.LEDGER).upsert(row);
    if (error) {
      console.error('Supabase upsert ledger error:', error);
    }
  } catch (err) {
    console.error('Failed to save ledger item to Supabase:', err);
  }
}

// ==========================================
// ASYNC SEEDING HELPERS
// ==========================================

export async function seedContractsToSupabase(contracts: CustomerContract[]): Promise<void> {
  if (!contracts || contracts.length === 0) return;
  try {
    const rows = contracts.map(mapContractToRow);
    // Batch upsert in chunks of 50 to prevent packet size limits
    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await supabase.from(TABLES.CONTRACTS).upsert(chunk);
    }
    console.log(`Successfully seeded ${contracts.length} contracts to Supabase Cloud DB!`);
  } catch (err) {
    console.error('Failed seeding contracts to Supabase:', err);
  }
}

export async function seedProfilesToSupabase(profiles: CustomerProfile[]): Promise<void> {
  if (!profiles || profiles.length === 0) return;
  try {
    const rows = profiles.map(mapProfileToRow);
    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await supabase.from(TABLES.PROFILES).upsert(chunk);
    }
    console.log(`Successfully seeded ${profiles.length} customer profiles to Supabase Cloud DB!`);
  } catch (err) {
    console.error('Failed seeding profiles to Supabase:', err);
  }
}

export async function seedLedgerToSupabase(ledger: LedgerItem[]): Promise<void> {
  if (!ledger || ledger.length === 0) return;
  try {
    const rows = ledger.map(mapLedgerToRow);
    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await supabase.from(TABLES.LEDGER).upsert(chunk);
    }
    console.log(`Successfully seeded ${ledger.length} ledger items to Supabase Cloud DB!`);
  } catch (err) {
    console.error('Failed seeding ledger to Supabase:', err);
  }
}

export async function clearAllSupabaseDatabase(): Promise<void> {
  try {
    await Promise.all([
      supabase.from(TABLES.CONTRACTS).delete().neq('id', '___none___'),
      supabase.from(TABLES.PROFILES).delete().neq('id', '___none___'),
      supabase.from(TABLES.LEDGER).delete().neq('id', '___none___'),
    ]);
    localStorage.removeItem('nyc_customer_contracts_v12');
    localStorage.removeItem('nyc_customer_profiles_v12');
    localStorage.removeItem('nyc_daily_ledger_v12');
    console.log('Successfully wiped all DB tables in Supabase!');
  } catch (err) {
    console.error('Failed to clear Supabase DB:', err);
  }
}
