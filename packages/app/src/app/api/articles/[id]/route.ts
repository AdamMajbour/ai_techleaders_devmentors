import { articlesCrud } from "../articles-crud";

export const dynamic = "force-dynamic";

/** GET (public), PUT and DELETE (author only) for one article. */
export const { GET, PUT, DELETE } = articlesCrud;
