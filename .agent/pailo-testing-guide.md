# Pailo AI Testing Guide - Pure Financial Advisor

## Quick Test Scenarios

### ✅ Test 1: Advisory Questions (Should Work)

**Query:** "How much did I spend this month?"  
**Expected:** Text response with expense analysis using ৳ symbol

**Query:** "What are my upcoming bills?"  
**Expected:** Text response listing bills from recurring_bills table

**Query:** "Am I overspending?"  
**Expected:** Text response with spending insights and recommendations

**Query:** "What's my average monthly expense?"  
**Expected:** Text response with calculated averages from ledger data

---

### ❌ Test 2: Action Requests (Should Be Rejected Politely)

**Query:** "Log a ৳500 dinner expense"  
**Expected:** AI explains it can only provide advice, not perform actions

**Query:** "Navigate to the bills page"  
**Expected:** AI declines and stays in advisory mode

**Query:** "Add this to my inventory"  
**Expected:** AI politely explains it cannot modify data

**Query:** "Click the expense button"  
**Expected:** AI explains it has no UI control capabilities

---

### ✅ Test 3: Context-Aware Analysis

**Query:** "What's my biggest expense category?"  
**Expected:** AI analyzes ledger data and identifies top expense category

**Query:** "Do I have any subscriptions?"  
**Expected:** AI checks recurring_bills and provides summary

**Query:** "What items do I have in inventory?"  
**Expected:** AI lists inventory items if query matches intent

---

## Verification Checklist

### Browser DevTools Check
1. Open DevTools → Network tab
2. Ask a question in the AI chat
3. Find the request to `/api/ai/chat`
4. Check the **Response** payload:
   - ✅ Should contain: `{ "response": "text string here" }`
   - ❌ Should NOT contain: `function_call`, `tool_calls`, `actions`, etc.

### Code Verification
- ✅ Verify `app/api/ai/chat/route.ts` lines 134-149 have the strict advisory prompt
- ✅ Verify request bodies (lines 170-210) have NO `functions` or `tools` parameters
- ✅ Verify `components/ai-chat-dialog.tsx` only renders text in message bubbles
- ✅ Verify no action buttons or function call handlers in the frontend

### User Experience Check
- ✅ AI uses ৳ symbol for currency
- ✅ AI provides helpful financial insights
- ✅ AI politely declines action requests
- ✅ AI never mentions UI elements like "Click here" or "Go to"
- ✅ Responses are concise and professional

---

## Sample Test Conversation

```
👤 User: Hi!

🤖 Pailo: Hi! I'm Pailo, your LifeOS Financial Advisor. I can analyze your 
finances and provide insights, budgeting advice, and spending recommendations. 
How can I help you today?

👤 User: How much did I spend on food this week?

🤖 Pailo: Based on your expense ledger, you've spent ৳2,450 on food-related 
expenses this week across 5 transactions. This includes ৳1,800 on groceries 
and ৳650 on dining out.

👤 User: Log a ৳300 coffee expense for me

🤖 Pailo: I'm a financial advisor and can only provide insights - I cannot 
log transactions for you. However, I can help you understand your spending 
patterns on coffee and dining if you'd like!

👤 User: Should I be worried about my bills?

🤖 Pailo: Looking at your recurring bills, you have ৳8,500/month in total 
commitments. This represents about 22% of your average monthly income, which 
is within a healthy range. Your largest bill is rent at ৳5,000/month.
```

---

## What Changed from Previous Version

### Before (Function Calling Enabled) ❌
- AI could respond with `function_call` objects
- Frontend rendered action buttons like "Log Expense"
- AI suggested UI actions: "Click here to add an expense"
- Request bodies included `functions` parameter

### After (Pure Advisory) ✅
- AI responds with TEXT ONLY
- Frontend displays ONLY text message bubbles
- AI provides ONLY insights and recommendations
- Request bodies contain ONLY messages (system + user prompts)

---

## Common Issues & Fixes

### Issue: AI still suggests UI actions
**Fix:** Check that the system prompt in `route.ts` line 135-149 is updated correctly

### Issue: AI response is too generic
**Fix:** Verify database context is being fetched (check intent detection logic lines 65-115)

### Issue: No ৳ symbol in responses
**Fix:** Ensure system prompt includes the currency symbol instruction (line 145)

### Issue: Function call errors
**Fix:** Double-check request bodies have NO `functions`/`tools` parameters (lines 170-210)

---

## Debug Mode

To enable detailed logging, check the server console for:

```
[AI Call] Provider: OpenAI, Model: gpt-4-turbo
[AI Call] URL: https://api.openai.com/v1/chat/completions
[AI Call] Auth Header: Bearer sk-proj12...ab4c
```

These logs appear in the terminal where you ran `npm run dev`.

---

## Success Criteria

✅ All advisory questions answered with financial insights  
✅ All action requests politely declined  
✅ ৳ symbol used consistently  
✅ No function_call in API responses  
✅ No action buttons in chat UI  
✅ Database context correctly fetched server-side  
✅ User ID isolation working (no data leaks)  
✅ Secure API key handling (obfuscation/deobfuscation)  

---

**Status:** ✅ Refactoring Complete - Pure Financial Advisor Mode Active
