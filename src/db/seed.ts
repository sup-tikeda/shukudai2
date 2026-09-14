import "dotenv/config";
import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  cases,
  customers,
  quoteItems,
  quotes,
  shopSettings,
  staffProfiles,
  user,
  vehicles,
} from "./schema";

// Node で直接実行するスクリプトのため、`~/lib/db` は使わず自前で接続を作る
// （`~/lib/db` は Cloudflare Workers 上での Hyperdrive 接続を前提にしている）。
const db = drizzle(postgres(process.env.DATABASE_URL!));

/**
 * 動作確認用のダミーデータ（顧客・車両・案件・見積/請求・明細）を投入する。
 * すでに顧客が1件以上あれば何もしないため、何度実行しても増えない。
 * 実在の人名・会社名は使わない。
 *
 * 実行: pnpm db:seed
 */
const [{ count }] = await db
  .select({ count: sql<number>`count(*)::int` })
  .from(customers);

if (count > 0) {
  console.log(`既に顧客が ${count} 件あるため、ダミーデータの投入をスキップしました。`);
  process.exit(0);
}

const [customerA, customerB, customerC, customerD] = await db
  .insert(customers)
  .values([
    {
      name: "山田 太郎",
      phone: "03-1111-2222",
      mobilePhone: "090-1111-2222",
      email: "yamada@example.com",
      postalCode: "100-0001",
      address: "東京都千代田区千代田1-1",
      licenseNumber: "第123456789号",
    },
    {
      name: "佐々木 花子",
      phone: "03-2222-3333",
      mobilePhone: "090-2222-3333",
      email: "sasaki@example.com",
      postalCode: "150-0001",
      address: "東京都渋谷区神宮前1-1",
    },
    {
      name: "有限会社サンプル商会",
      contactName: "田中 次郎",
      phone: "03-3333-4444",
      email: "tanaka@example-shokai.com",
      postalCode: "160-0022",
      address: "東京都新宿区新宿1-1",
    },
    {
      name: "鈴木 一郎",
      phone: "03-4444-5555",
      mobilePhone: "090-4444-5555",
      postalCode: "220-0001",
      address: "神奈川県横浜市西区みなとみらい1-1",
    },
  ])
  .returning({ id: customers.id });

const [vehicle1, vehicle2, vehicle3, vehicle4, vehicle5, vehicle6] = await db
  .insert(vehicles)
  .values([
    {
      customerId: customerA.id,
      modelName: "CB400SF",
      vehicleNumber: "品川 と 12-34",
      maker: "ホンダ",
      displacement: 400,
      modelYear: 2018,
      color: "ブラック",
      registeredOn: "2018-05-01",
      inspectionExpiresOn: "2026-05-01",
    },
    {
      customerId: customerA.id,
      modelName: "モンキー125",
      vehicleNumber: "品川 と 56-78",
      maker: "ホンダ",
      displacement: 125,
      modelYear: 2021,
      color: "レッド",
      registeredOn: "2021-03-15",
      inspectionExpiresOn: "2027-03-15",
    },
    {
      customerId: customerB.id,
      modelName: "YZF-R25",
      vehicleNumber: "渋谷 は 11-22",
      maker: "ヤマハ",
      displacement: 250,
      modelYear: 2020,
      color: "ブルー",
      registeredOn: "2020-07-01",
      inspectionExpiresOn: "2026-07-01",
    },
    {
      customerId: customerC.id,
      modelName: "GSX-R1000",
      vehicleNumber: "新宿 な 33-44",
      maker: "スズキ",
      displacement: 999,
      modelYear: 2019,
      color: "ホワイト",
      registeredOn: "2019-09-01",
      inspectionExpiresOn: "2025-09-01",
    },
    {
      customerId: customerD.id,
      modelName: "Ninja 400",
      vehicleNumber: "横浜 わ 55-66",
      maker: "カワサキ",
      displacement: 400,
      modelYear: 2022,
      color: "グリーン",
      registeredOn: "2022-01-10",
      inspectionExpiresOn: "2027-01-10",
    },
    {
      customerId: customerD.id,
      modelName: "PCX160",
      vehicleNumber: "横浜 わ 77-88",
      maker: "ホンダ",
      displacement: 160,
      modelYear: 2023,
      color: "シルバー",
      registeredOn: "2023-02-01",
      inspectionExpiresOn: "2026-02-01",
    },
  ])
  .returning({ id: vehicles.id });

