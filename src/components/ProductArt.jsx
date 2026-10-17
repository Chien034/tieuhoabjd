import { useId } from 'react'
import { SKINS } from '../lib/data.js'

// Ảnh minh họa vẽ bằng SVG cho búp bê BJD và phụ kiện.
// Sản phẩm có ảnh thật (product.images) thì hiện ảnh thật.

const HAIR = ['#2b2321', '#5a3a2a', '#c8a27a', '#e9dccb', '#9aa7b8', '#d98fa6', '#6b4f8f', '#a33a2e', '#f2efe9']
const EYES = ['#5a3a22', '#2f6fb0', '#3b8f6a', '#8c5bc4', '#c0392b', '#c99a2e', '#7aa6c2']
const OUTFIT = ['#f2b8c6', '#2d3e5e', '#f7f2e8', '#8e2f3b', '#3f5f4a', '#c9b6e4', '#1f1f24', '#e6c27a']
const BG = ['#f7eef0', '#eef1f8', '#f3f0f8', '#eef5f1', '#f8f3ea', '#f0f4f7']

function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) }
function shade(hex, f = 0.7) {
  const n = parseInt(hex.slice(1), 16)
  const c = v => Math.max(0, Math.min(255, Math.round(v * f)))
  return '#' + [c(n >> 16), c((n >> 8) & 255), c(n & 255)].map(x => x.toString(16).padStart(2, '0')).join('')
}

