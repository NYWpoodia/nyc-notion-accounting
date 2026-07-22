import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'database.sqlite');

let dbInstance = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const filebuffer = fs.readFileSync(DB_PATH);
    dbInstance = new SQL.Database(filebuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Create Tables
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      bp_code TEXT UNIQUE,
      customer_name TEXT NOT NULL,
      id_card_no TEXT,
      phone TEXT NOT NULL,
      address TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guarantors (
      id TEXT PRIMARY KEY,
      bp_code TEXT,
      guarantor_name TEXT NOT NULL,
      phone TEXT,
      address TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      product_name TEXT NOT NULL,
      brand TEXT,
      model TEXT,
      color TEXT,
      serial_no TEXT,
      price REAL DEFAULT 0.0
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      contract_no TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL,
      guarantor_id TEXT,
      product_id TEXT,
      sale_type TEXT DEFAULT 'เงินผ่อน',
      total_price REAL NOT NULL,
      down_payment REAL DEFAULT 0.0,
      monthly_installment REAL DEFAULT 0.0,
      total_installments INTEGER DEFAULT 12,
      paid_installments INTEGER DEFAULT 0,
      remaining_balance REAL NOT NULL,
      due_date_day INTEGER DEFAULT 5,
      start_date TEXT NOT NULL,
      status TEXT DEFAULT 'D0 ชำระปกติ',
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS payment_records (
      id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL,
      receipt_no TEXT UNIQUE NOT NULL,
      installment_no INTEGER NOT NULL,
      amount REAL NOT NULL,
      fine_amount REAL DEFAULT 0.0,
      payment_date TEXT NOT NULL,
      payment_time TEXT,
      payment_method TEXT DEFAULT 'โอนเงิน',
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS daily_ledger (
      id TEXT PRIMARY KEY,
      entry_date TEXT NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      ref_contract_no TEXT,
      ref_customer_name TEXT
    );
  `);

  saveDbToFile(dbInstance);
  return dbInstance;
}

export function saveDbToFile(db) {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export async function seedDataFromJSON() {
  const db = await getDb();
  const seedFile = path.join(__dirname, '../src/services/realContractsSeed.json');
  const ledgerFile = path.join(__dirname, '../src/services/realLedgerSeed.json');

  if (!fs.existsSync(seedFile)) return;

  const res = db.exec("SELECT COUNT(*) as count FROM contracts");
  const count = res[0] && res[0].values[0] ? res[0].values[0][0] : 0;

  if (count > 0) {
    console.log(`✅ SQLite Database already seeded (${count} contracts exist).`);
    return;
  }

  const contractsData = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
  const ledgerData = fs.existsSync(ledgerFile) ? JSON.parse(fs.readFileSync(ledgerFile, 'utf8')) : [];

  console.log(`🚀 Seeding ${contractsData.length} contracts into SQLite database...`);

  contractsData.forEach((c) => {
    const customerId = `cust-${c.contractNo}`;
    db.run(
      `INSERT OR REPLACE INTO customers (id, bp_code, customer_name, phone, address) VALUES (?, ?, ?, ?, ?)`,
      [customerId, c.bpCode || null, c.customerName, c.phone || '', c.address || '']
    );

    let guarantorId = null;
    if (c.guarantorName) {
      guarantorId = `guar-${c.contractNo}`;
      db.run(
        `INSERT OR REPLACE INTO guarantors (id, guarantor_name, phone, address) VALUES (?, ?, ?, ?)`,
        [guarantorId, c.guarantorName, '', '']
      );
    }

    const productId = `prod-${c.contractNo}`;
    db.run(
      `INSERT OR REPLACE INTO products (id, product_name, price) VALUES (?, ?, ?)`,
      [productId, c.productName, c.totalPrice]
    );

    db.run(
      `INSERT OR REPLACE INTO contracts (
        id, contract_no, customer_id, guarantor_id, product_id, sale_type,
        total_price, down_payment, monthly_installment, total_installments,
        paid_installments, remaining_balance, due_date_day, start_date, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.id || `contract-${c.contractNo}`,
        c.contractNo,
        customerId,
        guarantorId,
        productId,
        c.saleType || 'เงินผ่อน',
        c.totalPrice,
        c.downPayment || 0,
        c.monthlyInstallment || 0,
        c.totalInstallments || 12,
        c.paidInstallments || 0,
        c.remainingBalance || 0,
        c.dueDateDay || 5,
        c.startDate || '2026-01-01',
        c.status || 'D0 ชำระปกติ',
        c.notes || null
      ]
    );

    if (c.payments && Array.isArray(c.payments)) {
      c.payments.forEach((p, idx) => {
        db.run(
          `INSERT OR REPLACE INTO payment_records (
            id, contract_id, receipt_no, installment_no, amount, fine_amount, payment_date, payment_time, payment_method, note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.id || `pay-${c.contractNo}-${idx}`,
            c.id || `contract-${c.contractNo}`,
            p.receiptNo || `REC-${c.contractNo}-${idx}`,
            p.installmentNo || (idx + 1),
            p.amount,
            p.fineAmount || 0,
            p.paymentDate,
            p.paymentTime || null,
            p.paymentMethod || 'โอนเงิน',
            p.note || null
          ]
        );
      });
    }
  });

  ledgerData.forEach((l) => {
    db.run(
      `INSERT OR REPLACE INTO daily_ledger (
        id, entry_date, type, category, amount, description, ref_contract_no, ref_customer_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [l.id, l.date, l.type, l.category, l.amount, l.description, l.refContractNo || null, l.refCustomerName || null]
    );
  });

  saveDbToFile(db);
  console.log('🎉 SQLite Seeding Completed!');
}
