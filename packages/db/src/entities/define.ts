// Single import point for entity definitions, so entity files do not each reach into @mikro-orm/core.
import { defineEntity } from '@mikro-orm/core';
import { baseProperties } from './base.entity';

export { p, type InferEntity } from '@mikro-orm/core';

type DomainEntityMeta<TProperties extends Record<string, unknown>> = {
  /** PascalCase singular. Explicit because minified production bundles rename classes. */
  name: string;
  /** snake_case plural. */
  tableName: string;
  properties: TProperties;
};

/** `defineEntity` with the shared base columns (id, createdAt, updatedAt) included. */
export function defineDomainEntity<const TProperties extends Record<string, unknown>>(
  meta: DomainEntityMeta<TProperties>,
) {
  return defineEntity({
    name: meta.name,
    tableName: meta.tableName,
    properties: { ...baseProperties(), ...meta.properties },
  });
}
