import { useState } from 'react';
import { Calendar, DollarSign, MapPin, FileEdit, Check, ChevronLeft, Camera, X } from 'lucide-react';
import type { ReceiptData } from './ReceiptForm';

interface VoucherFormProps {
    onSave: (data: ReceiptData, imageFile?: File | null) => void;
    onCancel: () => void;
}

const CATEGORIES = [
    { label: '旅費交通費 (タクシー等)', value: '旅費交通費' },
    { label: '接待交際費 (食事・情報交換)', value: '交際費' },
    { label: '支払手数料 (チップ等)', value: '支払手数料' },
    { label: '雑費 (洗濯代等)', value: '雑費' },
    { label: 'その他', value: 'その他' }
];

const CURRENCIES = [
    { label: 'HKD (香港ドル)', value: 'HKD' },
    { label: 'MOP (マカオパタカ)', value: 'MOP' },
    { label: 'USD (米ドル)', value: 'USD' },
    { label: 'JPY (日本円)', value: 'JPY' }
];

export function VoucherForm({ onSave, onCancel }: VoucherFormProps) {
    const [formData, setFormData] = useState<Partial<ReceiptData>>({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        currency: 'HKD',
        debitAccount: '旅費交通費',
        creditAccount: '事業主借',
        description: '',
        memo: '',
        isVoucher: true
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.date || !formData.amount) {
            alert('日付と金額を入力してください。');
            return;
        }
        onSave(formData as ReceiptData, imageFile);
    };

    return (
        <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-800/80 backdrop-blur-md rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden">
                <div className="bg-slate-800/50 border-b border-slate-700/50 p-6 text-center relative">
                    <button
                        onClick={onCancel}
                        className="absolute left-6 top-6 text-slate-400 hover:text-white transition-colors p-1"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-bold text-slate-100">出金伝票の作成</h2>
                    <p className="text-sm text-slate-400 mt-1">領収書がない支出を記録します</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-4">
                        {/* Date */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                取引日
                            </label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                                required
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                                <FileEdit className="w-4 h-4 text-slate-400" />
                                勘定科目
                            </label>
                            <select
                                value={formData.debitAccount}
                                onChange={e => setFormData({ ...formData, debitAccount: e.target.value })}
                                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all appearance-none"
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Amount and Currency */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                                    <DollarSign className="w-4 h-4 text-slate-400" />
                                    金額
                                </label>
                                <input
                                    type="number"
                                    value={formData.amount || ''}
                                    onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-slate-100 font-bold focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                                    placeholder="0"
                                    required
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                                    通貨
                                </label>
                                <select
                                    value={formData.currency}
                                    onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all appearance-none"
                                >
                                    {CURRENCIES.map(curr => (
                                        <option key={curr.value} value={curr.value}>{curr.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Vendor / Route */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                                <MapPin className="w-4 h-4 text-slate-400" />
                                支払先 / 区間
                            </label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="例: WynnからMGM (タクシー)"
                                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                            />
                        </div>

                        {/* Memo */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                                <FileEdit className="w-4 h-4 text-slate-400" />
                                摘要 (詳細メモ)
                            </label>
                            <textarea
                                value={formData.memo}
                                onChange={e => setFormData({ ...formData, memo: e.target.value })}
                                placeholder="誰と、何の戦略会議かなど"
                                rows={2}
                                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all resize-none"
                            />
                        </div>

                        {/* Image Attachment */}
                        <div className="pt-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                                <Camera className="w-4 h-4 text-slate-400" />
                                証拠写真 (任意)
                            </label>

                            {!previewUrl ? (
                                <button
                                    type="button"
                                    onClick={() => document.getElementById('voucher-image')?.click()}
                                    className="w-full aspect-video bg-slate-900/30 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-all group"
                                >
                                    <Camera className="w-8 h-8 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs">メーター等の写真を撮る / 選択</span>
                                    <input
                                        id="voucher-image"
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handleImageChange}
                                        className="hidden"
                                    />
                                </button>
                            ) : (
                                <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-900">
                                    <img src={previewUrl} alt="Preview" className="w-full aspect-video object-contain" />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="absolute top-2 right-2 bg-slate-800/80 backdrop-blur-md p-1.5 rounded-full text-white hover:bg-red-500 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-semibold rounded-xl px-4 py-4 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                    >
                        <Check className="w-5 h-5" />
                        出金伝票を保存する
                    </button>
                </form>
            </div>
        </div>
    );
}
