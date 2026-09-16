import { describe, expect, it } from "vitest";
import { inquiryInputSchema, inquiryTopicValues } from "~/lib/validation";

describe("inquiryInputSchema", () => {
  const valid = {
    name: "山田太郎",
    email: "taro@example.com",
    subject: "修理・不具合の相談",
    message: "エンジンのかかりが悪いので見てほしいです。",
  } as const;

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

  it("ご相談内容は選択肢のいずれかを受け付ける", () => {
    for (const topic of inquiryTopicValues) {
      expect(
        inquiryInputSchema.safeParse({ ...valid, subject: topic }).success,
      ).toBe(true);
    }
  });

  // 通知メールの件名に入るため、選択肢の外の値が混ざると振り分けができなくなる
  it("選択肢にないご相談内容を拒否する", () => {
    const result = inquiryInputSchema.safeParse({
      ...valid,
      subject: "よろしくお願いします",
    });
    expect(result.success).toBe(false);
  });

  it("ご相談内容が未選択のときを拒否する", () => {
    const result = inquiryInputSchema.safeParse({ ...valid, subject: "" });
    expect(result.error?.flatten().fieldErrors.subject?.[0]).toBe(
      "ご相談内容を選択してください",
    );
  });
});
