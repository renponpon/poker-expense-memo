-- Supabase生存確認用のテーブル作成
CREATE TABLE IF NOT EXISTS heartbeat (
  id SERIAL PRIMARY KEY,
  last_ping TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active'
);

-- 初期データの挿入（既存データがない場合のみ）
INSERT INTO heartbeat (id, status)
SELECT 1, 'active'
WHERE NOT EXISTS (SELECT 1 FROM heartbeat WHERE id = 1);
