export type UserId = string;

export type BudgetCategory = {
  id: string;
  userId: UserId;
  name: string;
  assignedCents: number;
};

export type Transaction = {
  id: string;
  userId: UserId;
  categoryId: string;
  amountCents: number;
  createdAt: string;
};
