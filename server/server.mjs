import express from 'express';
import cors from 'cors';
import { getDb, saveDbToFile, seedDataFromJSON } from './initDb.mjs';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

console.log('🚀 Initializing NYC Accounting SQL Database...');
await seedDataFromJSON();

// Helper to convert sql.js result to array of objects
function execToObjects(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const result = [];
  while (stmt.step()) {
    result.push(stmt.getAsObject());
  }
  stmt.free();
  return result;
}

// GET /api/contracts - Get all contracts from SQL Database
app.get('/api/contracts', async (req, res) => {
  try {
    const db = await getDb();
    const contracts = execToObjects(
      db,
      `
      SELECT 
        c.id, c.contract_no as contractNo, cust.bp_code as bpCode, cust.customer_name as customerName,
        g.guarantor_name as guarantorName, cust.phone, cust.address, cust.id_card_no as idCardNo,
        p.product_name as productName, p.brand, p.model, p.color, p.serial_no as serialNo,
        c.sale_type as saleType, c.total_price as totalPrice, c.down_payment as downPayment,
        c.monthly_installment as monthlyInstallment, c.total_installments as totalInstallments,
        c.paid_installments as paidInstallments, c.remaining_balance as remainingBalance,
        c.due_date_day as dueDateDay, c.start_date as startDate, c.status, c.notes
      FROM contracts c
      JOIN customers cust ON c.customer_id = cust.id
      LEFT JOIN guarantors g ON c.guarantor_id = g.id
      JOIN products p ON c.product_id = p.id
      ORDER BY c.contract_no ASC
      `
    );

    const allPayments = execToObjects(
      db,
      `
      SELECT 
        id, contract_id as contractId, receipt_no as receiptNo, amount, fine_amount as fineAmount,
        payment_date as paymentDate, payment_time as paymentTime, installment_no as installmentNo,
        payment_method as paymentMethod, note
      FROM payment_records
      ORDER BY payment_date ASC
      `
    );

    const paymentsMap = {};
    allPayments.forEach((p) => {
      if (!paymentsMap[p.contractId]) paymentsMap[p.contractId] = [];
      paymentsMap[p.contractId].push(p);
    });

    const result = contracts.map((c) => ({
      ...c,
      category: 'มือถือ',
      payments: paymentsMap[c.id] || [],
    }));

    res.json(result);
  } catch (err) {
    console.error('API Error /api/contracts:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contracts - Save new Contract to SQL Database
app.post('/api/contracts', async (req, res) => {
  try {
    const db = await getDb();
    const c = req.body;
    const customerId = `cust-${c.contractNo}-${Date.now()}`;
    const guarantorId = c.guarantorName ? `guar-${c.contractNo}-${Date.now()}` : null;
    const productId = `prod-${c.contractNo}-${Date.now()}`;
    const contractId = c.id || `contract-${c.contractNo}-${Date.now()}`;

    db.run(
      `INSERT OR REPLACE INTO customers (id, bp_code, customer_name, phone, address, id_card_no) VALUES (?, ?, ?, ?, ?, ?)`,
      [customerId, c.bpCode || null, c.customerName, c.phone, c.address, c.idCardNo || null]
    );

    if (guarantorId) {
      db.run(
        `INSERT OR REPLACE INTO guarantors (id, guarantor_name) VALUES (?, ?)`,
        [guarantorId, c.guarantorName]
      );
    }

    db.run(
      `INSERT OR REPLACE INTO products (id, product_name, brand, model, color, serial_no, price) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [productId, c.productName, c.brand || null, c.model || null, c.color || null, c.serialNo || null, c.totalPrice]
    );

    db.run(
      `INSERT OR REPLACE INTO contracts (
        id, contract_no, customer_id, guarantor_id, product_id, sale_type,
        total_price, down_payment, monthly_installment, total_installments,
        paid_installments, remaining_balance, due_date_day, start_date, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contractId,
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
        c.startDate || new Date().toISOString().split('T')[0],
        c.status || 'D0 ชำระปกติ',
        c.notes || null
      ]
    );

    saveDbToFile(db);
    res.json({ success: true, contractNo: c.contractNo });
  } catch (err) {
    console.error('API Error POST /api/contracts:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments - Record Contract Payment in SQL Database
app.post('/api/payments', async (req, res) => {
  try {
    const db = await getDb();
    const { contractNo, amount, paymentMethod, paymentDate, paymentTime, fineAmount, note, receiptNo } = req.body;

    const contracts = execToObjects(db, `SELECT * FROM contracts WHERE contract_no = ?`, [contractNo]);
    const contract = contracts[0];

    if (!contract) {
      return res.status(404).json({ error: 'ไม่พบสัญญานี้ในฐานข้อมูล SQL' });
    }

    const newPaidInstallments = contract.paid_installments + 1;
    const newRemainingBalance = Math.max(0, contract.remaining_balance - amount);
    let newStatus = contract.status;

    if (newRemainingBalance === 0) {
      newStatus = 'ปิดสัญญาแล้ว';
    } else {
      if (contract.status.startsWith('D6')) newStatus = 'D5 ค้างชำระ 5 เดือน';
      else if (contract.status.startsWith('D5')) newStatus = 'D4 ค้างชำระ 4 เดือน';
      else if (contract.status.startsWith('D4')) newStatus = 'D3 ค้างชำระ 3 เดือน';
      else if (contract.status.startsWith('D3')) newStatus = 'D2 ค้างชำระ 2 เดือน';
      else if (contract.status.startsWith('D2')) newStatus = 'D1 ค้างชำระ 1 เดือน';
      else if (contract.status.startsWith('D1')) newStatus = 'D0 ชำระปกติ';
    }

    db.run(
      `UPDATE contracts SET paid_installments = ?, remaining_balance = ?, status = ? WHERE contract_no = ?`,
      [newPaidInstallments, newRemainingBalance, newStatus, contractNo]
    );

    const paymentId = `pay-${Date.now()}`;
    const effectiveReceiptNo = receiptNo || `REC-${Date.now().toString().slice(-6)}`;
    const effectiveDate = paymentDate || new Date().toISOString().split('T')[0];

    db.run(
      `INSERT INTO payment_records (
        id, contract_id, receipt_no, installment_no, amount, fine_amount, payment_date, payment_time, payment_method, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentId,
        contract.id,
        effectiveReceiptNo,
        newPaidInstallments,
        amount,
        fineAmount || 0,
        effectiveDate,
        paymentMethod === 'โอนเงิน' ? paymentTime : null,
        paymentMethod,
        note || null
      ]
    );

    const customerRes = execToObjects(db, `SELECT customer_name FROM customers WHERE id = ?`, [contract.customer_id]);
    const customerName = customerRes[0] ? customerRes[0].customer_name : '';

    db.run(
      `INSERT INTO daily_ledger (
        id, entry_date, type, category, amount, description, ref_contract_no, ref_customer_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `led-${Date.now()}-1`,
        effectiveDate,
        'income',
        'รับชำระค้างชำระ',
        amount,
        `รับชำระค่างวดที่ ${newPaidInstallments} สัญญา ${contractNo} (${customerName}) [ใบเสร็จเลขที่: ${effectiveReceiptNo}]`,
        contractNo,
        customerName
      ]
    );

    saveDbToFile(db);
    res.json({ success: true, receiptNo: effectiveReceiptNo, newStatus });
  } catch (err) {
    console.error('API Error POST /api/payments:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ledger - Get Daily Ledger Items from SQL Database
app.get('/api/ledger', async (req, res) => {
  try {
    const db = await getDb();
    const items = execToObjects(
      db,
      `
      SELECT 
        id, entry_date as date, type, category, amount, description,
        ref_contract_no as refContractNo, ref_customer_name as refCustomerName
      FROM daily_ledger
      ORDER BY entry_date DESC
      `
    );
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ NYC Accounting SQL Database REST API Server is running on http://localhost:${PORT}`);
});
