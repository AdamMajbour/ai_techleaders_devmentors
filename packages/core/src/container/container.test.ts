/** @jest-environment node */
import { ArticleRepository, UserRepository } from '@devmentor/db';
import { ArticleService } from '../services/articles/article.service';
import { UserService } from '../services/auth/user.service';
import { MockPaymentGateway } from '../services/payments/adapters/mock-payment-gateway';
import { ConsoleMailer } from '../services/notifications/adapters/console-mailer';
import { systemClock } from '../utils/clock';
import { buildContainer } from './container';
import type { OrmLike } from './cradle';

function fakeOrm() {
  const fork = jest.fn(() => ({ fork: true }) as never);
  const orm: OrmLike = { em: { fork } };
  return { orm, fork };
}

const silentLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

describe('buildContainer', () => {
  it('resolves repositories and services built on an EntityManager fork', () => {
    const { orm, fork } = fakeOrm();
    const { cradle } = buildContainer(orm, silentLogger).createScope();

    expect(cradle.userRepository).toBeInstanceOf(UserRepository);
    expect(cradle.articleRepository).toBeInstanceOf(ArticleRepository);
    expect(cradle.userService).toBeInstanceOf(UserService);
    expect(cradle.articleService).toBeInstanceOf(ArticleService);
    expect(cradle.paymentGateway).toBeInstanceOf(MockPaymentGateway);
    expect(cradle.mailer).toBeInstanceOf(ConsoleMailer);
    expect(cradle.clock).toBe(systemClock);
    expect(fork).toHaveBeenCalledTimes(1);
  });

  it('shares one EntityManager between everything in a scope', () => {
    const { orm, fork } = fakeOrm();
    const { cradle } = buildContainer(orm, silentLogger).createScope();

    expect(cradle.em).toBe(cradle.em);
    expect(cradle.userService).toBe(cradle.userService);
    expect(cradle.articleRepository).toBeInstanceOf(ArticleRepository);
    expect(fork).toHaveBeenCalledTimes(1);
  });

  it('gives every scope its own EntityManager, repositories and services', () => {
    const { orm, fork } = fakeOrm();
    const root = buildContainer(orm, silentLogger);
    const first = root.createScope();
    const second = root.createScope();

    expect(first.cradle.userService).not.toBe(second.cradle.userService);
    expect(first.cradle.em).not.toBe(second.cradle.em);
    expect(fork).toHaveBeenCalledTimes(2);
  });

  it('keeps the ORM and the logger singletons shared by all scopes', () => {
    const { orm } = fakeOrm();
    const root = buildContainer(orm, silentLogger);

    expect(root.createScope().cradle.orm).toBe(orm);
    expect(root.createScope().cradle.logger).toBe(silentLogger);
    expect(root.createScope().cradle.paymentGateway).toBe(root.createScope().cradle.paymentGateway);
  });
});
