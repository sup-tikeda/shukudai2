import { createServerFn } from "@tanstack/react-start";
import { requireSession } from "~/server/authGuard";
import { postalCodeSchema } from "~/lib/validation";

type ZipCloudResponse = {
  status: number;
  message: string | null;
  results:
    | { address1: string; address2: string; address3: string }[]
    | null;
};

/**
 * 郵便番号から住所を引く（元のFileMakerの「住所入力」スクリプトと同じzipcloudを利用）。
 *
 * ブラウザから直接叩かずサーバー経由にしているのは、外部APIのCORS設定に依存しないため。
 * zipcloudは日本郵便の公開データを再配信する無料サービスで、大量アクセスは避ける規約のため
 * ボタンを押した時だけ呼ぶ（入力のたびに自動で叩かない）。
 */
export const lookupAddress = createServerFn({ method: "POST" })
  .validator(postalCodeSchema)
  .handler(async ({ data }) => {
    await requireSession();

    const response = await fetch(
      `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${data.postalCode}`,
    );
    if (!response.ok) {
      throw new Error("住所の検索に失敗しました。時間をおいてお試しください。");
    }

    const json = (await response.json()) as ZipCloudResponse;
    const result = json.results?.[0];
    if (!result) {
      throw new Error("入力された郵便番号から住所が見つかりませんでした。");
    }

    return {
      address: `${result.address1}${result.address2}${result.address3}`,
    };
  });
