import { HTTP_STATUS } from "@devmentor/core";

import { createRequestScope } from "../../../server/container";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/articles?authorId=<uuid> - list one author's articles. */
export async function GET(request: Request) {
  const authorId = new URL(request.url).searchParams.get("authorId");
  if (!authorId || !UUID.test(authorId)) {
    return Response.json({ error: "Query parameter 'authorId' must be a UUID." }, { status: HTTP_STATUS.BAD_REQUEST });
  }

  const { cradle } = await createRequestScope();
  const articles = await cradle.articleRepository.findByAuthor(authorId);

  return Response.json({
    articles: articles.map((article) => ({
      id: article.id,
      title: article.title,
      content: article.content,
      authorId: article.authorId,
      createdAt: article.createdAt.toISOString(),
    })),
  });
}
