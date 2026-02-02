# Custom Email Implementation for LifeOS

## 🎯 Goal
Send branded emails from your own domain instead of using Supabase's default emails.

---

## ✅ **Recommended Solution: Custom SMTP with Supabase**

This is the easiest and most practical approach.

### **What You Need:**
1. A domain name (e.g., `n8nfiroz.site`)
2. An SMTP email service (I recommend **Resend** - free 3,000 emails/month)

---

## 📧 **Setup Guide: Using Resend with Supabase**

### **Step 1: Sign Up for Resend**

1. Go to https://resend.com
2. Sign up for free account
3. Verify your domain or use their testing domain

### **Step 2: Get SMTP Credentials**

1. In Resend dashboard, go to **API Keys**
2. Create new API key
3. Copy the key (format: `re_xxxxxxxxxxxx`)

For SMTP, Resend uses:
- **Host**: `smtp.resend.com`
- **Port**: `587`
- **Username**: `resend`
- **Password**: Your API key

### **Step 3: Configure Supabase**

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Project Settings** → **Auth**
3. Scroll to **SMTP Settings**
4. Click **Enable Custom SMTP**
5. Enter:
   ```
   Host: smtp.resend.com
   Port: 587
   Username: resend
   Password: re_your_api_key_here
   Sender email: noreply@yourdomain.com (or onboarding@resend.dev for testing)
   Sender name: LifeOS
   ```
6. Click **Save**

### **Step 4: Customize Email Templates**

1. Go to **Authentication** → **Email Templates**
2. Click **Confirm signup**
3. Customize:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your email - LifeOS</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
      <div style="background-color: #ffffff; width: 60px; height: 60px; border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 32px;">🛒</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Welcome to LifeOS!</h1>
    </div>

    <!-- Body -->
    <div style="padding: 40px 20px;">
      <p style="font-size: 16px; line-height: 24px; color: #374151; margin: 0 0 20px;">
        Hi there! 👋
      </p>
      <p style="font-size: 16px; line-height: 24px; color: #374151; margin: 0 0 20px;">
        Thank you for signing up for <strong>LifeOS</strong> - your personal financial management system.
      </p>
      <p style="font-size: 16px; line-height: 24px; color: #374151; margin: 0 0 30px;">
        Click the button below to confirm your email address and start managing your finances:
      </p>

      <!-- Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" 
           style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);">
          Confirm Email Address
        </a>
      </div>

      <!-- Alternative Link -->
      <p style="font-size: 14px; line-height: 20px; color: #6b7280; margin: 30px 0 0; text-align: center;">
        Or copy and paste this link into your browser:<br>
        <a href="{{ .ConfirmationURL }}" style="color: #10b981; word-break: break-all;">{{ .ConfirmationURL }}</a>
      </p>

      <!-- Expiry Notice -->
      <div style="margin-top: 30px; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <p style="font-size: 14px; line-height: 20px; color: #92400e; margin: 0;">
          ⏰ This link will expire in 24 hours.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 14px; color: #6b7280; margin: 0 0 10px;">
        You're receiving this email because you signed up for LifeOS.
      </p>
      <p style="font-size: 14px; color: #6b7280; margin: 0;">
        <strong>LifeOS</strong> - Manage Your Financial Life<br>
        <a href="https://shop.n8nfiroz.site" style="color: #10b981; text-decoration: none;">shop.n8nfiroz.site</a>
      </p>
    </div>
  </div>
