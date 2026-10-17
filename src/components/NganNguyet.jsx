// Nhân vật trợ lý 2D (vẽ bằng SVG): thiếu nữ tóc bạc, áo cổ giao lĩnh, trâm trăng khuyết, ánh trăng sau lưng.
// Là nhân vật vẽ riêng cho shop (gợi nhớ phong cách tiên hiệp), không dùng hình gốc của phim/truyện.
// mood: 'cho' (đứng yên) | 'chao' (vẫy tay) | 'vui' | 'nghi' (suy nghĩ) | 'ngai' (ngại / xin lỗi) | 'noi' (đang trả lời)
// image: nếu quản trị tải ảnh riêng lên thì hiện ảnh đó (vẫn có hiệu ứng bay nhẹ, ánh trăng).
import { useId } from 'react'

export default function NganNguyet({ mood = 'cho', size = 120, image = '', bust = false, className = '' }) {
  const id = useId().replace(/:/g, '')
  const g = k => `${k}-${id}`
  const happy = mood === 'vui' || mood === 'chao'
  const vb = bust ? '34 20 132 132' : '0 0 200 220'
  if (image) {
    return (
      <span className={`nn nn-${mood} ${bust ? 'nn-round' : ''} ${className}`} style={{ width: size, height: size }}>
        <span className="nn-img-wrap nn-body"><img src={image} alt="" className="nn-img" /></span>
      </span>
    )
  }
  const svg = (
    <svg className={`nn nn-${mood} ${bust ? '' : className}`} viewBox={vb} width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id={g('moon')} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fffbe8" stopOpacity=".95" />
          <stop offset=".55" stopColor="#e3ecff" stopOpacity=".55" />
          <stop offset="1" stopColor="#d8e2ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={g('hair')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7f9fd" />
          <stop offset=".6" stopColor="#dfe6f3" />
          <stop offset="1" stopColor="#c4cfe6" />
        </linearGradient>
        <linearGradient id={g('robe')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e4ebf8" />
        </linearGradient>
        <linearGradient id={g('iris')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b62b8" />
          <stop offset=".6" stopColor="#8f9de0" />
          <stop offset="1" stopColor="#c7d6ff" />
        </linearGradient>
      </defs>

      {/* ánh trăng sau lưng */}
      <circle className="nn-aura" cx="100" cy="88" r="84" fill={`url(#${g('moon')})`} />
      <g className="nn-sparks" fill="#fff6c9">
        <path d="M30 60l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
        <path d="M170 42l1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5z" />
        <path d="M176 150l1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5z" />
        <path d="M22 140l1.2 3.6 3.6 1.2-3.6 1.2-1.2 3.6-1.2-3.6-3.6-1.2 3.6-1.2z" />
      </g>

      <g className="nn-body">
        {/* tóc sau */}
        <g className="nn-hair-back">
          <path d="M54 82Q48 28 100 24Q152 28 146 82L158 196Q132 212 100 206Q68 212 42 196Z" fill={`url(#${g('hair')})`} stroke="#b7c3dc" strokeWidth="1.2" />
          <path d="M60 120Q58 160 66 196M140 120Q142 160 134 196M80 150Q78 180 84 204M120 150Q122 180 116 204" stroke="#c9d3e8" strokeWidth="1.4" fill="none" />
        </g>

        {/* áo */}
        <path d="M44 222Q48 162 100 148Q152 162 156 222Z" fill={`url(#${g('robe')})`} stroke="#c3cee6" strokeWidth="1.2" />
        <path d="M100 150L80 222M100 150L120 222" stroke="#e8eef9" strokeWidth="10" />
        <path d="M84 150L100 186L116 150" fill="none" stroke="#8fa9dc" strokeWidth="4" strokeLinejoin="round" />
        <path d="M88 150L100 178L112 150" fill="#f6f8fd" />
        <path d="M60 206Q100 196 140 206L142 216Q100 206 58 216Z" fill="#9db4e4" />
        <circle cx="100" cy="206" r="4" fill="#f3d98b" />
        <path d="M100 210l-4 12M100 210l4 12" stroke="#c8a2d8" strokeWidth="1.6" />

        {/* cổ + mặt */}
        <rect x="92" y="124" width="16" height="28" rx="6" fill="#f8e3da" />
        <path d="M62 88Q62 50 100 50Q138 50 138 88Q138 118 100 134Q62 118 62 88Z" fill="#fdeee8" stroke="#ecc9bd" strokeWidth="1" />
        <ellipse cx="78" cy="108" rx="7" ry="4" fill="#f7b9c4" opacity={mood === 'ngai' ? '.85' : '.5'} />
        <ellipse cx="122" cy="108" rx="7" ry="4" fill="#f7b9c4" opacity={mood === 'ngai' ? '.85' : '.5'} />
        {/* ấn trăng trên trán */}
        <path d="M100 62a4 4 0 1 0 3 6a3.2 3.2 0 1 1-3-6z" fill="#9fb3ea" opacity=".85" />

        {/* lông mày */}
        {mood === 'ngai'
          ? <path d="M76 80Q83 76 90 79M110 79Q117 76 124 80" stroke="#a8b0c8" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          : mood === 'nghi'
            ? <path d="M76 79Q83 74 90 78M110 76Q117 73 124 77" stroke="#a8b0c8" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            : <path d="M76 80Q83 76 90 78M110 78Q117 76 124 80" stroke="#a8b0c8" strokeWidth="1.6" fill="none" strokeLinecap="round" />}

        {/* mắt */}
        {happy ? (
          <g stroke="#4b4f78" strokeWidth="2.6" fill="none" strokeLinecap="round">
            <path d="M76 97Q83 89 90 97" /><path d="M110 97Q117 89 124 97" />
          </g>
        ) : (
          <g className="nn-eyes">
            {[83, 117].map(x => (
              <g key={x} className={mood === 'nghi' ? 'nn-look-up' : ''}>
                <ellipse cx={x} cy="96" rx="7.5" ry="9.5" fill="#fff" />
                <ellipse cx={x} cy="97" rx="6.5" ry="8.5" fill={`url(#${g('iris')})`} />
                <ellipse cx={x} cy="98" rx="3" ry="4" fill="#2d2f5e" />
                <circle cx={x - 2.4} cy="93" r="2.2" fill="#fff" />
                <circle cx={x + 2.4} cy="101" r="1" fill="#fff" opacity=".8" />
                <path d={`M${x - 9} 90Q${x} 83 ${x + 9} 90`} stroke="#4b4f78" strokeWidth="2.4" fill="none" strokeLinecap="round" />
              </g>
            ))}
          </g>
        )}

        {/* miệng */}
        {mood === 'noi'
          ? <ellipse className="nn-talk" cx="100" cy="117" rx="3.6" ry="2.6" fill="#d97b8c" />
          : happy
            ? <path d="M93 114Q100 122 107 114Q100 117 93 114Z" fill="#e48b9a" stroke="#d07484" strokeWidth="1" />
            : mood === 'ngai'
              ? <path d="M95 118Q100 115 105 118" stroke="#d07484" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              : mood === 'nghi'
                ? <path d="M96 117L104 116" stroke="#d07484" strokeWidth="1.8" strokeLinecap="round" />
                : <path d="M95 115Q100 119 105 115" stroke="#d07484" strokeWidth="1.8" fill="none" strokeLinecap="round" />}

        {/* tóc mái + tóc hai bên */}
        <g className="nn-hair-front">
          <path d="M58 92Q54 42 100 38Q146 42 142 92Q134 66 120 58Q114 78 100 70Q90 80 82 60Q68 68 58 92Z" fill={`url(#${g('hair')})`} stroke="#b7c3dc" strokeWidth="1.2" />
          <path d="M60 84Q52 130 62 180Q70 150 70 98Z" fill={`url(#${g('hair')})`} stroke="#b7c3dc" strokeWidth="1" />
          <path d="M140 84Q148 130 138 180Q130 150 130 98Z" fill={`url(#${g('hair')})`} stroke="#b7c3dc" strokeWidth="1" />
          <path d="M100 40Q96 56 100 70M86 46Q84 58 88 66" stroke="#cdd6ea" strokeWidth="1.2" fill="none" />
        </g>

        {/* trâm trăng khuyết + tua */}
        <g className="nn-pin">
          <path d="M128 40a12 12 0 1 0 10 18a9.5 9.5 0 1 1-10-18z" fill="#ffe7a3" stroke="#e5c66f" strokeWidth="1" />
          <circle cx="140" cy="56" r="2.4" fill="#b9c9f5" />
          <path className="nn-tassel" d="M140 58Q142 70 139 80M140 58Q137 70 142 78" stroke="#c8a2d8" strokeWidth="1.4" fill="none" />
        </g>

        {/* mồ hôi khi ngại */}
        {mood === 'ngai' && <path className="nn-drop" d="M136 70q4 6 0 9q-4-3 0-9z" fill="#bfe1ff" stroke="#8cc4f2" strokeWidth=".8" />}

        {/* tay */}
        {mood === 'chao' && (
          <g className="nn-wave">
            <path d="M150 220Q150 180 156 150" stroke="#eef2fb" strokeWidth="16" strokeLinecap="round" fill="none" />
            <ellipse cx="157" cy="136" rx="9" ry="11" fill="#fdeee8" stroke="#ecc9bd" />
            <path d="M151 128v-8M155 126v-10M159 126v-10M163 129v-7" stroke="#fdeee8" strokeWidth="4" strokeLinecap="round" />
          </g>
        )}
        {mood === 'nghi' && (
          <g>
            <path d="M140 222Q136 176 116 140" stroke="#eef2fb" strokeWidth="15" strokeLinecap="round" fill="none" />
            <ellipse cx="112" cy="132" rx="8" ry="7" fill="#fdeee8" stroke="#ecc9bd" />
            <g className="nn-dots" fill="#9fb3ea"><circle cx="150" cy="70" r="3" /><circle cx="160" cy="58" r="4" /><circle cx="172" cy="44" r="5" /></g>
          </g>
        )}
        {happy && mood === 'vui' && <g className="nn-hearts" fill="#f4a3b8"><path d="M160 80c-3-4-9-1-6 4l6 6 6-6c3-5-3-8-6-4z" /></g>}
      </g>
    </svg>
  )
  // bust: khung tròn (ảnh đại diện ở nút mở, đầu khung chat, cạnh tin nhắn)
  return bust ? <span className={`nn-round ${className}`} style={{ width: size, height: size }}>{svg}</span> : svg
}
