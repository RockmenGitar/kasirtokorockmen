export * from './types';
export { supabase, isSupabaseConfigured } from './client';
export { authService } from './auth';
export { productService } from './products';
export { productStockService } from './productStock';
export { categoryService } from './categories';
export { transactionService } from './transactions';
export { stockMovementService } from './inventory';
export { receiveService } from './receive';
export { expenseService } from './expenses';
export { customerService } from './customers';
export { promoService } from './promos';
export { shiftService } from './shifts';
export { refundService } from './refunds';
export { settingsService } from './settings';

import { authService } from './auth';
import { productService } from './products';
import { productStockService } from './productStock';
import { categoryService } from './categories';
import { transactionService } from './transactions';
import { stockMovementService } from './inventory';
import { receiveService } from './receive';
import { expenseService } from './expenses';
import { customerService } from './customers';
import { promoService } from './promos';
import { shiftService } from './shifts';
import { refundService } from './refunds';
import { settingsService } from './settings';

export const dbService = {
  // products
  getProducts:         productService.getProducts.bind(productService),
  addProduct:          productService.addProduct.bind(productService),
  updateProduct:       productService.updateProduct.bind(productService),
  updateProductStock:  productService.updateProductStock.bind(productService),
  deleteProduct:       productService.deleteProduct.bind(productService),
  getProductStockMap:  productStockService.getStockMap.bind(productStockService),
  setOutletStock:      productStockService.setStock.bind(productStockService),

  // categories
  getCategories:       categoryService.getCategories.bind(categoryService),
  addCategory:         categoryService.addCategory.bind(categoryService),
  updateCategory:      categoryService.updateCategory.bind(categoryService),
  deleteCategory:      categoryService.deleteCategory.bind(categoryService),

  // transactions
  getTransactions:      transactionService.getTransactions.bind(transactionService),
  createTransaction:    transactionService.createTransaction.bind(transactionService),
  updateTransaction:    transactionService.updateTransaction.bind(transactionService),
  setTransactionStatus: transactionService.setStatus.bind(transactionService),

  // inventory
  getMovements:        stockMovementService.getMovements.bind(stockMovementService),
  recordMovement:      stockMovementService.recordMovement.bind(stockMovementService),
  setStock:            stockMovementService.setStock.bind(stockMovementService),
  receiveStock:        receiveService.receive.bind(receiveService),
  listReceipts:        receiveService.listReceipts.bind(receiveService),

  // expenses
  getExpenses:         expenseService.getExpenses.bind(expenseService),
  addExpense:          expenseService.addExpense.bind(expenseService),
  updateExpense:       expenseService.updateExpense.bind(expenseService),
  deleteExpense:       expenseService.deleteExpense.bind(expenseService),

  // customers
  getCustomers:        customerService.getCustomers.bind(customerService),
  addCustomer:         customerService.addCustomer.bind(customerService),
  updateCustomer:      customerService.updateCustomer.bind(customerService),
  deleteCustomer:      customerService.deleteCustomer.bind(customerService),
  adjustCustomerPoints:customerService.adjustPoints.bind(customerService),

  // promos
  getPromos:           promoService.getPromos.bind(promoService),
  getActivePromos:     promoService.getActivePromos.bind(promoService),
  addPromo:            promoService.addPromo.bind(promoService),
  updatePromo:         promoService.updatePromo.bind(promoService),
  deletePromo:         promoService.deletePromo.bind(promoService),

  // shifts
  getShifts:           shiftService.getShifts.bind(shiftService),
  getOpenShift:        shiftService.getOpenShift.bind(shiftService),
  openShift:           shiftService.openShift.bind(shiftService),
  closeShift:          shiftService.closeShift.bind(shiftService),

  // refunds
  getRefunds:          refundService.getRefunds.bind(refundService),
  addRefund:           refundService.addRefund.bind(refundService),
  getRefundedAmount:   refundService.getRefundedAmountByOrder.bind(refundService),

  // settings
  getSettings:         settingsService.getSettings.bind(settingsService),
  saveSettings:        settingsService.saveSettings.bind(settingsService),

  // auth / store / staff
  getOrCreateStore:    authService.getOrCreateStore.bind(authService),
  listStores:          authService.listStores.bind(authService),
  addStore:            authService.addStore.bind(authService),
  updateStore:         authService.updateStore.bind(authService),
  deleteStore:         authService.deleteStore.bind(authService),
  syncProducts:        authService.syncProducts.bind(authService),
  getStoreById:        authService.getStoreById.bind(authService),
  updateStoreAvatar:   authService.updateStoreAvatar.bind(authService),
  updateStoreName:     authService.updateStoreName.bind(authService),
  signIn:              authService.signIn.bind(authService),
  getCurrentSession:   authService.getCurrentSession.bind(authService),
  signOut:             authService.signOut.bind(authService),
  getCashiers:         authService.getCashiers.bind(authService),
  addStaff:            authService.addStaff.bind(authService),
  updateStaff:         authService.updateStaff.bind(authService),
  deleteStaff:         authService.deleteStaff.bind(authService),
  getOwners:           authService.getOwners.bind(authService),
  addOwner:            authService.addOwner.bind(authService),
  updateOwner:         authService.updateOwner.bind(authService),
  deleteOwner:         authService.deleteOwner.bind(authService),
  resetPassword:       authService.resetPassword.bind(authService),
  updatePassword:      authService.updatePassword.bind(authService),
};