function Doll({ p, look, uid }) {
  const skin = SKINS.find(s => s.key === p.skin)?.color || '#f6dcd3'
  const skinD = shade(skin, 0.86)
  const hair = HAIR[look.hair % HAIR.length], hairD = shade(hair, 0.75)
  const eye = EYES[look.eye % EYES.length]
  const cloth = OUTFIT[look.outfit % OUTFIT.length], clothD = shade(cloth, 0.8)
  const nude = p.set_type === 'nude'
  const male = p.gender === 'nam'
  const col = p.collection
  const J = ({ x, y, r = 3.2 }) => <circle cx={x} cy={y} r={r} fill={skinD} stroke={shade(skin, 0.75)} strokeWidth=".6" />
  return (
    <g>
      {/* tóc sau */}
      {!nude && (male
        ? <path d="M70 62 Q100 22 130 62 L132 86 Q100 74 68 86Z" fill={hair} />
        : <path d="M66 64 Q100 18 134 64 L140 128 Q120 120 118 104 L82 104 Q80 120 60 128Z" fill={hair} />)}
      {/* chân */}
      <path d="M90 150 L88 186 M110 150 L112 186" stroke={skin} strokeWidth="9" strokeLinecap="round" />
      <J x={88.5} y={168} /><J x={111.5} y={168} />
      {/* thân */}
      {nude ? (
        <g>
          <path d="M86 102 Q100 98 114 102 L116 128 Q118 140 112 152 L88 152 Q82 140 84 128Z" fill={skin} stroke={skinD} strokeWidth=".8" />
          <path d="M86 126 Q100 130 114 126" stroke={skinD} fill="none" /><J x={100} y={140} r={2.4} />
        </g>
      ) : male ? (
        <g>
          <path d="M84 102 Q100 97 116 102 L118 150 L82 150Z" fill={cloth} />
          <path d="M84 150 L86 172 L98 172 L100 152 L102 172 L114 172 L116 150Z" fill={clothD} />
          <path d="M96 102 L100 114 L104 102" fill="#fff" />
        </g>
      ) : (
        <g>
          <path d="M86 102 Q100 97 114 102 L116 122 Q132 150 136 160 Q100 170 64 160 Q68 150 84 122Z" fill={cloth} />
          <path d="M64 160 Q100 170 136 160 L134 165 Q100 175 66 165Z" fill="#fff" opacity=".7" />
          {col === 'hoc-duong' && <path d="M86 102 L100 118 L114 102 L118 112 L100 124 L82 112Z" fill="#fff" />}
          {col === 'lolita' && <circle cx="100" cy="122" r="5" fill="#fff" />}
        </g>
      )}
      {/* tay */}
      <path d="M85 106 L74 128 L70 146 M115 106 L126 128 L130 146" stroke={nude ? skin : male ? cloth : skin} strokeWidth="7" strokeLinecap="round" fill="none" />
      <J x={74} y={128} /><J x={126} y={128} /><J x={85} y={105} r={3.6} /><J x={115} y={105} r={3.6} />
      <circle cx="70" cy="147" r="3.6" fill={skin} /><circle cx="130" cy="147" r="3.6" fill={skin} />
      {/* giày */}
      {!nude && <><ellipse cx="87" cy="188" rx="7" ry="4" fill={col === 'hoc-duong' ? '#fff' : '#2a2224'} /><ellipse cx="113" cy="188" rx="7" ry="4" fill={col === 'hoc-duong' ? '#fff' : '#2a2224'} /></>}
      {/* cổ + đầu */}
      <rect x="95" y="90" width="10" height="12" fill={skinD} />
      <ellipse cx="100" cy="66" rx="27" ry="30" fill={skin} />
      {/* mắt */}
      {[89, 111].map(x => (
        <g key={x}>
          <ellipse cx={x} cy="70" rx="5.6" ry="6.4" fill="#fff" />
          <circle cx={x} cy="71" r="4.6" fill={`url(#iris${uid})`} />
          <circle cx={x} cy="71" r="1.9" fill="#111" />
          <circle cx={x - 1.6} cy="69" r="1.4" fill="#fff" />
          <path d={`M${x - 6.5} 64.5 Q${x} 61 ${x + 6.5} 64.5`} stroke="#3a2a28" strokeWidth="1.4" fill="none" />
        </g>
      ))}
      <ellipse cx="85" cy="81" rx="4" ry="2" fill="#f19aa8" opacity=".45" /><ellipse cx="115" cy="81" rx="4" ry="2" fill="#f19aa8" opacity=".45" />
      <path d="M97 84 Q100 86.5 103 84" stroke="#c4646f" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* tóc mái + trang trí */}
      {nude ? <ellipse cx="92" cy="48" rx="9" ry="5" fill="#fff" opacity=".35" /> : (
        <g>
          <path d="M72 64 Q74 34 100 34 Q126 34 128 64 Q118 50 108 56 Q100 44 92 56 Q82 50 72 64Z" fill={hair} />
          <path d="M84 46 Q96 38 112 42" stroke="#fff" strokeOpacity=".35" strokeWidth="2" fill="none" />
          {col === 'co-trang' && <g><circle cx="100" cy="30" r="10" fill={hair} /><path d="M86 28 L120 22" stroke="#e6c27a" strokeWidth="2.4" /><circle cx="121" cy="22" r="2.6" fill="#e05a6d" /></g>}
          {col === 'lolita' && <g fill="#fff" stroke={hairD} strokeWidth=".6"><path d="M100 36 L84 28 L86 44Z" /><path d="M100 36 L116 28 L114 44Z" /><circle cx="100" cy="36" r="3.4" /></g>}
          {col === 'dark' && <g fill="#2a2433"><path d="M80 42 L72 22 L88 38Z" /><path d="M120 42 L128 22 L112 38Z" /></g>}
        </g>
      )}
      <defs>
        <radialGradient id={`iris${uid}`} cx=".4" cy=".35" r=".8"><stop offset="0" stopColor="#fff" stopOpacity=".6" /><stop offset=".35" stopColor={eye} /><stop offset="1" stopColor={shade(eye, 0.5)} /></radialGradient>
      </defs>
    </g>
  )
}

