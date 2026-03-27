export type MobileQueuedMutation = {
  id: string;
  route: string;
  payload: unknown;
  createdAt: number;
};

export async function queueMutation(_: MobileQueuedMutation): Promise<void> {
  // Placeholder for AsyncStorage/MMKV-backed queue.
}
