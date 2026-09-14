import { describe, expect, it } from "vitest";
import {
  caseUpdateInputSchema,
  customerInputSchema,
  staffProfileInputSchema,
  vehicleInputSchema,
} from "~/lib/validation";

/**
 * 任意項目を空にしたとき、undefined ではなく null になることを確かめる。
 *
 * drizzle-orm の `.set()` は値が undefined のキーをSQLから除外するため、
 * undefined を返すと「画面で項目を空にして保存しても前の値が消えない」不具合になる。
 * 実際に「案件の担当者を未定に戻せない」という形で発生したため、テストで固定する。
 */
describe("任意項目を空にしたときの正規化", () => {
  it("案件：担当者を未定（空欄）にすると null になる", () => {
    const parsed = caseUpdateInputSchema.parse({
      id: "0a3b4c5d-1111-4222-8333-444455556666",
      vehicleId: "0a3b4c5d-1111-4222-8333-444455556667",
      title: "定期点検",
      status: "未作業",
      assignee: "",
      content: "",
      plannedStartOn: "",
      plannedEndOn: "",
      workContent: "",
      note: "",
    });

    expect(parsed.assignee).toBeNull();
    expect(parsed.plannedStartOn).toBeNull();
    expect(parsed.note).toBeNull();
    // キー自体が消えると更新対象から外れてしまうため、必ず含まれること
    expect("assignee" in parsed).toBe(true);
  });

  it("案件：担当者を選べば、その名前がそのまま入る", () => {
    const parsed = caseUpdateInputSchema.parse({
      id: "0a3b4c5d-1111-4222-8333-444455556666",
      vehicleId: "0a3b4c5d-1111-4222-8333-444455556667",
      title: "定期点検",
      status: "作業中",
      assignee: "山田 太郎",
    });

    expect(parsed.assignee).toBe("山田 太郎");
  });

  it("顧客：連絡先を空にすると null になる", () => {
    const parsed = customerInputSchema.parse({
      name: "サンプル商会",
      phone: "",
      email: "",
      address: "",
    });

    expect(parsed.phone).toBeNull();
    expect(parsed.email).toBeNull();
    expect(parsed.address).toBeNull();
  });

  it("車両：排気量・年式を空にすると null になる（0にはしない）", () => {
    const parsed = vehicleInputSchema.parse({
      customerId: "0a3b4c5d-1111-4222-8333-444455556667",
      modelName: "CB400SF",
      displacement: "",
      modelYear: "",
      inspectionExpiresOn: "",
    });

    expect(parsed.displacement).toBeNull();
    expect(parsed.modelYear).toBeNull();
    expect(parsed.inspectionExpiresOn).toBeNull();
  });

  it("車両：数値を入れれば数値として入る", () => {
    const parsed = vehicleInputSchema.parse({
      customerId: "0a3b4c5d-1111-4222-8333-444455556667",
      modelName: "CB400SF",
      displacement: "400",
      modelYear: "2018",
    });

    expect(parsed.displacement).toBe(400);
    expect(parsed.modelYear).toBe(2018);
  });

  it("社員：退職日を空にすると null になる（在職中に戻せる）", () => {
    const parsed = staffProfileInputSchema.parse({ retiredOn: "" });

    expect(parsed.retiredOn).toBeNull();
  });

  it("日付の形式が不正なら弾く", () => {
    const result = staffProfileInputSchema.safeParse({ birthday: "きのう" });

    expect(result.success).toBe(false);
  });
});
