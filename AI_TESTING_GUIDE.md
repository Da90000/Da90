# AI Bot Testing Guide

## 🧪 Quick Test Queries

Use these to test your optimized AI bot:

### Income Queries
```
"What's my total income?"
"How much did I earn this month?"
"Show me my income sources"
"What are my income trends?"
```

### Expense Queries
```
"How much did I spend?"
"What's my biggest expense category?"
"Show my spending breakdown"
"Where did my money go?"
```

### Balance & Net Worth
```
"What's my cash balance?"
"Calculate my net worth"
"Am I saving or spending more?"
"What's my financial summary?"
```

### Bills
```
"Do I have any bills due?"
"What are my monthly bills?"
"Show upcoming payments"
"List all my recurring bills"
```

### Debts
```
"How much do I owe?"
"Show my outstanding debts"
"Who owes me money?"
"What's my debt situation?"
```

### Maintenance
```
"Any maintenance due?"
"What needs servicing?"
"Show maintenance schedule"
"What should I maintain this week?"
```

### Intelligent Questions
```
"Give me financial advice"
"What should I focus on?"
"How can I save more money?"
"Analyze my spending patterns"
"What's unusual about my finances?"
```

---

## ✅ Expected Response Format

```markdown
**Direct Answer with Bold Numbers**

• Concise point 1
• Concise point 2
• Concise point 3

💡 One actionable suggestion
```

---

## 📏 Response Quality Checklist

Good AI response should:
- [ ] Be 2-4 bullet points (not more)
- [ ] Use ৳ for all amounts
- [ ] Bold key numbers with **৳amount**
- [ ] Include 1 suggestion with 💡
- [ ] Answer the question directly
- [ ] Use markdown bullets
- [ ] Be under 150 tokens
- [ ] Provide actionable insight

---

## 🚨 What AI Should NOT Do

The AI will NEVER:
- ❌ Suggest "Click the Add button"
- ❌ Tell you to "Create a new transaction"
- ❌ Say "Log this expense"
- ❌ Give UI navigation instructions
- ❌ Write long paragraphs
- ❌ Give generic advice without data

---

## 🎯 Sample Expected Responses

### Query: "What's my financial summary?"
```
**Current Status: ৳75,270 Cash Balance**

• Income: ৳120,500 (18 transactions)
• Expenses: ৳45,230 (52 transactions)
• Net Worth: ৳85,600

💡 Strong savings rate of 62%. Consider investing surplus cash.
```

### Query: "How much did I spend on food?"
```
**Food & Groceries: ৳15,400**

• 23 transactions this month
• Average ৳670 per transaction
• 34% of total expenses

💡 High food spending. Meal planning could save ৳3-5K/month.
```

### Query: "Any bills due soon?"
```
**3 Bills Due This Week**

• Rent: ৳7,800 (due day 1)
• Electricity: ৳3,200 (due day 5)
• Internet: ৳1,500 (due day 10)

💡 Total ৳12,500 due. Ensure sufficient balance.
```

---

## 🔍 Testing Token Usage

To verify optimization is working:

### Before Optimization
- Input: 3000-5000 tokens
- Output: 500-1000 tokens
- Total: 3500-6000 tokens

### After Optimization (Target)
- Input: 500-1000 tokens
- Output: 100-200 tokens
- Total: 600-1200 tokens

**If total > 1500 tokens, something's wrong!**

---

## 🛠️ Troubleshooting

### Issue: Response too long
**Fix:** Check max_tokens is set to 300

### Issue: Response includes UI suggestions
**Fix:** System prompt is not being used correctly

### Issue: High API costs
**Fix:** Verify data summarization is working

### Issue: Inaccurate calculations
**Fix:** Check summarizeContextData function logic

### Issue: Generic responses
**Fix:** Ensure data is being passed to AI

---

## 📊 Performance Benchmarks

Track these metrics:

| Test | Target | Status |
|------|--------|--------|
| Response time | < 5s | ⏱️ |
| Token usage | < 1200 | 📉 |
| Cost per query | < $0.01 | 💰 |
| Accuracy | 100% | ✓ |
| Relevance | High | 🎯 |

---

## 🎓 Pro Tips

1. **Ask Specific Questions**: Better results than vague queries
2. **One Topic Per Query**: Don't ask about everything at once
3. **Natural Language**: Write like you're texting a friend
4. **Be Patient**: First query might take 3-5 seconds
5. **Rephrase If Needed**: AI understands variations

---

## 🔄 Continuous Improvement

Monitor for:
- Unnecessarily long responses → Adjust system prompt
- Vague suggestions → Add more specificity rules
- Inaccurate numbers → Check calculation logic
- Missing context → Review summarization function

---

## ✨ Success Indicators

Your optimization is working if:
1. ✅ Responses are concise (2-4 bullets)
2. ✅ All numbers use ৳ symbol
3. ✅ Every response has a suggestion
4. ✅ No UI action recommendations
5. ✅ Token usage < 1200 per query
6. ✅ Responses are relevant and accurate
7. ✅ Response time < 5 seconds
8. ✅ Cost per query < $0.01

**All green? You're optimized! 🎉**
