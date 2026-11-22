export type User = { id: number; email: string };

/** Before: scans every row, O(n). */
export const findByEmailScan = (users: User[], email: string): User | undefined => {
  for (const user of users) {
    if (user.email === email) return user;
  }
  return undefined;
};

/** After: build an index once, then look up in O(1) average. */
export const buildEmailIndex = (users: User[]): Map<string, User> =>
  new Map(users.map((user) => [user.email, user]));

export const findByEmailIndexed = (index: Map<string, User>, email: string): User | undefined =>
  index.get(email);
