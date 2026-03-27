export type QueuedMutation = {
  id: string;
  endpoint: string;
  payload: unknown;
  createdAt: number;
};

export function enqueueMutation(mutation: QueuedMutation): Promise<void> {
  // Placeholder for IndexedDB implementation.
  void mutation;
  return Promise.resolve();
}
