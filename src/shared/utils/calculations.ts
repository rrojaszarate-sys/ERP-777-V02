import { MEXICAN_CONFIG } from '../../core/config/constants';

export const calculateIVA = (subtotal: number, rate: number = MEXICAN_CONFIG.ivaRate): number => {
  return Math.round((subtotal * (rate / 100)) * 100) / 100;
};

export const calculateSubtotal = (total: number, rate: number = MEXICAN_CONFIG.ivaRate): number => {
  return Math.round((total / (1 + rate / 100)) * 100) / 100;
};

export const calculateTotal = (subtotal: number, iva?: number): number => {
  const ivaAmount = iva !== undefined ? iva : calculateIVA(subtotal);
  return Math.round((subtotal + ivaAmount) * 100) / 100;
};

export const calculateMargin = (income: number, expenses: number): number => {
  if (income === 0) return 0;
  return Math.round(((income - expenses) / income * 100) * 100) / 100;
};

export const calculateDaysOverdue = (dueDate: string): number => {
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

export const calculateCollectionRate = (paid: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((paid / total * 100) * 100) / 100;
};