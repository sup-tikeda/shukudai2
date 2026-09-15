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

/**
 * 退職日を過ぎていれば退職済み。空欄なら在職中。
 *
 * 退職日が入っているかどうかではなく、その日を過ぎたかどうかで判定する。
 * 退職予定日を先に登録しておく運用があるため、入力した時点で
 * 担当者に選べなくなってしまうと、退職までの案件を割り当てられなくなる。
 * 退職日当日は最終出社日にあたるため、まだ在職中として扱う。
 *
 * @param retiredOn "YYYY-MM-DD"。未入力なら在職中
 * @param today 基準日。省略時は実行時の今日
 */
export function isRetired(
  retiredOn: string | null | undefined,
  today: Date = new Date(),
) {
  if (!retiredOn) return false;
  // どちらも "YYYY-MM-DD" なので、文字列のまま比べれば日付順になる
  return retiredOn < toIsoDate(today);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
