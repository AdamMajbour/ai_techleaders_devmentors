import { articlesCrud } from "./articles-crud";

export const dynamic = "force-dynamic";

/** GET /api/articles?authorId=&page=&pageSize= (public list), POST /api/articles (logged in). */
export const { GET, POST } = articlesCrud;
