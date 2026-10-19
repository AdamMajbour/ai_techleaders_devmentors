/** @jest-environment node */
import { ArticleRepository, UserRepository } from '@devmentor/db';
import { buildContainer, type OrmLike } from './container';

function fakeOrm() {
  const fork = jest.fn(() => ({ fork: true }) as never);
  const orm: OrmLike = { em: { fork } };
  return { orm, fork };
}

describe('buildContainer', () => {
  it('resolves repositories built on an EntityManager fork', () => {
    const { orm, fork } = fakeOrm();
    const scope = buildContainer(orm).createScope();

    expect(scope.cradle.userRepository).toBeInstanceOf(UserRepository);
    expect(scope.cradle.articleRepository).toBeInstanceOf(ArticleRepository);
    expect(fork).toHaveBeenCalledTimes(1);
  });

  it('shares one EntityManager between the repositories of a scope', () => {
    const { orm, fork } = fakeOrm();
    const scope = buildContainer(orm).createScope();

    expect(scope.cradle.em).toBe(scope.cradle.em);
    expect(scope.cradle.userRepository).toBe(scope.cradle.userRepository);
    expect(scope.cradle.articleRepository).toBeInstanceOf(ArticleRepository);
    expect(fork).toHaveBeenCalledTimes(1);
  });

  it('gives every scope its own EntityManager and repositories', () => {
    const { orm, fork } = fakeOrm();
    const root = buildContainer(orm);
    const first = root.createScope();
    const second = root.createScope();

    expect(first.cradle.userRepository).not.toBe(second.cradle.userRepository);
    expect(first.cradle.em).not.toBe(second.cradle.em);
    expect(fork).toHaveBeenCalledTimes(2);
  });

  it('keeps the ORM a singleton shared by all scopes', () => {
    const { orm } = fakeOrm();
    const root = buildContainer(orm);

    expect(root.createScope().cradle.orm).toBe(orm);
    expect(root.createScope().cradle.orm).toBe(orm);
  });
});
