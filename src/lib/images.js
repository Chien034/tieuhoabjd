// Thu nhỏ ảnh trên trình duyệt trước khi tải lên (ảnh Taobao thường 1–3 MB, 1500–2000px).
export async function resizeImage(file, maxSide = 1200, quality = 0.85) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error(`${file.name}: chỉ nhận ảnh JPG, PNG, WEBP`)
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error(`${file.name}: không đọc được ảnh`)); i.src = url })
    const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k)
    const g = c.getContext('2d')
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height) // nền trắng cho ảnh PNG trong suốt
    g.drawImage(img, 0, 0, c.width, c.height)
    return await new Promise((ok, bad) => c.toBlob(b => (b ? ok(b) : bad(new Error('Không nén được ảnh'))), 'image/jpeg', quality))
  } finally { URL.revokeObjectURL(url) }
}

export const blobToDataUrl = blob => new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = bad; r.readAsDataURL(blob) })

export function download(name, content, type) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export const toCsv = rows => '﻿' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
