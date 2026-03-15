import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import { Camera, Check, Calendar, JapaneseYen, Store } from 'lucide-react';

export interface ReceiptData {
    id?: string;
    date: string;
    amount: number;
    description: string;
    debitAccount: string;
    creditAccount: string;
    imagePath?: string;
    currency?: string;
    isVoucher?: boolean;
    memo?: string;
}

interface ReceiptFormProps {
    initialData?: ReceiptData;
    imageFile?: File | null;
    onSave: (data: ReceiptData) => void;
    onRetake: () => void;
}

const DEBIT_ACCOUNTS = [
    '旅費交通費',
    '交際費',
    '会議費',
    '支払手数料',
    '売上原価',
    '地代家賃',
    '通信費',
    '消耗品費',
    '雑費'
];

const CREDIT_ACCOUNTS = [
    '事業主借',
    '事業主借（HKD現金）',
    '事業主借（USD現金）',
    '事業主借（MOP現金）',
    'バンクロール',
    'カスタム入力'
];

export function ReceiptForm({ initialData, imageFile, onSave, onRetake }: ReceiptFormProps) {
    const [formData, setFormData] = useState<ReceiptData>(initialData || {
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        description: '',
        debitAccount: '旅費交通費',
        creditAccount: '事業主借'
    });

    const [isCustomCredit, setIsCustomCredit] = useState(false);
    const [customCreditName, setCustomCreditName] = useState('');
    const [previewUrl, setPreviewUrl] = useState<string>('');

    useEffect(() => {
        if (imageFile) {
            const url = URL.createObjectURL(imageFile);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        } else if (initialData?.imagePath) {
            const supabase = getSupabaseClient();
            if (supabase) {
                const { data } = supabase.storage.from('receipts').getPublicUrl(initialData.imagePath);
                setPreviewUrl(data.publicUrl);
            }
        }
    }, [imageFile, initialData?.imagePath]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-800/80 backdrop-blur-md rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden">

                <div className="bg-slate-800/50 border-b border-slate-700/50 p-6 text-center relative">
                    <button
                        onClick={onRetake}
                        className="absolute left-6 top-6 text-slate-400 hover:text-white transition-colors p-1"
                        aria-label="再撮影"
                    >
                        <Camera className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-bold text-slate-100">推論結果の確認</h2>
                    <p className="text-sm text-emerald-400 mt-1 flex items-center justify-center gap-1.5">
                        <Check className="w-4 h-4" /> AIによる自動仕訳完了
                    </p>
                </div>

                {previewUrl && (
                    <div className="bg-slate-900 border-b border-slate-700/50 p-4 flex justify-center">
                        <img
                            src={previewUrl}
                            alt="Receipt Preview"
                            className="max-h-48 object-contain rounded-xl shadow-lg border border-slate-700"
                        />
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                取引日
                            </label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                            />
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                                <JapaneseYen className="w-4 h-4 text-slate-400" />
                                金額 (税込)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-3.5 text-slate-400">¥</span>
                                <input
                                    type="number"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl pl-8 pr-4 py-3 text-slate-100 font-medium text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all tracking-wider"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                                <Store className="w-4 h-4 text-slate-400" />
                                支払先 / 摘要
                            </label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="例: タクシー代、ホテル代など"
                                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-700/50">
                        <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">仕訳情報 (確定申告用)</h3>

                        <div className="grid grid-cols-2 gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-700/30">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1.5">借方 (経費)</label>
                                <select
                                    value={formData.debitAccount}
                                    onChange={e => setFormData({ ...formData, debitAccount: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                >
                                    {DEBIT_ACCOUNTS.map(acc => (
                                        <option key={acc} value={acc}>{acc}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-slate-400 mb-1.5">貸方 (支払元)</label>
                                <select
                                    value={isCustomCredit ? 'カスタム入力' : (CREDIT_ACCOUNTS.includes(formData.creditAccount) ? formData.creditAccount : 'カスタム入力')}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val === 'カスタム入力') {
                                            setIsCustomCredit(true);
                                        } else {
                                            setIsCustomCredit(false);
                                            setFormData({ ...formData, creditAccount: val });
                                        }
                                    }}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                >
                                    {CREDIT_ACCOUNTS.map(acc => (
                                        <option key={acc} value={acc}>{acc}</option>
                                    ))}
                                </select>
                                {isCustomCredit && (
                                    <input
                                        type="text"
                                        value={customCreditName}
                                        onChange={e => {
                                            setCustomCreditName(e.target.value);
                                            setFormData({ ...formData, creditAccount: e.target.value });
                                        }}
                                        placeholder="支払元を入力..."
                                        className="w-full mt-2 bg-slate-900/50 border border-slate-600 rounded-lg px-2 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-semibold rounded-xl px-4 py-4 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
                    >
                        この内容で保存する
                    </button>
                </form>
            </div>
        </div>
    );
}
