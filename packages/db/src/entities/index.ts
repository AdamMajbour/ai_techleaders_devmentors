// MikroORM Entities
// Define your database models here

import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Entity, PrimaryKey, Property, types, type Opt } from '@mikro-orm/core';

// Table names are explicit on purpose: MikroORM derives them from the class name, and a
// minified production bundle renames classes (`User` became `u`), pointing queries at
// a table that does not exist.
@Entity({ tableName: 'user' })
export class User {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID();

  @Property({ type: 'string', unique: true })
  email!: string;

  @Property({ type: 'string' })
  name!: string;

  @Property({ type: 'string', nullable: true })
  avatar?: string;

  @Property({ type: types.datetime, onCreate: () => new Date() })
  createdAt: Date & Opt = new Date();

  @Property({ type: types.datetime, onUpdate: () => new Date() })
  updatedAt: Date & Opt = new Date();
}

@Entity({ tableName: 'article' })
export class Article {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID();

  @Property({ type: 'string' })
  title!: string;

  @Property({ type: 'text' })
  content!: string;

  @Property({ type: 'uuid', index: true })
  authorId!: string;

  @Property({ type: types.datetime, onCreate: () => new Date() })
  createdAt: Date & Opt = new Date();

  @Property({ type: types.datetime, onUpdate: () => new Date() })
  updatedAt: Date & Opt = new Date();
}
