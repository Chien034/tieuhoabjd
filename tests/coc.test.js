import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeTotals, depositFor, minDeposit, amountDue, applyPayment, orderCodeIn } from '../src/lib/pricing.js'
import { sepayVerify } from '../api/_lib.js'

test('mức trả trước: tối thiểu 50%, chọn 70% / trả hết / tự nhập', () => {
  assert.equal(minDeposit(5_410_000), 2_705_000)
  assert.equal(minDeposit(1_480_001), 741_000)
  assert.deepEqual(depositFor(5_410_000, null), { deposit: 2_705_000, error: null })
  assert.deepEqual(depositFor(5_410_000, { pct: 70 }), { deposit: 3_787_000, error: null })
  assert.deepEqual(depositFor(5_410_000, { pct: 100 }), { deposit: 0, error: null }) // trả hết = trả một lần
  assert.deepEqual(depositFor(5_410_000, { amount: '3000000' }), { deposit: 3_000_000, error: null })
  assert.deepEqual(depositFor(5_410_000, { amount: 5_410_000 }), { deposit: 0, error: null })
  assert.match(depositFor(5_410_000, { amount: 2_704_999 }).error, /2\.705\.000/)
  assert.ok(depositFor(5_410_000, { amount: 5_410_001 }).error)
  const t = computeTotals({ subtotal: 5_410_000, delivery: 'pickup', preorder: true, depositChoice: { amount: 4_000_000 } })
  assert.deepEqual([t.total, t.deposit, t.depositError], [5_410_000, 4_000_000, null])
  assert.equal(computeTotals({ subtotal: 5_410_000, delivery: 'pickup', depositChoice: { pct: 70 } }).deposit, 0) // hàng có sẵn: không cọc
})

test('số cần trả tính theo số đã trả, đơn cũ chưa có paid_amount vẫn đúng', () => {
  const o = { status: 'cho_xac_nhan', total: 1_000_000, deposit: 600_000, payment_status: 'chua_thanh_toan', paid_amount: 0 }
  assert.equal(amountDue(o), 600_000)
  assert.equal(amountDue({ ...o, paid_amount: 100_000 }), 500_000)
  assert.equal(amountDue({ ...o, payment_status: 'da_coc', paid_amount: 700_000 }), 300_000)
  assert.equal(amountDue({ status: 'cho_xac_nhan', total: 1_000_000, deposit: 600_000, payment_status: 'da_coc' }), 400_000)
  assert.equal(amountDue({ ...o, status: 'da_huy' }), 0)
})

test('nhận tiền: thiếu thì giữ nguyên, đủ cọc thì tự xác nhận, đủ tổng thì đã thanh toán', () => {
  const o = { status: 'cho_xac_nhan', total: 1_000_000, deposit: 600_000, payment_status: 'chua_thanh_toan', paid_amount: 0 }
  assert.deepEqual(applyPayment(o, 100_000), { paid_amount: 100_000, payment_status: 'chua_thanh_toan', status: 'cho_xac_nhan', confirmed: false })
  assert.deepEqual(applyPayment({ ...o, paid_amount: 100_000 }, 500_000), { paid_amount: 600_000, payment_status: 'da_coc', status: 'da_xac_nhan', confirmed: true })
  assert.deepEqual(applyPayment({ ...o, payment_status: 'da_coc', status: 'dang_giao', paid_amount: 600_000 }, 400_000), { paid_amount: 1_000_000, payment_status: 'da_thanh_toan', status: 'dang_giao', confirmed: false })
  assert.equal(applyPayment({ ...o, deposit: 0 }, 1_000_000).status, 'da_xac_nhan')
})

test('tìm mã đơn trong nội dung chuyển khoản', () => {
  assert.equal(orderCodeIn('NGUYEN VAN A chuyen tien HK26101712345 COC'), 'HK26101712345')
  assert.equal(orderCodeIn('hk26101712345coc'), 'HK26101712345')
  assert.equal(orderCodeIn('MBVCB.123.HK 26101712345.CT'), 'HK26101712345')
  assert.equal(orderCodeIn('HK2610171234'), null)
  assert.equal(orderCodeIn('HK261017123456'), null)
  assert.equal(orderCodeIn(null), null)
})

test('webhook SePay: kiểm tra API Key, bỏ qua tiền ra, đọc mã đơn và số tiền', () => {
  const body = { id: 92704, gateway: 'MBBank', transferType: 'in', transferAmount: 2705000, content: 'HK26101712345 COC', code: null, referenceCode: 'FT123' }
  const h = { authorization: 'Apikey bi-mat-123' }
  assert.equal(sepayVerify({ authorization: 'Apikey sai' }, body, 'bi-mat-123'), null)
  assert.equal(sepayVerify({}, body, 'bi-mat-123'), null)
  assert.equal(sepayVerify(h, body, ''), null)
  assert.deepEqual(sepayVerify(h, { ...body, transferType: 'out' }, 'bi-mat-123'), { skip: true })
  assert.deepEqual(sepayVerify(h, body, 'bi-mat-123'), { ref: '92704', code: 'HK26101712345', amount: 2705000, content: 'HK26101712345 COC' })
  assert.equal(sepayVerify(h, { ...body, content: 'tien an', code: 'HK26101799999' }, 'bi-mat-123').code, 'HK26101799999')
})

test('SQL coc-tu-xac-nhan.sql khớp schema.sql, chỉ máy chủ được ghi tiền', async () => {
  const { readFileSync } = await import('node:fs')
  const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')
  const mig = readFileSync(new URL('../supabase/coc-tu-xac-nhan.sql', import.meta.url), 'utf8')
  const fn = (sql, name) => sql.slice(sql.indexOf(`create or replace function public.${name}(`), sql.indexOf('$$;', sql.indexOf(`create or replace function public.${name}(`)))
  for (const name of ['place_order', 'fmt_vnd', 'amount_due', 'apply_payment', 'record_payment', 'record_bank_transfer', 'order_changed', 'cancel_my_order']) {
    assert.ok(fn(mig, name).length > 50, name)
    assert.equal(fn(mig, name), fn(schema, name), name)
  }
  for (const f of ['apply_payment(uuid, bigint, text, text)', 'record_bank_transfer(text, text, text, bigint, text)']) {
    assert.ok(mig.includes(`revoke execute on function public.${f} from public, anon, authenticated;`), f)
  }
  assert.match(mig, /add column if not exists paid_amount/)
})
