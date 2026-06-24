-- サンプルデータ（data/*.ts と同内容）。Supabase へ初期投入する際に使用。
-- 既存データを置き換える: psql ... -f seed.sql

-- services -------------------------------------------------------------
insert into public.services (id, name, description, unit_price, active) values
  ('svc-sns', 'SNSマーケティング運用', 'Instagram / TikTok / YouTube の運用代行', 1000000, true),
  ('svc-bpo', '不動産BPO', '不動産業界特化型のBPOパッケージ', 500000, true),
  ('svc-web', 'LP・Web制作', 'Next.js による高速LP・コーポレートサイト制作', 800000, true)
on conflict (id) do update set
  name = excluded.name, description = excluded.description,
  unit_price = excluded.unit_price, active = excluded.active;

-- service_rewards ------------------------------------------------------
delete from public.service_rewards where service_id in ('svc-sns', 'svc-bpo', 'svc-web');
insert into public.service_rewards (service_id, tier, type, rate, fixed_amount) values
  ('svc-sns', 1, 'percentage', 0.10, null),
  ('svc-sns', 2, 'percentage', 0.03, null),
  ('svc-bpo', 1, 'percentage', 0.10, null),
  ('svc-bpo', 2, 'percentage', 0.04, null),
  ('svc-web', 1, 'fixed', null, 80000),
  ('svc-web', 2, 'fixed', null, 30000);

-- partners（親より先に挿入する順序）---------------------------------
insert into public.partners (id, name, slug, parent_id, referral_code, contact_person, contact_email, joined_at, status) values
  ('p-acme',    '株式会社アクメ',           'acme',    null,       'ACME-2026', '山田太郎', 'yamada@acme.example', '2026-01-10', 'active'),
  ('p-blue',    'ブルースカイ合同会社',     'bluesky', 'p-acme',   'BLUE-7781', '佐藤花子', null,                  '2026-02-01', 'active'),
  ('p-cosmos',  'コスモス商事',             'cosmos',  'p-acme',   'COSM-3120', null,       null,                  '2026-02-15', 'active'),
  ('p-delta',   'デルタ・パートナーズ',     'delta',   'p-blue',   'DLTA-5567', null,       null,                  '2026-03-05', 'active'),
  ('p-echo',    'エコー企画',               'echo',    'p-blue',   'ECHO-9043', null,       null,                  '2026-03-20', 'active'),
  ('p-foxtrot', 'フォックストロット社',     'foxtrot', 'p-cosmos', 'FOXT-1198', null,       null,                  '2026-04-12', 'active'),
  ('p-zen',     '禅コンサルティング',       'zen',     null,       'ZEN-0001',  null,       null,                  '2026-01-25', 'dormant')
on conflict (id) do nothing;

-- deals ----------------------------------------------------------------
insert into public.deals (id, service_id, client_name, introducer_partner_id, amount, status, closed_at, is_self_deal, note) values
  ('d-001', 'svc-sns', '美容サロンチェーンX',           'p-delta',   1000000, 'paid',      '2026-05-02', false, null),
  ('d-002', 'svc-web', '工務店Y',                       'p-echo',    800000,  'confirmed', '2026-05-18', false, null),
  ('d-003', 'svc-bpo', '不動産会社Z',                   'p-foxtrot', 500000,  'confirmed', '2026-06-01', false, null),
  ('d-004', 'svc-sns', '美容クリニックW',               'p-blue',    450000,  'pending',   '2026-06-15', false, '見込み案件'),
  ('d-005', 'svc-sns', 'デルタ・パートナーズ（自社利用）', 'p-delta', 1000000, 'paid',      '2026-04-20', true,  '自己成約（tier1なし）')
on conflict (id) do nothing;
