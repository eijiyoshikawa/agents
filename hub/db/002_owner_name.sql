-- 2026-10-26 オーナー依頼: 代表の氏名の表記を「吉川 英治」に統一する（「吉川 英二」は誤記）。
-- メンバー管理（hub_member）に誤った表記で登録されていた行だけを直す。他の列・他のメンバーは変えない。
UPDATE hub_member
SET name = '吉川 英治', updated_at = now(), updated_by = 'migration:002_owner_name'
WHERE regexp_replace(name, '\s', '', 'g') = '吉川英二';
