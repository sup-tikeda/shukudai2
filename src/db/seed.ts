import "dotenv/config";
import { sql } from "drizzle-orm";
import { equipmentLoans } from "./schema";
import { db } from "~/lib/db";

/**
 * 動作確認用のダミーデータを3件入れる（実在の人名は使わない）。
 * すでに1件以上あれば何もしないため、何度実行しても増えない。
 *
 * 実行: pnpm db:seed
 */
const DUMMY_LOANS = [
  { itemName: "ノートPC（14インチ）", borrower: "利用者A", lentOn: "2026-09-01" },
  { itemName: "プロジェクター", borrower: "利用者B", lentOn: "2026-09-03" },
  { itemName: "モバイルWi-Fiルーター", borrower: "利用者C", lentOn: "2026-09-05" },
];

const [{ count }] = await db
  .select({ count: sql<number>`count(*)::int` })
  .from(equipmentLoans);

if (count > 0) {
  console.log(`既に ${count} 件あるため、ダミーデータの投入をスキップしました。`);
} else {
  await db.insert(equipmentLoans).values(DUMMY_LOANS);
  console.log(`ダミーデータ ${DUMMY_LOANS.length} 件を投入しました。`);
}

// postgres-js は接続を保持し続けるため、明示的に閉じてプロセスを終わらせる
process.exit(0);
