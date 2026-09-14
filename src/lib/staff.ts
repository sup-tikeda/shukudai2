/**
 * 社員情報まわりの計算。
 * DBにもサーバー機能にも依存しない純粋な処理なのでここに分け、テストできるようにしている。
 */

/**
 * 生年月日から満年齢を求める。
 *
 * 年齢は保存せず、表示のたびにここで計算する（保存すると誕生日が来るたびにずれるため）。
 * 誕生日が「今年まだ来ていない」場合は1つ引く。
 *
 * @param birthday "YYYY-MM-DD"。未入力なら null を返す
 * @param today 基準日。省略時は実行時の今日
 */
export function calculateAge(
  birthday: string | null | undefined,
  today: Date = new Date(),
): number | null {
  if (!birthday) return null;

  const [year, month, day] = birthday.split("-").map(Number);
  if (!year || !month || !day) return null;

  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age -= 1;
  }
  return age < 0 ? null : age;
}

/** 退職日が入っていれば退職済み。空なら在職中。 */
export function isRetired(retiredOn: string | null | undefined) {
  return Boolean(retiredOn);
}
