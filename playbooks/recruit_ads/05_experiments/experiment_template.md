# 実験テンプレート（EXP-XXXX）

各実験は `experiments/EXP-{YYYYMMDD}-{NNN}.md` として保存。`experiment_register.csv` に1行追加。

---

```markdown
# EXP-{YYYYMMDD}-{NNN}: {タイトル}

## 1. メタデータ

| 項目 | 値 |
|---|---|
| EXP-ID | EXP-20260601-003 |
| Phase | 1 (探索) / 2 (検証) / 3 (拡張) |
| 起票者 | Marketing / Ad Operations |
| 起票日 | 2026-06-01 |
| 配信開始 | 2026-06-03 |
| 配信終了 | 2026-06-17 |
| ステータス | 計画中 / 配信中 / 完了 / 中止 |
| 業種 | kaigo |
| エリア | saitama-south |
| 媒体 | meta |
| 予算 | 100,000円 |

## 2. 仮説（H-statement）

H-EXP-20260601-003:
[セグメント] に対し、[訴求/CRTV/ターゲ/LP] を [A→B] に変えると、
[KPI] が [期待方向] に [期待幅] 動く。理由は [根拠]。

## 3. 変数（1軸のみ）

| 固定変数 | 値 |
|---|---|
| 業種 | kaigo |
| エリア | saitama-south, radius 15km |
| 媒体 | Meta |
| LP | lp-kaigo-v2-short |
| クリエイティブ形式 | UGC動画 9:16 |

| 実験変数 | A群 | B群 |
|---|---|---|
| 訴求フック | 給与訴求（月給32万） | 夜勤なし訴求 |

## 4. 成功基準

- 主指標: 応募CVR
- 期待差: B群がA群より +30%以上
- サンプル: 各群クリック 500 以上
- 統計: 二項検定 p < 0.1

## 5. キャンペーン構成

```
Campaign: meta_kaigo_saitama-south_cv_202606_003
  ├ Ad Set: radius-15km-kasukabe_salary_m (A群)
  │   └ Ad: ugc_c014_a
  └ Ad Set: radius-15km-kasukabe_nokin-nashi_m (B群)
      └ Ad: ugc_c015_a
```

## 6. クリエイティブ

- A: ugc_c014 - 「月給32万円もらってます」介護福祉士女性30代インタビュー
- B: ugc_c015 - 「夜勤なしで働けます」同じ女性インタビュー、別カット

## 7. LP

- 共通 lp-kaigo-v2-short (URL: /recruit/kaigo)
- メッセージマッチ:
  - A 流入 → FV「月給32万・賞与年4ヶ月」
  - B 流入 → FV「夜勤なし日勤のみOK」

## 8. 計測

- Meta Pixel + CAPI ✓
- GA4 ✓
- CRM 連携 ✓
- Offline Conversion (Hire) 連携 ✓

## 9. 配信ログ

| 日付 | 出来事 |
|---|---|
| 2026-06-03 | 配信開始 |
| 2026-06-05 | A群 CPA 想定通り、B群 やや高め |
| 2026-06-10 | 学習完了、両群サンプル500到達 |
| 2026-06-17 | 配信終了 |

## 10. 結果

| 指標 | A群（給与） | B群（夜勤なし） | 差 |
|---|---|---|---|
| Imp | 50,000 | 50,000 | - |
| Click | 800 | 1,100 | +37% |
| CTR | 1.6% | 2.2% | +0.6pt |
| Session | 720 | 990 | - |
| Form Start | 90 | 180 | +100% |
| Apply | 28 | 65 | +132% |
| CVR (session→apply) | 3.9% | 6.6% | +2.7pt |
| 有効応募 | 22 | 50 | +127% |
| Cost | 50,000 | 50,000 | - |
| 応募CPA | 1,786 | 769 | -57% |
| 有効応募CPA | 2,273 | 1,000 | -56% |

統計検定: 二項検定 CVR差 p = 0.02 → **B群有意に優位**

## 11. 学び（Lesson Learned）

- 介護×埼玉南×30-50代女性ペルソナで「夜勤なし」訴求は給与訴求より圧倒的に強い
- メッセージマッチによる動的FV切替が効いた可能性
- A群のCTR低めも、CVRはB群が圧勝 → 訴求軸の問題、CRTV品質の差ではない

## 12. 次アクション

- [ ] B群（夜勤なし）を Phase 2 検証へ昇格
- [ ] 千葉北、神奈川東で再現テスト（別エリアでの汎化確認）
- [ ] learnings/instincts/recruit_ads.json に新インスティンクト登録（confidence: 0.5）
- [ ] 6-iter勝率で formulas/F-saitama-south-kaigo.md に方程式化検討

## 13. 関連実験

- 前: EXP-20260520-001 (介護×千葉北、夜勤なし vs 給与) → B群勝ち、再現性確認中
- 並行: EXP-20260601-004 (介護×神奈川東、同条件)
```

---

## 使い方

1. 起票時: register.csv に EXP-ID 発行 + 上記テンプレを `experiments/EXP-XXX.md` で作成
2. メタデータ・仮説・成功基準・キャンペーン構成を埋める
3. 配信開始後: 配信ログ更新
4. 終了時: 結果・学び・次アクションを記入
5. 学びは learnings/instincts/recruit_ads.json に反映
