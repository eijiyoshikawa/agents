-- 紹介報酬を最大2段に変更（tier3 廃止）。
-- 報酬計算は MAX_TIERS=2 のためコード側で既に tier3 は無効だが、
-- 設定行をDBからも削除してデータを整える。
delete from public.service_rewards where tier = 3;
delete from public.rate_plan_rewards where tier = 3;

-- 既存成約の reward_snapshot に残る tier3 要素は計算に使われない（無害）ため保持。
