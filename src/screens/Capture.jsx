import { useState, useRef } from 'react';

function downscale(dataUrl, maxDim = 1024, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      try { resolve(c.toDataURL('image/jpeg', quality)); } catch { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export default function Capture({ onCapture }) {
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

  function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => setPreview(await downscale(reader.result));
    reader.readAsDataURL(f);
  }

  return (
    <div className="body">
      <b style={{ fontSize: 17 }}>Scan an item</b>
      <div className="small muted" style={{ marginBottom: 12 }}>Take or upload a photo — we'll tell you which bin.</div>

      {preview ? (
        <img className="preview" src={preview} alt="item" onClick={() => fileRef.current?.click()} />
      ) : (
        <div className="drop" onClick={() => fileRef.current?.click()}>
          <div className="ic">📷</div>
          <div style={{ fontWeight: 600, marginTop: 6 }}>Take or upload a photo</div>
          <div className="tiny muted">A single item or food + its packaging</div>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onFile} />

      {preview && (
        <button className="btn sec" style={{ marginTop: 10 }} onClick={() => fileRef.current?.click()}>↺ Retake / choose another</button>
      )}
      <button className="btn" style={{ marginTop: 10 }} disabled={!preview} onClick={() => onCapture(preview)}>Sort it →</button>
    </div>
  );
}