</body>
</html>
```

4. Update **Subject** to: `Confirm your LifeOS account 🎉`

5. Repeat for other templates:
   - **Password Reset**
   - **Magic Link**
   - **Change Email**

---

## 🎨 **Template Variables Available**

Use these in your custom templates:

**Confirmation Email:**
- `{{ .ConfirmationURL }}` - The confirmation link
- `{{ .Token }}` - The raw token
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your site URL

**Password Reset:**
- `{{ .ConfirmationURL }}` - Password reset link
- `{{ .Token }}` - The raw token
- `{{ .TokenHash }}` - Hashed token

**Magic Link:**
- `{{ .ConfirmationURL }}` - Magic link URL
- `{{ .Token }}` - The raw token

---

## 🚀 **Advanced: Completely Custom Email System**

If you want TOTAL control, you can disable Supabase emails and handle them yourself.

### **Step 1: Disable Supabase Email Confirmation**

1. **Supabase Dashboard** → **Authentication** → **Providers**
2. Under **Email**, toggle OFF **Confirm email**

### **Step 2: Install Email Service**

```bash
npm install resend
```

### **Step 3: Create Email Service**

Create `lib/email-service.ts`:

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(email: string, confirmUrl: string) {
  try {
    await resend.emails.send({
      from: 'LifeOS <noreply@yourdomain.com>',
      to: email,
      subject: 'Confirm your LifeOS account 🎉',
      html: `
        <h2>Welcome to LifeOS!</h2>
        <p>Click to confirm your email:</p>
        <a href="${confirmUrl}">Confirm Email</a>
      `
    });
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}
```

### **Step 4: Update Signup Flow**

Modify `app/login/page.tsx`:

```typescript
const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setError(null);

  try {
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${baseUrl}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsLoading(false);
      return;
    }

    // Send custom welcome email
    if (data.user) {
      await fetch('/api/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: data.user.email,
          userId: data.user.id 
        }),
      });
    }

    alert("Check your email to confirm your account!");
    setIsLoading(false);
  } catch (err) {
    setError("An unexpected error occurred. Please try again.");
    setIsLoading(false);
  }
};
```

---

## 💡 **Recommendation**

**For LifeOS, I recommend Option 2: Custom SMTP with Resend**

**Why?**
- ✅ Easy setup (10 minutes)
- ✅ Free for 3,000 emails/month
- ✅ Your own branding
- ✅ Professional emails from your domain
- ✅ No code changes needed
- ✅ Reliable delivery
- ✅ Still uses Supabase's secure token system

**Cost:**
- **Free tier**: 3,000 emails/month
- **Paid**: $20/month for 50,000 emails

---

## 📊 **Email Service Comparison**

| Provider | Free Tier | Cost | Setup Difficulty | Deliverability |
|----------|-----------|------|------------------|----------------|
| **Resend** | 3,000/mo | $20/50k | Easy | Excellent |
| **SendGrid** | 100/day | $15/40k | Medium | Excellent |
| **Mailgun** | 1,000/mo | $35/50k | Medium | Good |
| **AWS SES** | 3,000/mo | $0.10/1k | Hard | Excellent |
| **Postmark** | 100/mo | $15/10k | Easy | Excellent |

---

## 🎯 **Quick Setup Checklist**

- [ ] Sign up for Resend (or your preferred SMTP provider)
- [ ] Get SMTP credentials
- [ ] Configure Supabase SMTP settings
- [ ] Customize email templates (all 4 types)
- [ ] Test with a signup
- [ ] Verify domain (for production)
- [ ] Update sender email to your domain

---

## 🧪 **Testing Your Setup**

1. Create a test account on your app
2. Check your inbox for the confirmation email
3. Verify:
   - [ ] Email arrives within 1 minute
   - [ ] From address shows "LifeOS" or your brand
   - [ ] Email looks professional
   - [ ] Confirmation link works
   - [ ] Email doesn't go to spam

---

## 📧 **Email Template Best Practices**

1. **Mobile Responsive**: Use inline styles, max-width 600px
2. **Clear CTA**: Big, obvious confirmation button
3. **Expiry Notice**: Tell users link expires in 24h
4. **Alternative Link**: Include plain text URL
5. **Branding**: Logo, colors, consistent with your app
6. **Footer**: Company info, unsubscribe (for marketing emails)

---

## 🔒 **Security Notes**

1. **Never** expose your SMTP credentials in client code
2. Store SMTP credentials in environment variables
3. Use DNS records (SPF, DKIM) for better deliverability
4. Test emails before going to production
5. Monitor bounce rates and spam complaints

---

## ✨ **Result**

After setup, your users will receive:
- ✅ Professional emails from `noreply@yourdomain.com`
- ✅ LifeOS branding throughout
- ✅ Beautiful, mobile-responsive design
- ✅ Clear call-to-action buttons
- ✅ Trustworthy sender identity

**No more generic Supabase emails!** 🎉
