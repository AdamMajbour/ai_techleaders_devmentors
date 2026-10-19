import { defineDomainEntity, p, type InferEntity } from '../define';

export const Article = defineDomainEntity({
  name: 'Article',
  tableName: 'articles',
  properties: {
    title: p.string(),
    content: p.text(),
    // Plain column, not a relation: authors are looked up through the auth concept.
    authorId: p.uuid().index(),
  },
});

export type Article = InferEntity<typeof Article>;
