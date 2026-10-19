// MikroORM Entities
// Define your database models here

import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { v4 } from 'uuid';

@Entity()
export class User {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @Property({ type: 'string', unique: true })
  email!: string;

  @Property({ type: 'string' })
  name!: string;

  @Property({ type: 'string', nullable: true })
  avatar?: string;

  @Property({ type: 'date', onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

@Entity()
export class Article {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @Property({ type: 'string' })
  title!: string;

  @Property({ type: 'text' })
  content!: string;

  @Property({ type: 'uuid' })
  authorId!: string;

  @Property({ type: 'date', onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
