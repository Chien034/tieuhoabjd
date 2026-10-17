import { youtubeId } from '../lib/variants.js'

// Video sản phẩm: file tải lên (mp4/webm/mov) hoặc link YouTube
export function VideoView({ src, className = '' }) {
  const yt = youtubeId(src)
  if (yt) return <iframe className={'art video ' + className} src={`https://www.youtube-nocookie.com/embed/${yt}`} title="Video sản phẩm" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
  return <video className={'art video ' + className} src={src} controls playsInline preload="metadata" />
}

// Ô nhỏ đại diện cho video trong danh sách ảnh
export function VideoThumb({ src }) {
  const yt = youtubeId(src)
  return (
    <span className="video-thumb">
      {yt ? <img src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} alt="" loading="lazy" /> : <video src={src + '#t=0.5'} preload="metadata" muted playsInline />}
      <i aria-hidden="true">▶</i>
    </span>
  )
}

// Danh sách ảnh + video cho trang sản phẩm: ảnh sản phẩm, ảnh riêng của biến thể, rồi video.
// Chưa có ảnh thật → 4 hình minh họa (ProductArt variant 0–3).
export function productMedia(p) {
  const imgs = p.images || []
  const extra = [...new Set((p.variants || []).map(v => v.image).filter(x => x && !imgs.includes(x)))]
  const pics = [...imgs, ...extra]
  const base = pics.length ? pics.map(src => ({ type: 'img', src })) : [0, 1, 2, 3].map(n => ({ type: 'art', n }))
  return [...base, ...(p.videos || []).map(src => ({ type: 'video', src }))]
}
