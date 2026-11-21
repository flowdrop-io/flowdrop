/**
 * The enum members a select offers, and the way back from the option a person
 * picked to the member the config keeps.
 */

/**
 * The enum members that are options. `null` is not one: the null toggle stores
 * it, and as an option it would be stored as the text "null".
 */
export function selectableMembers(schema: { enum?: unknown[] }): unknown[] {
  return (schema.enum ?? []).filter((member) => member !== null);
}

/**
 * The member of `members` an option stands for. Options are shown as strings;
 * the config keeps the original member, so `{ type: 'integer', enum: [1, 2] }`
 * stores `2`, not `"2"` (R6.e.2). A value that is no option (the empty option's
 * `''`) goes through unchanged.
 */
export function memberFor(members: readonly unknown[], chosen: unknown): unknown {
  const index = members.findIndex((member) => String(member) === chosen);
  return index < 0 ? chosen : members[index];
}