function Accessory({ p, look }) {
  const hair = HAIR[look.hair % HAIR.length]
  const eye = EYES[look.eye % EYES.length]
  const cloth = OUTFIT[look.outfit % OUTFIT.length]
  const n = p.name.toLowerCase()
  switch (p.kind) {
    case 'wig':
      return (
        <g>
          <ellipse cx="100" cy="88" rx="38" ry="40" fill="#efe6dc" />
          {n.includes('búi') ? <circle cx="100" cy="44" r="18" fill={hair} /> : null}
          <path d={n.includes('dài') || n.includes('bím')
            ? 'M58 90 Q60 40 100 40 Q140 40 142 90 L150 168 Q128 158 124 130 L76 130 Q72 158 50 168Z'
            : n.includes('nam') ? 'M60 92 Q62 42 100 42 Q138 42 140 92 L136 108 Q100 96 64 108Z'
              : 'M58 92 Q60 40 100 40 Q140 40 142 92 L144 128 Q100 116 56 128Z'} fill={hair} />
          {n.includes('bím') && <><path d="M54 150 l-6 28" stroke={hair} strokeWidth="10" strokeLinecap="round" /><path d="M146 150 l6 28" stroke={hair} strokeWidth="10" strokeLinecap="round" /></>}
          <path d="M70 80 Q100 58 130 80" stroke="#fff" strokeOpacity=".3" strokeWidth="3" fill="none" />
          {n.includes('trâm') && <path d="M80 40 L130 30" stroke="#e6c27a" strokeWidth="3" />}
        </g>
      )
    case 'eyes':
      return (
        <g>
          {[70, 130].map(x => (
            <g key={x}>
              <circle cx={x} cy="100" r="28" fill="#fff" stroke="#ddd" />
              <circle cx={x} cy="100" r="18" fill={eye} />
              <circle cx={x} cy="100" r="18" fill="none" stroke={shade(eye, 0.5)} strokeWidth="3" />
              <circle cx={x} cy="100" r="7" fill="#111" />
              <ellipse cx={x - 7} cy="92" rx="6" ry="4" fill="#fff" opacity=".9" />
            </g>
          ))}
        </g>
      )
    case 'outfit':
      return (
        <g>
          <path d="M100 30 q-6 0 -6 6 M100 36 L60 58 L140 58Z" stroke="#9aa0aa" strokeWidth="3" fill="none" />
          {n.includes('vest') ? (
            <g><path d="M70 60 L130 60 L136 150 L64 150Z" fill={cloth} /><path d="M92 60 L100 90 L108 60" fill="#fff" /><path d="M64 150 L70 180 L96 180 L100 152 L104 180 L130 180 L136 150Z" fill={shade(cloth, 0.8)} /></g>
          ) : (
            <g>
              <path d="M78 60 L122 60 L124 92 Q150 150 156 170 Q100 182 44 170 Q50 150 76 92Z" fill={n.includes('gothic') ? '#1f1f24' : cloth} />
              <path d="M44 170 Q100 182 156 170 L154 176 Q100 188 46 176Z" fill="#fff" opacity=".8" />
              {n.includes('jk') && <path d="M78 60 L100 84 L122 60 L128 74 L100 96 L72 74Z" fill="#fff" />}
              {n.includes('hán') && <path d="M88 60 L112 110 M112 60 L88 110" stroke="#e6c27a" strokeWidth="3" />}
              {n.includes('lolita') && <circle cx="100" cy="96" r="7" fill="#fff" />}
            </g>
          )}
        </g>
      )
    case 'shoes':
      return (
        <g>
          {[[62, 0], [108, 1]].map(([x, i]) => (
            <g key={i} transform={`translate(${x} ${i ? 106 : 96})`}>
              {n.includes('bốt')
                ? <path d="M6 0 L26 0 L28 46 L52 52 Q56 60 50 64 L4 64Z" fill="#3a2a24" />
                : <path d="M0 40 Q2 20 22 22 L40 26 Q56 30 56 44 Q56 54 44 54 L6 54 Q0 52 0 40Z" fill={n.includes('trắng') ? '#fafafa' : n.includes('hài') ? cloth : '#2a2224'} stroke="#999" strokeWidth=".8" />}
              {n.includes('mary') && <path d="M14 26 L40 30" stroke="#2a2224" strokeWidth="4" />}
            </g>
          ))}
        </g>
      )
    default:
      if (n.includes('giá đỡ')) return <g><ellipse cx="100" cy="172" rx="44" ry="10" fill="#9aa3ad" /><rect x="96" y="60" width="8" height="112" fill="#b8c0c9" /><path d="M70 64 Q100 50 130 64" stroke="#b8c0c9" strokeWidth="7" fill="none" strokeLinecap="round" /></g>
      if (n.includes('túi')) return <g><rect x="50" y="56" width="100" height="120" rx="14" fill={cloth} /><path d="M78 56 Q100 20 122 56" stroke={shade(cloth, 0.6)} strokeWidth="7" fill="none" /><rect x="64" y="80" width="72" height="64" rx="8" fill="#fff" opacity=".35" /></g>
      if (n.includes('hộp')) return <g><rect x="54" y="40" width="92" height="136" rx="4" fill="#dbe8f5" opacity=".7" stroke="#9fb6cc" strokeWidth="2" /><path d="M54 40 L72 28 L164 28 L146 40" fill="#eef4fa" stroke="#9fb6cc" /><path d="M146 40 L164 28 L164 164 L146 176" fill="#cfe0f0" stroke="#9fb6cc" /><rect x="60" y="46" width="80" height="6" fill="#fff8d6" /></g>
      if (n.includes('dây thun')) return <g fill="none" stroke="#e8e2d6" strokeWidth="6">{[0, 1, 2, 3].map(i => <ellipse key={i} cx="100" cy={70 + i * 22} rx="46" ry="14" />)}</g>
      return <g>{[0, 1, 2, 3, 4].map(i => <g key={i} transform={`rotate(${-20 + i * 10} 100 170)`}><rect x="97" y="52" width="6" height="110" rx="3" fill={['#c8a27a', '#2d3e5e', '#8e2f3b', '#3f5f4a', '#6b4f8f'][i]} /><path d="M97 52 L100 36 L103 52Z" fill="#333" /></g>)}<rect x="56" y="150" width="88" height="30" rx="6" fill="#f2b8c6" /></g>
  }
}