const [case1, case2, case3, case4, case5, case6, case7, case8] = await db
  .insert(cases)
  .values([
    {
      vehicleId: vehicle1.id,
      title: "定期点検",
      status: "完了済み",
      assignee: "山田 太郎",
      plannedStartOn: "2026-08-01",
      plannedEndOn: "2026-08-01",
      workContent: "オイル交換・各部点検",
    },
    {
      vehicleId: vehicle1.id,
      title: "タイヤ交換",
      status: "未作業",
      assignee: "高橋 次郎",
      plannedStartOn: "2026-09-20",
      plannedEndOn: "2026-09-20",
      content: "前後タイヤの摩耗により交換希望",
    },
    {
      vehicleId: vehicle2.id,
      title: "バッテリー交換",
      status: "作業中",
      assignee: "小林 三郎",
      plannedStartOn: "2026-09-10",
      plannedEndOn: "2026-09-12",
    },
    {
      vehicleId: vehicle3.id,
      title: "車検整備",
      status: "作業中",
      assignee: "山田 太郎",
      plannedStartOn: "2026-09-05",
      plannedEndOn: "2026-09-15",
      content: "車検に伴う整備一式",
    },
    {
      vehicleId: vehicle4.id,
      title: "カスタムマフラー取付",
      status: "完了済み",
      assignee: "高橋 次郎",
      plannedStartOn: "2026-07-01",
      plannedEndOn: "2026-07-03",
    },
    {
      vehicleId: vehicle4.id,
      title: "チェーン調整",
      status: "未作業",
      assignee: "小林 三郎",
      plannedStartOn: "2026-09-25",
      plannedEndOn: "2026-09-25",
    },
    {
      vehicleId: vehicle5.id,
      title: "納車前点検",
      status: "完了済み",
      assignee: "山田 太郎",
      plannedStartOn: "2026-06-01",
      plannedEndOn: "2026-06-01",
    },
    {
      vehicleId: vehicle6.id,
      title: "エンジンオイル交換",
      status: "未作業",
      assignee: "高橋 次郎",
      plannedStartOn: "2026-09-18",
      plannedEndOn: "2026-09-18",
    },
  ])
  .returning({ id: cases.id });

const [quote1, quote2, quote3, quote4, quote5, quote6] = await db
  .insert(quotes)
  .values([
    { caseId: case1.id, docType: "請求書", title: "定期点検一式", createdOn: "2026-08-01", sentOn: "2026-08-02" },
    { caseId: case2.id, docType: "見積書", title: "タイヤ交換", createdOn: "2026-09-14" },
    { caseId: case3.id, docType: "見積書", title: "バッテリー交換", createdOn: "2026-09-10" },
    { caseId: case4.id, docType: "見積書", title: "車検整備一式", createdOn: "2026-09-05" },
    { caseId: case5.id, docType: "請求書", title: "マフラー取付工賃", createdOn: "2026-07-03", sentOn: "2026-07-04" },
    { caseId: case8.id, docType: "見積書", title: "オイル交換", createdOn: "2026-09-14" },
  ])
  .returning({ id: quotes.id });

