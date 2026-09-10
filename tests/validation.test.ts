import { describe, expect, it } from "vitest";
import { inquiryInputSchema } from "~/lib/validation";

describe("inquiryInputSchema", () => {
  const valid = {
    name: "山田太郎",
    email: "taro@example.com",
    subject: "備品の申請について",
    message: "モニターを1台追加したいです。",
  };

  it("正しい入力を受け付ける", () => {
    expect(inquiryInputSchema.parse(valid)).toEqual(valid);
  });

  it("前後の空白を取り除く", () => {
    const parsed = inquiryInputSchema.parse({ ...valid, name: "  山田太郎  " });
    expect(parsed.name).toBe("山田太郎");
  });

  it("メールアドレスの形式を検証する", () => {
    const result = inquiryInputSchema.safeParse({ ...valid, email: "not-mail" });
    expect(result.success).toBe(false);
  });

  it("空白のみの本文を拒否する", () => {
    const result = inquiryInputSchema.safeParse({ ...valid, message: "   " });
    expect(result.success).toBe(false);
  });

  it("上限を超える件名を拒否する", () => {
    const result = inquiryInputSchema.safeParse({
      ...valid,
      subject: "あ".repeat(201),
    });
    expect(result.success).toBe(false);
  });
});
