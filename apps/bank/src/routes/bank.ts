import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { bankService } from '../db/bank-service';
import { logger } from '@careforall/common';

const app = new Hono();

const authorizeSchema = z.object({
  accountNumber: z.string(),
  amount: z.number().positive(),
  reference: z.string(),
  description: z.string().optional(),
});

const captureSchema = z.object({
  holdId: z.string(),
});

const releaseSchema = z.object({
  holdId: z.string(),
});

const checkBalanceSchema = z.object({
  accountNumber: z.string(),
  amount: z.number().positive(),
});

// Authorize payment - place hold on funds
app.post('/authorize', zValidator('json', authorizeSchema), async (c) => {
  const data = c.req.valid('json');
  
  logger.info(`Authorization request for account ${data.accountNumber}, amount: ${data.amount}`);
  
  const result = await bankService.authorizePayment(data);
  
  if (!result.success) {
    return c.json({ success: false, error: result.error }, 400);
  }
  
  return c.json({
    success: true,
    holdId: result.holdId,
    message: 'Payment authorized',
  });
});

// Capture payment - convert hold to actual debit
app.post('/capture', zValidator('json', captureSchema), async (c) => {
  const data = c.req.valid('json');
  
  logger.info(`Capture request for hold ${data.holdId}`);
  
  const result = await bankService.capturePayment(data);
  
  if (!result.success) {
    return c.json({ success: false, error: result.error }, 400);
  }
  
  return c.json({
    success: true,
    transactionId: result.transactionId,
    message: 'Payment captured',
  });
});

// Release hold - cancel authorization
app.post('/release', zValidator('json', releaseSchema), async (c) => {
  const data = c.req.valid('json');
  
  logger.info(`Release request for hold ${data.holdId}`);
  
  const result = await bankService.releaseHold(data);
  
  if (!result.success) {
    return c.json({ success: false, error: result.error }, 400);
  }
  
  return c.json({
    success: true,
    message: 'Hold released',
  });
});

// Check balance
app.post('/check-balance', zValidator('json', checkBalanceSchema), async (c) => {
  const { accountNumber, amount } = c.req.valid('json');
  
  const result = await bankService.checkBalance(accountNumber, amount);
  
  if (!result.success) {
    return c.json({ success: false, error: result.error }, 400);
  }
  
  return c.json({
    success: true,
    balance: result.balance,
  });
});

// Get account details
app.get('/account/:accountNumber', async (c) => {
  const accountNumber = c.req.param('accountNumber');
  
  const account = await bankService.getAccount(accountNumber);
  
  if (!account) {
    return c.json({ error: 'Account not found' }, 404);
  }
  
  return c.json(account);
});

// Get transaction history
app.get('/account/:accountNumber/transactions', async (c) => {
  const accountNumber = c.req.param('accountNumber');
  const limit = Number(c.req.query('limit')) || 50;
  
  const transactions = await bankService.getTransactions(accountNumber, limit);
  
  return c.json({ transactions });
});

export const bankRoutes = app;
