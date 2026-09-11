import { useState, useEffect } from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { X, HelpCircle, FileText, Settings, Key, Zap } from 'lucide-react';

export function HelpModal() {
  const isHelpOpen = useScoreStore((s) => s.isHelpOpen);
  const setIsHelpOpen = useScoreStore((s) => s.setIsHelpOpen);
  const [activeTab, setActiveTab] = useState<'basic' | 'spread' | 'paper' | 'shortcuts'>('basic');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Input fields shouldn't trigger modal
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) return;
      
      if (e.key === 'h' || e.key === 'H' || e.key === '?') {
        setIsHelpOpen(true);
      }
      if (e.key === 'Escape' && isHelpOpen) {
        setIsHelpOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHelpOpen, setIsHelpOpen]);

  if (!isHelpOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', padding: '20px'
      }}
      onClick={() => setIsHelpOpen(false)}
    >
      <div
        style={{
          background: 'var(--color-panel)', width: '100%', maxWidth: '720px', maxHeight: '90vh',
          borderRadius: '16px', border: '1px solid var(--color-border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)', animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <HelpCircle size={24} color="var(--color-accent)" />
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>使い方ガイド</h2>
          </div>
          <button type="button" className="btn btn-icon" onClick={() => setIsHelpOpen(false)} style={{ background: 'transparent' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', overflowX: 'auto' }}>
          {[
            { id: 'basic', icon: <Zap size={16} />, label: '基本の流れ' },
            { id: 'spread', icon: <Settings size={16} />, label: '見開きの整え方' },
            { id: 'paper', icon: <FileText size={16} />, label: '用紙・製本の知識' },
            { id: 'shortcuts', icon: <Key size={16} />, label: '操作一覧' },
          ].map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                flex: 1, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: 'transparent', border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--color-text)' : 'var(--color-text-muted)', fontWeight: activeTab === tab.id ? 700 : 500,
                cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', lineHeight: '1.6' }}>
          {activeTab === 'basic' && (
            <div>
              <h3 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--color-accent)' }}>基本ワークフロー</h3>
              <ol style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li><strong>PDFを読み込む:</strong> 画面にPDFをドロップするか「PDF読込」からファイルを選択します。</li>
                <li><strong>自動検出を活用:</strong> 「✨ 黒枠を自動検出」を押すと、スキャン時の黒い余白を自動でカットします。</li>
                <li><strong>用紙を選択:</strong> 「A4縦」や「B4縦」など、印刷したい用紙サイズを選択します。</li>
                <li><strong>一括適用:</strong> サイドバー（スマホは⚙設定）から「全ページに適用」を押すと、設定が全ページに反映されます。</li>
                <li><strong>PDF出力:</strong> ヘッダー（スマホは上部バー）の「PDF出力」を押すと、印刷品質（300DPI）の最適化PDFが書き出されます。</li>
              </ol>
            </div>
          )}

          {activeTab === 'spread' && (
            <div>
              <h3 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--color-accent)' }}>A3見開きスキャン（自炊）の整え方・黄金手順</h3>
              <div style={{ background: 'var(--color-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                <ol style={{ paddingLeft: '24px', margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <li><strong>表紙（1ページ目）の設定:</strong><br/>表紙は「単ページ」であるため、ページ処理モードを「単ページ」にし、「このページを保存」で個別設定化します。</li>
                  <li><strong>本文（2ページ目以降）の設定:</strong><br/>2ページ目に移動し、ページ処理モードを「見開き分割」にします。</li>
                  <li><strong>中央線の調整:</strong><br/>画面中央のオレンジ色の線（ノド）をドラッグして、谷折りの中心に合わせます。</li>
                  <li><strong>このページ以降に適用:</strong><br/>2ページ目の設定を「このページ以降すべてに適用」ボタンで適用します。これで表紙は単一、本文は見開き分割になります。</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'paper' && (
            <div>
              <h3 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--color-accent)' }}>用紙と製本の知識</h3>
              <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <li><strong>B4縦 (257×364mm):</strong><br/>日本のオーケストラ標準のパート譜サイズです。最も読みやすく、演奏会で標準的に使われます。</li>
                <li><strong>菊倍判 (218×304mm):</strong><br/>国内の出版楽譜やピアノ譜で一般的なサイズです。A4より一回り大きく、B4より小さいです。</li>
                <li><strong>A3横 (見開きスコア):</strong><br/>指揮者がスコア（総譜）を読む際に使われる見開きサイズです。</li>
                <li><strong>0mmマージンの意味:</strong><br/>Score Optimizerはデフォルトで余白を0mmにします。これは「用紙いっぱいに音符を最大化し、演奏時の視認性を高める」ためです。プリンターのフチなし印刷機能と組み合わせてください。</li>
              </ul>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <h4 style={{ fontSize: '16px', marginBottom: '12px', color: 'var(--color-accent)' }}>PCショートカット</h4>
                <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <li><kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '4px' }}>←</kbd> / <kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '4px' }}>→</kbd> : ページ送り</li>
                  <li><kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '4px' }}>Backspace</kbd> : ページ削除</li>
                  <li><kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '4px' }}>Ctrl</kbd> + <kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '4px' }}>Z</kbd> : 戻す (Undo)</li>
                  <li><kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '4px' }}>Space</kbd> + ドラッグ : 画面平行移動</li>
                  <li><kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '4px' }}>矢印キー</kbd> : 枠の1mm微調整</li>
                  <li><kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '4px' }}>Shift</kbd> + 矢印 : 枠の大きく微調整</li>
                </ul>
              </div>
              <div>
                <h4 style={{ fontSize: '16px', marginBottom: '12px', color: 'var(--color-accent)' }}>スマホ操作 (MobileWorkstation)</h4>
                <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <li><strong>左右スワイプ:</strong> ページ送り</li>
                  <li><strong>2本指ピンチ:</strong> 拡大・縮小</li>
                  <li><strong>枠の中身ドラッグ:</strong> クロップ枠の平行移動</li>
                  <li><strong>親指アクションバー:</strong> 画面下部から片手で操作可能</li>
                  <li><strong>設定シート:</strong> 画面下部から引き上げて使用</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
