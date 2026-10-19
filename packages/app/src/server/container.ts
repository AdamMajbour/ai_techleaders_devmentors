// Dependency injection container (Awilix). Server-only: it pulls in @devmentor/db.
//
// Lifetimes:
//   orm                                    - singleton, one connection pool per process
//   em, userRepository, articleRepository  - scoped, a fresh EntityManager fork per request scope
import { asFunction, asValue, createContainer, InjectionMode, type AwilixContainer } from "awilix";
import type { EntityManager } from "@mikro-orm/core";
import { ArticleRepository, initializeORM, UserRepository } from "@devmentor/db";

/** The part of MikroORM the container depends on (lets tests pass a fake). */
export interface OrmLike {
  em: { fork(): EntityManager };
}

export interface Cradle {
  orm: OrmLike;
  em: EntityManager;
  userRepository: UserRepository;
  articleRepository: ArticleRepository;
}

export type AppContainer = AwilixContainer<Cradle>;

export function buildContainer(orm: OrmLike): AppContainer {
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY, strict: true });

  container.register({
    orm: asValue(orm),
    em: asFunction(({ orm }: Cradle) => orm.em.fork()).scoped(),
    userRepository: asFunction(({ em }: Cradle) => new UserRepository(em)).scoped(),
    articleRepository: asFunction(({ em }: Cradle) => new ArticleRepository(em)).scoped(),
  });

  return container;
}

let rootContainer: Promise<AppContainer> | null = null;

/** Root container, created once per process (the ORM connects on first use). */
export function getContainer(): Promise<AppContainer> {
  rootContainer ??= initializeORM()
    .then(buildContainer)
    .catch((error: unknown) => {
      rootContainer = null; // let the next request retry instead of caching the failure
      throw error;
    });
  return rootContainer;
}

/** A scope for one request: its repositories share one EntityManager fork. */
export async function createRequestScope(): Promise<AppContainer> {
  return (await getContainer()).createScope();
}