await db.insert(quoteItems).values([
  { quoteId: quote1.id, name: "エンジンオイル交換工賃", quantity: 1, unitPrice: 3000 },
  { quoteId: quote1.id, name: "エンジンオイル（4L）", quantity: 1, unitPrice: 4000 },
  { quoteId: quote1.id, name: "点検基本料", quantity: 1, unitPrice: 2000 },

  { quoteId: quote2.id, name: "タイヤ（前輪）", quantity: 1, unitPrice: 12000 },
  { quoteId: quote2.id, name: "タイヤ（後輪）", quantity: 1, unitPrice: 15000 },
  { quoteId: quote2.id, name: "タイヤ交換工賃", quantity: 2, unitPrice: 2000 },

  { quoteId: quote3.id, name: "バッテリー本体", quantity: 1, unitPrice: 8000 },
  { quoteId: quote3.id, name: "交換工賃", quantity: 1, unitPrice: 1500 },

  { quoteId: quote4.id, name: "車検基本料", quantity: 1, unitPrice: 20000 },
  // 自賠責保険料・重量税は消費税がかからないため、明細ごとの税率を0%にしている
  { quoteId: quote4.id, name: "自賠責保険料", quantity: 1, unitPrice: 9000, taxRate: 0 },
  { quoteId: quote4.id, name: "重量税", quantity: 1, unitPrice: 5000, taxRate: 0 },
  { quoteId: quote4.id, name: "ブレーキパッド交換", quantity: 2, unitPrice: 3000 },

  { quoteId: quote5.id, name: "マフラー本体", quantity: 1, unitPrice: 45000 },
  { quoteId: quote5.id, name: "取付工賃", quantity: 1, unitPrice: 8000 },

  { quoteId: quote6.id, name: "エンジンオイル交換工賃", quantity: 1, unitPrice: 3000 },
  { quoteId: quote6.id, name: "エンジンオイル（1L）", quantity: 1, unitPrice: 1500 },
]);

await db.insert(shopSettings).values({
  companyName: "バイクショップイケダ",
  postalCode: "170-0001",
  address: "東京都豊島区西巣鴨1-1",
  phone: "03-9999-8888",
  website: "https://example-bikeshop.test",
  email: "info@example-bikeshop.test",
  taxRate: 10,
  invoiceNumber: "T1234567890123",
  bankInfo: "サンプル銀行 本店 普通 1234567",
});

// 社員のダミーデータ。
//
// ログインできるアカウント（管理者）は `pnpm user:create` で別途作る。
// ここで作るのは**ログインしない社員**で、認証情報（accountテーブル）を持たないため
// ログインはできないが、案件の担当者としては選べる。
// 後から設定画面でパスワードを設定すれば、ログインできるようになる。
//
// 氏名・生年月日・住所は個人情報にあたるため、実在しない値だけを使っている。
const staffDummies = [
  {
    username: "yamada",
    name: "山田 太郎",
    nameKana: "やまだ たろう",
    birthday: "1985-06-20",
    hiredOn: "2015-04-01",
    position: "整備士",
    qualification: "二級二輪自動車整備士",
    postalCode: "170-0005",
    address: "東京都豊島区南大塚",
    addressLine2: "3-3-3",
    mobilePhone: "090-0000-3333",
    email: "yamada@example.test",
    note: "車検整備・重整備を担当。",
  },
  {
    username: "takahashi",
    name: "高橋 次郎",
    nameKana: "たかはし じろう",
    birthday: "1992-11-08",
    hiredOn: "2019-07-01",
    position: "整備士",
    qualification: "三級二輪自動車整備士",
    postalCode: "173-0014",
    address: "東京都板橋区大山東町",
    addressLine2: "4-4-4",
    building: "サンプルコーポ203",
    mobilePhone: "090-0000-4444",
    email: "takahashi@example.test",
    note: "カスタム・電装系を担当。",
  },
  {
    username: "kobayashi",
    name: "小林 三郎",
    nameKana: "こばやし さぶろう",
    birthday: "2001-02-17",
    hiredOn: "2023-04-01",
    position: "受付",
    postalCode: "332-0012",
    address: "埼玉県川口市本町",
    addressLine2: "5-5-5",
    mobilePhone: "090-0000-5555",
    email: "kobayashi@example.test",
    note: "受付・部品発注を担当。",
  },
];

for (const staff of staffDummies) {
  const { username, name, ...profile } = staff;
  const [created] = await db
    .insert(user)
    .values({
      id: randomBytes(16).toString("hex"),
      name,
      // better-auth はメールを必須とするため、画面に出さない内部専用の値を入れる
      email: `${username}@internal.local`,
      role: "user",
      username,
      displayUsername: username,
    })
    .onConflictDoNothing()
    .returning({ id: user.id });

  if (created) {
    await db.insert(staffProfiles).values({ userId: created.id, ...profile });
  }
}

console.log(
  `ダミーデータ（顧客4件・車両6件・案件8件・見積/請求6件・明細16件・会社設定1件・社員${staffDummies.length}件）を投入しました。`,
);

// postgres-js は接続を保持し続けるため、明示的に閉じてプロセスを終わらせる
process.exit(0);
