import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolveTheme, THEME_KEY } from '../src/lib/theme.js'

test('chế độ Nhật/Nguyệt: lựa chọn đã lưu thắng, chưa chọn thì theo máy', () => {
  assert.equal(resolveTheme('dark', false), 'dark')
  assert.equal(resolveTheme('light', true), 'light')
  assert.equal(resolveTheme(null, true), 'dark')
  assert.equal(resolveTheme('rác', false), 'light')
})

test('script chống nháy trong index.html dùng cùng khoá lưu', () => {
  assert.ok(readFileSync(new URL('../index.html', import.meta.url), 'utf8').includes(`'${THEME_KEY}'`))
})
