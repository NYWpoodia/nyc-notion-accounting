# 🗺️ Project Map: NYC Notion Accounting Web App

เอกสารแผนผังระบบและดรรชนีไฟล์ (Project Map Dictionary) จัดทำขึ้นเพื่อลดการอ่านไฟล์ซ้ำซ้อน (Save Tokens) และเพิ่มประสิทธิภาพในการเข้าถึงและแก้ไขโค้ด

---

## 📐 Layout & Responsive Container
- **Full-width Auto Layout (`w-full max-w-full`)**: ปรับแต่งให้ทุกหน้าขยายพื้นที่การใช้งานเต็มความกว้างหน้าจอโดยอัตโนมัติ
- **Customer Master Data & Guarantor Edit Feature in Customers View (`CustomersView.tsx`)**:
  - เพิ่มปุ่ม **`✏️ แก้ไข`** ในตาราง (Table View), การ์ด (Grid View), และป๊อปอัปรายละเอียดสัญญา (Contract Detail Modal) ของหน้า **ฐานข้อมูลลูกค้า & สัญญา**
  - แสดงป๊อปอัปแก้ไขข้อมูล **`EDIT CUSTOMER & GUARANTOR MASTER PROFILE MODAL`** เพื่อให้เจ้าหน้าที่สามารถแก้ไข รหัส BP, ชื่อผู้ซื้อ, เบอร์โทรผู้ซื้อ, ชื่อผู้ค้ำประกัน, เบอร์โทรผู้ค้ำประกัน, ที่อยู่ตามสำเนาทะเบียนบ้าน และพิกัด GPS ได้ทันทีทุกรายการ