export default function ProductArt({ product, variant = 0, className = '' }) {
  const uid = useId().replace(/:/g, '')
  if (product.images?.length) {
    return <img className={'art ' + className} src={product.images[variant] || product.images[0]} alt={product.name} loading="lazy" />
  }
  const h = hash(product.id || product.name)
  const look = product.look || { hair: h % 9, eye: h % 7, outfit: h % 8 }
  const bg = BG[(h + variant) % BG.length]
  const zoom = variant === 1 ? (product.kind === 'doll' ? 1.9 : 1.3) : variant === 3 ? 0.9 : 1
  const ty = variant === 1 && product.kind === 'doll' ? 34 : 0
  const rot = variant === 2 ? -8 : variant === 3 ? 6 : 0
  return (
    <svg className={'art ' + className} viewBox="0 0 200 200" role="img" aria-label={product.name}>
      <rect width="200" height="200" fill={bg} />
      <circle cx="100" cy="100" r="80" fill="#fff" opacity=".55" />
      <ellipse cx="100" cy="190" rx="50" ry="5" fill="#000" opacity=".08" />
      <g transform={`translate(100 ${100 + ty}) scale(${zoom}) rotate(${rot}) translate(-100 -100)`}>
        {product.kind === 'doll' ? <Doll p={product} look={look} uid={uid} /> : <Accessory p={product} look={look} />}
      </g>
      {product.scale && product.scale !== 'all' && variant === 0 && <g><rect x="8" y="176" width="34" height="16" rx="8" fill="#fff" opacity=".85" /><text x="25" y="188" fontSize="10" textAnchor="middle" fill="#6b4f8f" fontWeight="700">{product.scale}</text></g>}
    </svg>
  )
}
