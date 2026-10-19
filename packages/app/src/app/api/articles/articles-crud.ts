import {
  articleCreateSchema,
  articleListQuerySchema,
  articleUpdateSchema,
} from "@devmentor/core";
import { makeCrudRoute } from "@devmentor/core/server";

// One definition for the collection route and the item route: both re-export from it.
export const articlesCrud = makeCrudRoute({
  list: {
    query: articleListQuerySchema,
    handler: (query, { cradle }) => cradle.articleService.list(query),
  },
  read: { handler: (id, { cradle }) => cradle.articleService.get(id) },
  create: {
    body: articleCreateSchema,
    handler: (input, { cradle, session }) => cradle.articleService.create(session, input),
  },
  update: {
    body: articleUpdateSchema,
    handler: (id, input, { cradle, session }) => cradle.articleService.update(session, id, input),
  },
  remove: { handler: (id, { cradle, session }) => cradle.articleService.remove(session, id) },
});
