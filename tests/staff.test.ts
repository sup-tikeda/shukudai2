import { describe, expect, it } from "vitest";
import { calculateAge, isRetired } from "~/lib/staff";

describe("calculateAge", () => {
  const today = new Date(2026, 8, 14); // 2026-09-14（Dateの月は0始まり）

  it("誕生日が過ぎていれば、その年齢になる", () => {
    expect(calculateAge("1990-03-01", today)).toBe(36);
  });

  it("誕生日がまだ来ていなければ、1つ引く", () => {
    expect(calculateAge("1990-12-01", today)).toBe(35);
  });

  it("誕生日当日は、その年齢になる", () => {
    expect(calculateAge("1990-09-14", today)).toBe(36);
  });

  it("誕生日の前日は、まだ1つ下のまま", () => {
    expect(calculateAge("1990-09-15", today)).toBe(35);
  });

  it("未入力なら null", () => {
    expect(calculateAge(null, today)).toBeNull();
    expect(calculateAge("", today)).toBeNull();
  });
});

describe("isRetired", () => {
  it("退職日が入っていれば退職済み", () => {
    expect(isRetired("2026-03-31")).toBe(true);
  });

  it("空なら在職中", () => {
    expect(isRetired(null)).toBe(false);
    expect(isRetired("")).toBe(false);
  });
});
