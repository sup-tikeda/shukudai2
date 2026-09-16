-- 作業マスタに管理番号を追加する。
-- 既存の行があると NOT NULL 列をいきなり足せないため、
-- 「追加 → 既存行に採番 → NOT NULL 化 → 一意制約」の順に分けている。
ALTER TABLE "work_items" ADD COLUMN "code" varchar(20);--> statement-breakpoint

-- 既存行の採番。通常の項目は100番台、割引の項目は900番台に分け、
-- それぞれ登録順で連番にする（登録が同時なら項目名順）。
WITH numbered AS (
  SELECT
    id,
    to_char(
      CASE WHEN item_type = '割引' THEN 900 ELSE 100 END
        + row_number() OVER (
            PARTITION BY (item_type = '割引') ORDER BY created_at, name
          ),
      'FM000'
    ) AS code
  FROM work_items
)
UPDATE work_items
SET code = numbered.code
FROM numbered
WHERE work_items.id = numbered.id;--> statement-breakpoint

ALTER TABLE "work_items" ALTER COLUMN "code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_code_unique" UNIQUE("code");
