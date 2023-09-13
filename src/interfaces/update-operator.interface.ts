/**
 * Default is ``set`` which sets the value of the attribute
 *
 * For Number attributes:
 * * ``decrement`` - Decrement the stored value by the specified amount
 * * ``increment`` - Increment the stored value by the specified amount
 *
 * For List attributes:
 * * ``append`` - Append one or more values to a List attribute
 * * ``if_not_exists`` - Increment the stored value by the specified amount
 *
 * For Set attributes:
 * * ``add`` - Add one or more values from a Set attribute
 * * ``delete`` - Delete one or more values from a Set attribute
 */
export type UpdateOperator = 'append' | 'add' | 'delete' | 'decrement' | 'if_not_exists' | 'increment' | 'set'
