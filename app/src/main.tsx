import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { hideSplash } from './utils/splash'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// フェイルセーフ: 認証の復元が何らかの理由で完了しなくても、
// スプラッシュが出たまま固まらないように必ず閉じる。
window.setTimeout(hideSplash, 8000)
