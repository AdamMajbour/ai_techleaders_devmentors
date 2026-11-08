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
> {
  can(status: TState, action: keyof TTransitions, actor: ActorsOf<TTransitions>): boolean;
  allowedActions(status: TState, actor: ActorsOf<TTransitions>): Array<keyof TTransitions>;
}

export function defineStateMachine<
  const TStates extends readonly string[],
  const TTransitions extends TransitionMap<TStates[number]>,
>(definition: {
  readonly states: TStates;
  readonly transitions: TTransitions;
}): StateMachine<TStates[number], TTransitions> {
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

  return {
    can,
    allowedActions(status, actor) {
      return actions.filter((action) => can(status, action, actor));
    },
  };
}
