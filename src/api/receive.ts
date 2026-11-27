import { supabase } from './client';
import { stockMovementService } from './inventory';
import { bustCache } from './cache';
import { readCollection, writeCollection, nowISO } from './localStore';
import type { Product } from './types';

export interface ReceiptLine {
  product_id: string;
  product_name: string;
  variant_id?: string;
  variant_name?: string;
  quantity: number;   // bilangan bulat positif
}

export interface ReceivedReceipt {
  batch_id: string;
  created_at: string;
  store_id: number;
  user_id?: string;
  user_name?: string;
  note?: string;
  lines: ReceiptLine[];
}

const COLLECTION = 'stock_receipts';

/**
 * Sistem penerimaan stok massal (Stok Masuk).
 * - Menyimpan daftar baris sekaligus.
 * - Idempotent: `batchId` unik mencegah penerapan ganda (klik dua kali / retry timeout).
 * - Menggunakan kembali `stockMovementService.recordMovement` agar stok & riwayat satu sumber.
 */
export const receiveService = {
  async hasBatch(batchId: string, storeId: number): Promise<boolean> {
    // Guard lokal
    const receipts = readCollection<ReceivedReceipt>(COLLECTION);
    if (receipts.some(r => r.batch_id === batchId && r.store_id === storeId)) return true;

    // Guard Supabase: cek movement dengan reference = batch_id (anti dobel lintas perangkat/retry)
    if (supabase) {
      try {
        const { data } = await supabase
          .from('stock_movements')
          .select('id')
          .eq('store_id', storeId)
          .eq('reference', batchId)
          .limit(1);
        if (data && data.length > 0) return true;
      } catch { /* abaikan, lanjut */ }
    }
    return false;
  },

  /**
   * Simpan penerimaan. `products` adalah snapshot daftar produk untuk resolusi stok terkini.
   */
  async receive(input: {
    batch_id: string;
    store_id: number;
    lines: ReceiptLine[];
    products: Product[];
    user_id?: string;
    user_name?: string;
    note?: string;
    threshold?: number;
  }): Promise<ReceivedReceipt> {
    const { batch_id, store_id, lines } = input;

    if (lines.length === 0) throw new Error('Tidak ada barang untuk disimpan.');
    // Validasi: jumlah bilangan bulat positif
    for (const l of lines) {
      if (!Number.isInteger(l.quantity) || l.quantity <= 0) {
        throw new Error(`Jumlah untuk "${l.product_name}" harus bilangan bulat positif.`);
      }
    }

    // Idempotency guard
    if (await this.hasBatch(batch_id, store_id)) {
      throw new Error('Penerimaan ini sudah tersimpan sebelumnya.');
    }

    const receipt: ReceivedReceipt = {
      batch_id,
      created_at: nowISO(),
      store_id,
      user_id: input.user_id,
      user_name: input.user_name,
      note: input.note,
      lines,
    };

    // Terapkan tiap baris lewat recordMovement (stok + riwayat).
    // Bila ada kegagalan di tengah, kita lempar error — stok yang sudah berubah
    // tetap tercatat sebagai movement, dan batch TIDAK disimpan agar bisa diulang
    // (recordMovement idempotent per movement id, bukan per batch; untuk keamanan
    // ganda, batch guard di atas mencegah pengulangan setelah sukses).
    for (const line of lines) {
      const product = input.products.find(p => p.id === line.product_id);
      if (!product) throw new Error(`Produk "${line.product_name}" tidak ditemukan di outlet ini.`);
      await stockMovementService.recordMovement({
        product,
        type: 'in',
        quantity: line.quantity,
        reason: input.note || 'Stok Masuk',
        reference: batch_id,
        user_name: input.user_name,
        threshold: input.threshold,
        variant: line.variant_id ? { id: line.variant_id, name: line.variant_name || '' } : undefined,
      });
    }

    // Simpan batch sebagai guard idempotency.
    const receipts = readCollection<ReceivedReceipt>(COLLECTION);
    receipts.push(receipt);
    writeCollection(COLLECTION, receipts);
    bustCache(`receipts_${store_id}`);

    return receipt;
  },

  async listReceipts(storeId: number): Promise<ReceivedReceipt[]> {
    return readCollection<ReceivedReceipt>(COLLECTION)
      .filter(r => r.store_id === storeId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
};
