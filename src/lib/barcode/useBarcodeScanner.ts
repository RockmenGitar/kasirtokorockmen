import { useEffect, useRef } from 'react';

/**
 * useBarcodeScanner
 * Pemindai barcode keyboard-wedge (alat scanner USB/Bluetooth yang "mengetik"
 * kode cepat lalu menekan Enter). Juga menangkap masukan manual cepat.
 *
 * Strategi:
 *  - Kumpulkan karakter berturut-turut dengan jeda antar-tombol < threshold.
 *  - Saat Enter ditekan dan panjang kode cukup → panggil onScan.
 *  - Abaikan saat fokus berada di input/textarea (kecuali input scan khusus).
 *  - Anti-double: kode sama dalam window tertentu diabaikan.
 */
interface Options {
  onScan: (code: string) => void;
  enabled?: boolean;
  /** Jeda maksimal antar karakter (ms) agar dianggap satu scan. Default 100. */
  maxGapMs?: number;
  /** Minimal panjang kode untuk dianggap barcode. Default 4. */
  minLength?: number;
  /** Waktu (ms) untuk mengabaikan kode identik berulang. Default 1200. */
  dedupeMs?: number;
}

export function useBarcodeScanner({
  onScan,
  enabled = true,
  maxGapMs = 100,
  minLength = 4,
  dedupeMs = 1200,
}: Options) {
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    const isTypingTarget = (el: EventTarget | null): boolean => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName?.toLowerCase();
      return tag === 'input' || tag === 'textarea' || node.isContentEditable;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Jika user sedang mengetik di input/textarea biasa, biarkan normal
      // (kolom pencarian menangani Enter scan sendiri).
      if (isTypingTarget(e.target)) return;

      const now = Date.now();

      // Reset buffer bila jeda terlalu lama (bukan bagian dari satu scan)
      if (now - lastKeyTimeRef.current > maxGapMs) bufferRef.current = '';
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim();
        bufferRef.current = '';
        if (code.length < minLength) return;

        // Anti-double: kode sama berulang cepat diabaikan
        if (lastScanRef.current.code === code && now - lastScanRef.current.at < dedupeMs) {
          e.preventDefault();
          return;
        }
        lastScanRef.current = { code, at: now };

        onScanRef.current(code);
        return;
      }

      // Hanya karakter tunggal (bukan Shift, Ctrl, dsb.)
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled, maxGapMs, minLength, dedupeMs]);
}
