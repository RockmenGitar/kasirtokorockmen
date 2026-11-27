import { useEffect, useRef, useState } from 'react';
import { X, Camera, Zap } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Dipanggil setiap kode terbaca. Kembalikan false untuk menandai gagal (bunyi error). */
  onDetected: (code: string) => void;
}

const REGION_ID = 'kasirtoko-scanner-region';

export default function BarcodeScannerModal({ isOpen, onClose, onDetected }: BarcodeScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const [error, setError] = useState<string | null>(null);
  const [continuous, setContinuous] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const start = async () => {
      try {
        const scanner = new Html5Qrcode(REGION_ID, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 12, qrbox: { width: 260, height: 180 } },
          (decodedText) => {
            const now = Date.now();
            // Anti-double: kode sama <1.2s diabaikan (untuk mode kontinu)
            if (lastRef.current.code === decodedText && now - lastRef.current.at < 1200) return;
            lastRef.current = { code: decodedText, at: now };
            onDetectedRef.current(decodedText);
            if (!continuous) {
              // mode sekali-scan: tutup setelah terbaca
              onClose();
            }
          },
          () => { /* frama tanpa hasil: abaikan */ }
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Tidak bisa mengakses kamera. Pastikan izin kamera diizinkan dan situs memakai HTTPS.');
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        s.stop().then(() => s.clear()).catch(() => {});
      }
    };
  }, [isOpen, continuous, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
            <Camera className="h-4 w-4 text-indigo-600" /> Scan Barcode
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div id={REGION_ID} className="w-full rounded-2xl overflow-hidden bg-slate-900 min-h-[260px]" />

        {error && (
          <p className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5 mt-3">{error}</p>
        )}

        <div className="flex items-center justify-between mt-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={continuous} onChange={(e) => setContinuous(e.target.checked)} className="h-4 w-4 rounded accent-indigo-600" />
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" /> Mode kontinu (scan berulang)
            </span>
          </label>
        </div>
        <p className="text-[10px] text-slate-400 font-medium mt-2">
          Arahkan kamera ke barcode. Untuk kecepatan maksimal, gunakan alat scanner USB/Bluetooth.
        </p>
      </div>
    </div>
  );
}
