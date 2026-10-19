import { articleListQuerySchema, parseOrThrow } from "@devmentor/core";
import { apiHandler, withScope } from "@devmentor/core/server";

export const dynamic = "force-dynamic";

/** GET /api/articles?authorId=<uuid> - public list of one author's articles. */
export const GET = apiHandler(async (request) => {
  const { authorId } = parseOrThrow(articleListQuerySchema, {
    authorId: new URL(request.url).searchParams.get("authorId"),
  });

  const articles = await withScope(({ articleService }) => articleService.listByAuthor(authorId));

  return {
    articles: articles.map((article) => ({
      id: article.id,
      title: article.title,
      content: article.content,
      authorId: article.authorId,
      createdAt: article.createdAt.toISOString(),
    })),
  };
});
