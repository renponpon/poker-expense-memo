import { useState, useEffect } from 'react';
import { CameraCapture } from './components/CameraCapture';
import { ReceiptForm, type ReceiptData } from './components/ReceiptForm';
import { VoucherForm } from './components/VoucherForm';
import { ReceiptHistory } from './components/ReceiptHistory';
import { Settings } from './components/Settings';
import { History, Settings as SettingsIcon, Camera, FilePlus } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { getSupabaseClient } from './lib/supabase';

type AppState = 'capture' | 'analyzing' | 'form' | 'voucher' | 'success' | 'history';

function App() {
  const [appState, setAppState] = useState<AppState>('capture');
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [parsedData, setParsedData] = useState<ReceiptData | undefined>(undefined);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [exchangeRatesStr, setExchangeRatesStr] = useState<string>('');
  const [processingBatch, setProcessingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  // Supabaseから履歴を取得
  const fetchReceipts = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && !error) {
      setReceipts(data.map((r: any) => ({
        id: r.id,
        date: r.date,
        amount: r.amount,
        description: r.description,
        debitAccount: r.debit_account,
        creditAccount: r.credit_account,
        imagePath: r.image_path,
        currency: r.currency,
        isVoucher: r.is_voucher,
        memo: r.memo
      })));
    }
  };

  // 初期ロード時にAPIキーとDB同期
  useEffect(() => {
    const savedApiKey = localStorage.getItem('gemini_api_key');
    if (savedApiKey) setApiKey(savedApiKey);

    // Supabaseへの接続ができるか一度取得を試みる
    fetchReceipts();

    // 最新の為替レートを取得
    const fetchRates = async () => {
      try {
        const res = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
        const data = await res.json();
        const base = data.usd;
        if (base && base.jpy) {
          const jpy = base.jpy;
          const hkd = base.jpy / base.hkd;
          const eur = base.jpy / base.eur;
          const krw = base.jpy / base.krw;
          const php = base.jpy / base.php;
          const mop = base.jpy / base.mop;

          const ratesText = `本日の為替レート(参考): 1 USD = ${jpy.toFixed(2)} JPY, 1 HKD = ${hkd.toFixed(2)} JPY, 1 EUR = ${eur.toFixed(2)} JPY, 1 KRW = ${krw.toFixed(2)} JPY, 1 PHP = ${php.toFixed(2)} JPY, 1 MOP = ${mop.toFixed(2)} JPY`;
          setExchangeRatesStr(ratesText);
        }
      } catch (e) {
        console.error("Failed to fetch exchange rates", e);
      }
    };
    fetchRates();
  }, []);

  const handleCapture = async (files: File[], isBatch: boolean) => {
    const supabase = getSupabaseClient();
    if (!apiKey || !supabase) {
      setShowSettings(true);
      alert("設定（Gemini APIキーまたはSupabase情報）が完了していません。入力を完了させてください。");
      return;
    }

    const prompt = `
あなたはプロのポーカープレイヤー（個人事業主・青色申告）向けの経理アシスタントAIです。
添付されたレシート画像を解析し、以下の情報を抽出してJSON形式で返答してください。回答はマークダウンのコードブロックなどを除いた純粋なJSON文字列のみにしてください。

【抽出項目と推論ルール】
1. date: 取引日（YYYY-MM-DD形式）
2. amount: 金額（税込）、数値のみ。ここには必ず**日本円（JPY）換算後**の数字を入れてください。
   - レシートが外貨の場合は、以下の為替レートを参考にして日本円に換算した数値を算出してください。
   - ${exchangeRatesStr || '一般的な直近の為替レートを推測して使用してください'}
   - 海外などのレシートで、手書きのチップ（Tip / Gratuity）や税金（Tax）が加算されている場合は、必ず**全てを含めた合計金額（Total）**を基準としてください。
3. description: 支払先や摘要（例：交通機関名、店名など）。
   - 外貨レシートの場合は、「◯◯（元金額 例: 500 HKD）」のように日本円換算前の情報もメモとして併記してください。
4. debitAccount: 借方（経費）の勘定科目。以下のいずれかから最も適切なものを推論してください。
   - 旅費交通費（航空券、ホテル、タクシー、Uber、電車など）
   - 交際費（飲食代、レストラン、カフェ、会議費など）※「スターバックス」や「カフェ」での支払いは雑費ではなく「交際費」に分類してください。
   - 支払手数料 または 売上原価（ポーカー大会の参加費・バイインなど）
   - 地代家賃（家賃など）
   - 通信費（スマホ代、ネット代など）
   - 消耗品費（PC、周辺機器、文房具など）
   - 雑費
5. creditAccount: 貸方（支払元）は常に「事業主借」にしてください。

【JSONフォーマット例】
{
  "date": "2024-03-15",
  "amount": 5500,
  "description": "Starbucks (35 USD)",
  "debitAccount": "交際費",
  "creditAccount": "事業主借"
}`;

    if (!isBatch) {
      setCapturedFile(files[0]);
      setAppState('analyzing');

      try {
        const reader = new FileReader();
        reader.readAsDataURL(files[0]);
        reader.onload = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          const ai = new GoogleGenAI({ apiKey: apiKey });

          try {
            const response = await ai.models.generateContent({
              model: 'gemini-3.1-flash-lite-preview',
              contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { data: base64Data, mimeType: files[0].type } }] }]
            });

            const text = response.text || "{}";
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(jsonStr);

            setParsedData({
              date: parsed.date || new Date().toISOString().split('T')[0],
              amount: Number(parsed.amount) || 0,
              description: parsed.description || '',
              debitAccount: parsed.debitAccount || '雑費',
              creditAccount: parsed.creditAccount || '事業主借'
            });

            setAppState('form');
          } catch (apiError) {
            console.error("Gemini API Error:", apiError);
            alert("自動解析に失敗しました。手動で入力してください。（APIキーや利用制限をご確認ください）");
            setParsedData(undefined);
            setAppState('form');
          }
        };
      } catch (error) {
        console.error("File processing error:", error);
        setParsedData(undefined);
        setAppState('form');
      }
    } else {
      // バッチ処理（連続撮影）
      setProcessingBatch(true);
      setBatchProgress({ current: 0, total: files.length });

      const newReceipts: ReceiptData[] = [];
      const ai = new GoogleGenAI({ apiKey: apiKey });

      for (let i = 0; i < files.length; i++) {
        setBatchProgress({ current: i + 1, total: files.length });
        const file = files[i];

        try {
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
          });

          const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-preview',
            contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { data: base64Data, mimeType: file.type } }] }]
          });

          const text = response.text || "{}";
          const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(jsonStr);

          let imagePath = '';
          const fileExt = file.name.split('.').pop() || 'jpg';
          const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
          const filePath = `receipts/${fileName}`;

          const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, file);
          if (!uploadError) imagePath = filePath;

          const { data: inserted, error } = await supabase.from('receipts').insert([{
            date: parsed.date || new Date().toISOString().split('T')[0],
            amount: Number(parsed.amount) || 0,
            description: parsed.description || '',
            debit_account: parsed.debitAccount || '雑費',
            credit_account: parsed.creditAccount || '事業主借',
            image_path: imagePath
          }]).select();

          if (error) {
            console.error("Batch insert error:", error);
          }

          if (inserted && inserted.length > 0) {
            newReceipts.push({
              id: inserted[0].id,
              date: inserted[0].date,
              amount: inserted[0].amount,
              description: inserted[0].description,
              debitAccount: inserted[0].debit_account,
              creditAccount: inserted[0].credit_account,
              imagePath: inserted[0].image_path || imagePath
            });
          }
        } catch (e) {
          console.error(`Batch processing error for file ${i + 1}:`, e);
        }
      }

      if (newReceipts.length > 0) {
        setReceipts(prev => [...newReceipts, ...prev]);
        setAppState('history');
        alert(`${newReceipts.length}件のレシートを一括処理し、保存しました。`);
      } else {
        setAppState('capture');
        alert("一括処理中にエラーが発生し、保存できませんでした。");
      }
      setProcessingBatch(false);
    }
  };

  const handleSave = async (data: ReceiptData, secondaryFile?: File | null) => {
    const supabase = getSupabaseClient();
    let savedData = { ...data };
    const fileToUpload = secondaryFile || capturedFile;

    if (supabase) {
      try {
        let imagePath = data.imagePath || ''; // 既存の画像パスを引き継ぐ
        if (fileToUpload) {
          const fileExt = fileToUpload.name.split('.').pop();
          const fileName = `${Date.now()}.${fileExt}`;
          const filePath = `receipts/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(filePath, fileToUpload);

          if (!uploadError) {
            imagePath = filePath;
          } else {
            console.error("Image upload error:", uploadError);
            alert(`画像のアップロードに失敗しました。\n(Supabase Storageの設定、Public化、またはRLSポリシーを確認してください)\nエラー: ${uploadError.message}`);
          }
        }

        if (data.id) {
          // 既存データの更新（UPDATE）
          const { data: updated, error } = await supabase.from('receipts').update({
            date: data.date,
            amount: data.amount,
            description: data.description,
            debit_account: data.debitAccount,
            credit_account: data.creditAccount,
            image_path: imagePath
          }).eq('id', data.id).select();

          if (error) {
            console.error("Supabase update error details:", error);
            alert(`データの更新に失敗しました。\nエラー: ${error.message}`);
          }

          if (updated && updated.length > 0) {
            savedData.id = updated[0].id;
            savedData.imagePath = updated[0].image_path || imagePath;
          }
        } else {
          // 新規作成（INSERT）
          const { data: inserted, error } = await supabase.from('receipts').insert([{
            date: data.date,
            amount: data.amount,
            description: data.description,
            debit_account: data.debitAccount,
            credit_account: data.creditAccount,
            image_path: imagePath,
            currency: data.currency || 'JPY',
            is_voucher: data.isVoucher || false,
            memo: data.memo || ''
          }]).select();

          if (error) {
            console.error("Supabase insert error details:", error);
            alert(`データの保存に失敗しました。\n(Supabaseにimage_pathカラムが追加されていることなどを確認してください)\nエラー: ${error.message}`);
          }

          if (inserted && inserted.length > 0) {
            savedData.id = inserted[0].id;
            savedData.imagePath = inserted[0].image_path || imagePath;
          }
        }
      } catch (e) {
        console.error("Supabase exception:", e);
      }
    }

    // APIを通らない場合でも、今アップロードしたばかりのパスがあればセット
    if (!savedData.imagePath && data.imagePath) {
      savedData.imagePath = data.imagePath;
    }

    if (data.id) {
      setReceipts(prev => prev.map(r => r.id === data.id ? savedData : r));
    } else {
      setReceipts(prev => [savedData, ...prev]);
    }
    setCapturedFile(null);
    setAppState('success');

    // 数秒後に初期画面に戻す
    setTimeout(() => {
      setAppState('capture');
    }, 2000);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('この履歴データを削除してよろしいですか？')) return;

    const receiptToDelete = receipts.find(r => r.id === id);
    const supabase = getSupabaseClient();

    if (supabase) {
      // 画像があればStorageからも削除
      if (receiptToDelete?.imagePath) {
        await supabase.storage.from('receipts').remove([receiptToDelete.imagePath]);
      }

      const { error } = await supabase.from('receipts').delete().eq('id', id);
      if (error) {
        console.error("Supabase delete error:", error);
        alert('削除に失敗しました。');
        return;
      }
    }
    setReceipts(prev => prev.filter(r => r.id !== id));
  };

  const handleExportCSV = (receiptsToExport: ReceiptData[]) => {
    // マネーフォワード用CSVフォーマット定義
    const headers = ['取引日', '借方勘定科目', '借方金額', '借方税区分', '貸方勘定科目', '貸方金額', '貸方税区分', '摘要'];

    const rows = receiptsToExport.map(r => [
      r.date.replace(/-/g, '/'), // yyyy/mm/dd
      r.debitAccount,
      r.amount.toString(),
      '対象外', // 簡易的に対象外とするか、プロンプトで判定する設定
      r.creditAccount,
      r.amount.toString(),
      '対象外',
      r.description || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')) // エスケープ処理
    ].join('\n');

    // Blobを作成してダウンロード
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8' }); // BOM付きUTF-8
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mf_import_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 flex flex-col max-w-sm mx-auto relative overflow-hidden pb-24">
      {/* Background ambient accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <header className="mb-6 pt-2 flex items-center justify-between z-10 relative">
        <h1
          className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center gap-2 cursor-pointer"
          onClick={() => setAppState('capture')}
        >
          <span className="bg-gradient-to-br from-emerald-500 to-cyan-500 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-lg shadow-emerald-500/20">PT</span>
          Poker Tax
        </h1>
      </header>

      <main className="flex-1 flex flex-col justify-center z-10">
        {showSettings && (
          <Settings
            onClose={() => setShowSettings(false)}
            onSave={(key, _url, _dbKey) => {
              setApiKey(key);
              fetchReceipts(); // 保存後に再取得を試みる
            }}
          />
        )}
        {appState === 'capture' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CameraCapture onCapture={handleCapture} />
            <div className="mt-8 px-4">
              <button
                onClick={() => setAppState('voucher')}
                className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl py-4 transition-all group active:scale-95"
              >
                <div className="bg-emerald-500/10 p-2 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
                  <FilePlus className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-100">出金伝票を作成</p>
                  <p className="text-xs text-slate-400">領収書がない支出（マカオ等）</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {processingBatch && (
          <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative mb-6">
              <div className="w-24 h-24 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-cyan-500/20 border-b-cyan-500 rounded-full animate-spin-reverse"></div>
              </div>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
              連続一括処理中...
            </h2>
            <p className="text-emerald-400 font-medium tracking-wide mb-8">
              {batchProgress.current} / {batchProgress.total} 枚目を解析しています
            </p>
            <div className="w-full max-w-xs bg-slate-800 rounded-full h-2 mb-4">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${(Math.max(1, batchProgress.current) / batchProgress.total) * 100}%` }}
              ></div>
            </div>
            <p className="text-slate-500 text-sm">アプリを閉じないでお待ちください</p>
          </div>
        )}

        {appState === 'analyzing' && !processingBatch && (
          <div className="flex flex-col items-center justify-center space-y-6 h-[60vh] animate-in fade-in zoom-in-95 duration-500">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-cyan-500/20 border-b-cyan-500 rounded-full animate-spin-reverse"></div>
              </div>
            </div>
            <p className="text-emerald-400 font-medium tracking-wide animate-pulse">AIがレシートを解析中...</p>
          </div>
        )}

        {appState === 'form' && (
          <ReceiptForm
            initialData={parsedData}
            imageFile={capturedFile}
            onSave={(data) => handleSave(data)}
            onRetake={() => setAppState('capture')}
          />
        )}

        {appState === 'voucher' && (
          <VoucherForm
            onSave={(data, file) => handleSave(data, file)}
            onCancel={() => setAppState('capture')}
          />
        )}

        {appState === 'success' && (
          <div className="flex flex-col items-center justify-center space-y-6 h-[60vh] animate-in zoom-in-50 fade-in duration-500">
            <div className="w-24 h-24 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center text-white shadow-2xl shadow-emerald-500/40 relative">
              <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping"></div>
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-bold text-white tracking-tight">保存完了！</p>
              <p className="text-slate-400 text-sm">データが記録されました</p>
            </div>
          </div>
        )}
        {appState === 'history' && (
          <ReceiptHistory
            receipts={receipts}
            onBack={() => setAppState('capture')}
            onExport={handleExportCSV}
            onDelete={handleDelete}
            onEdit={(receipt) => {
              setParsedData(receipt);
              setAppState('form');
            }}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 max-w-sm mx-auto bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 p-4 flex justify-around items-center z-50">
        <button
          onClick={() => {
            setShowSettings(false);
            setAppState('capture');
          }}
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${appState === 'capture' && !showSettings ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Camera className="w-6 h-6" />
          <span className="text-[10px] font-medium">撮影</span>
        </button>
        <button
          onClick={() => {
            setShowSettings(false);
            setAppState('history');
          }}
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${appState === 'history' && !showSettings ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <History className="w-6 h-6" />
          <span className="text-[10px] font-medium">履歴</span>
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${showSettings ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <SettingsIcon className="w-6 h-6" />
          <span className="text-[10px] font-medium">設定</span>
        </button>
      </div>
    </div>
  );
}

export default App;
