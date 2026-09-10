import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

/**
 * ビルド対象を切り替える。
 * - cloudflare（既定）：Cloudflare Workers 向け。出力は dist/server/index.js
 * - node：Node.js（Docker + nginx + Cloudflare Tunnel）向け。出力は dist/server/server.js を
 *   server.mjs が読み込む
 *
 * どちらの構成も維持したいため、プラグインの有無で切り替えられるようにしている
 * （README「2つの構成パターン」参照）。
 */
const buildTarget = process.env.BUILD_TARGET ?? "cloudflare";

export default defineConfig({
  // プラグインの順序が重要。cloudflare を先頭に置き、SSR環境をWorkers(workerd)で動かす。
  // これにより開発時(vite dev)も本番と同じworkerd上で動くため、環境差による事故を防げる。
  plugins: [
    ...(buildTarget === "cloudflare"
      ? [cloudflare({ viteEnvironment: { name: "ssr" } })]
      : []),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  server: {
    // WSL(Ubuntu)で動かすため、全インターフェースで待ち受ける。
    // 既定の localhost のままだと WSL の内側だけで待ち受けてしまい、
    // Windows のブラウザから http://localhost:5273 に繋がらない。
    host: true,
    // このPCでは 5173 を別プロジェクトの開発サーバーが使用しているため、
    // 衝突しないポートを明示する。strictPort: true にして、
    // 空いていない場合に黙って別ポートへ移らず起動失敗させる
    // （BETTER_AUTH_URL とずれると認証のリダイレクト先が狂うため）。
    port: 5273,
    strictPort: true,
  },
  resolve: {
    alias: {
      "~": "/src",
    },
  },
});
