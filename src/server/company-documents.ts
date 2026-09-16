import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import { companyDocuments } from "~/db/schema";
import { db } from "~/lib/db";
import { requireAdminSession, requireSession } from "~/server/authGuard";
import {
  companyDocumentIdSchema,
  companyDocumentInputSchema,
  companyDocumentUpdateInputSchema,
} from "~/lib/validation";

/** 社内規定文書の一覧（設定画面用）。admin限定。 */
export const listCompanyDocuments = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdminSession();
    return db
      .select()
      .from(companyDocuments)
      .orderBy(asc(companyDocuments.title));
  },
);

/**
 * 社内チャットが参照するための一覧。誰でも質問できるようにするため、
 * 読み取りはadmin限定にしない（登録・編集・削除はadmin限定 = 下の各関数）。
 */
export const listCompanyDocumentContents = createServerFn({
  method: "GET",
}).handler(async () => {
  await requireSession();
  return db
    .select({
      id: companyDocuments.id,
      title: companyDocuments.title,
      content: companyDocuments.content,
    })
    .from(companyDocuments)
    .orderBy(asc(companyDocuments.title));
});

/** 社内規定文書を新規作成する */
export const createCompanyDocument = createServerFn({ method: "POST" })
  .validator(companyDocumentInputSchema)
  .handler(async ({ data }) => {
    await requireAdminSession();
    await db.insert(companyDocuments).values(data);
  });

/** 社内規定文書を更新する */
export const updateCompanyDocument = createServerFn({ method: "POST" })
  .validator(companyDocumentUpdateInputSchema)
  .handler(async ({ data }) => {
    await requireAdminSession();

    const { id, ...values } = data;
    await db
      .update(companyDocuments)
      .set(values)
      .where(eq(companyDocuments.id, id));
  });

/** 社内規定文書を削除する */
export const deleteCompanyDocument = createServerFn({ method: "POST" })
  .validator(companyDocumentIdSchema)
  .handler(async ({ data }) => {
    await requireAdminSession();
    await db.delete(companyDocuments).where(eq(companyDocuments.id, data.id));
  });
