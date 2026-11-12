export interface StateTransition<TState extends string, TActor extends string> {
  readonly from: readonly TState[];
  readonly to: TState;
  readonly actors: readonly TActor[];
}

type TransitionMap<TState extends string> = Readonly<Record<string, StateTransition<TState, string>>>;

type ActorsOf<TTransitions extends TransitionMap<string>> =
  TTransitions[keyof TTransitions]['actors'][number];

export interface StateMachine<
  TState extends string,
  TTransitions extends TransitionMap<TState>,
  TActor extends string = ActorsOf<TTransitions>,
  TFields extends string = never,
> {
  can(status: TState, action: keyof TTransitions, actor: ActorsOf<TTransitions>): boolean;
  allowedActions(status: TState, actor: ActorsOf<TTransitions>): Array<keyof TTransitions>;
  visibleFields(status: TState, actor: TActor): ReadonlySet<TFields>;
  pickVisible<TValue extends Record<string, unknown>>(
    value: TValue,
    status: TState,
    actor: TActor,
  ): Partial<TValue>;
}

export type FieldVisibility<TState extends string, TActor extends string> = Readonly<{
  visibleTo: Readonly<Partial<Record<TActor, '*' | readonly TState[]>>>;
}>;

export function defineStateMachine<
  const TStates extends readonly string[],
  const TTransitions extends TransitionMap<TStates[number]>,
>(definition: {
  readonly states: TStates;
  readonly transitions: TTransitions;
  readonly public?: readonly string[];
  readonly fields?: Readonly<Record<string, FieldVisibility<TStates[number], string>>>;
}): StateMachine<TStates[number], TTransitions, string, string> {
  const actions = Object.keys(definition.transitions) as Array<keyof TTransitions>;

  const can = (
    status: TStates[number],
    action: keyof TTransitions,
    actor: ActorsOf<TTransitions>,
  ): boolean => {
    if (!definition.states.some((state) => state === status)) {
      return false;
    }

    const transition = definition.transitions[action];
    return (
      transition !== undefined &&
      transition.from.some((source) => source === status) &&
      transition.actors.some((allowedActor) => allowedActor === actor)
    );
  };

  const visibleFields = (status: TStates[number], actor: string): ReadonlySet<string> => {
    const visible = new Set<string>(definition.public ?? []);
    for (const [field, policy] of Object.entries(definition.fields ?? {})) {
      const rule = policy.visibleTo[actor];
      if (rule === '*' || (Array.isArray(rule) && rule.includes(status))) visible.add(field);
    }
    return visible;
  };

  return {
    can,
    allowedActions(status, actor) {
      return actions.filter((action) => can(status, action, actor));
    },
    visibleFields,
    pickVisible(value, status, actor) {
      const allowed = visibleFields(status, actor);
      return Object.fromEntries(Object.entries(value).filter(([key]) => allowed.has(key))) as Partial<typeof value>;
    },
  };
}
