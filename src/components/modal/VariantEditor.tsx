import { Plus, Trash2 } from 'lucide-react';
import type { ProductVariant } from '../../lib/db';

interface VariantEditorProps {
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
}

export default function VariantEditor({ variants, onChange }: VariantEditorProps) {
  const add = () => onChange([
    ...variants,
    { id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, name: '', price: 0, stock_quantity: 0 },
  ]);

  const update = (id: string, patch: Partial<ProductVariant>) =>
    onChange(variants.map(v => v.id === id ? { ...v, ...patch } : v));

  const remove = (id: string) => onChange(variants.filter(v => v.id !== id));

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Varian (ukuran, warna, kemasan)</span>
        <button type="button" onClick={add} className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer">
          <Plus className="h-3 w-3" /> Tambah Varian
        </button>
      </div>

      {variants.length === 0 ? (
        <p className="text-[10px] text-slate-300 font-medium py-1">Belum ada varian. Produk tunggal tanpa varian.</p>
      ) : (
        <div className="space-y-2">
          {variants.map(v => (
            <div key={v.id} className="grid grid-cols-12 gap-1.5 items-center">
              <input
                value={v.name}
                onChange={e => update(v.id, { name: e.target.value })}
                placeholder="Nama (mis. L)"
                className="col-span-4 bg-white border border-slate-150 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
              />
              <input
                value={v.sku || ''}
                onChange={e => update(v.id, { sku: e.target.value })}
                placeholder="SKU"
                className="col-span-3 bg-white border border-slate-150 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="number"
                value={v.price || ''}
                onChange={e => update(v.id, { price: Number(e.target.value) || 0 })}
                placeholder="Harga"
                className="col-span-3 bg-white border border-slate-150 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="number"
                value={v.stock_quantity || ''}
                onChange={e => update(v.id, { stock_quantity: Number(e.target.value) || 0 })}
                placeholder="Stok"
                className="col-span-1 bg-white border border-slate-150 rounded-lg px-1.5 py-1.5 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
              />
              <button type="button" onClick={() => remove(v.id)} className="col-span-1 h-7 rounded-lg hover:bg-rose-50 hover:text-rose-500 text-slate-300 flex items-center justify-center cursor-pointer">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
