# Email Templates Usage Guide

## 📧 Your Custom Email Templates

I've created **3 professional email templates** for LifeOS based on your original design!

All templates are located in: `email-templates/`

---

## 📁 Templates Created

### 1. **Email Confirmation** (`confirmation-email.html`)
- ✉️ Icon: Envelope
- Used when: Users sign up for a new account
- CTA: "Confirm Email Address"
- Expiry: 24 hours

### 2. **Password Reset** (`password-reset.html`)
- 🔐 Icon: Lock
- Used when: Users request password reset
- CTA: "Reset Password"
- Expiry: 1 hour
- **Extra:** Security warning notice

### 3. **Magic Link** (`magic-link.html`)
- ✨ Icon: Sparkles
- Used when: Users request passwordless sign-in
- CTA: "Sign In to LifeOS"
- Expiry: 1 hour

---

## ✨ What I Enhanced From Your Original

### Your Original Template Was Great! ✅
- Perfect branding colors
- Clean minimal design
- Professional typography
- Soft shadows and rounded corners

### I Added These Improvements:

#### 1. **Mobile Responsiveness** 📱
```css
@media only screen and (max-width: 480px) {
  /* Smaller fonts, full-width buttons, adjusted padding */
}
```

#### 2. **Email Client Compatibility** 📧
- Added charset and viewport meta tags
- Inline styles for better rendering
- MSO conditional comments for Outlook
- `!important` on critical color properties

#### 3. **Visual Elements** 🎨
- Added emoji icons (✉️, 🔐, ✨)
- Alternative plain-text link box
- Expiry warning with amber background
- Security notice (password reset only)

#### 4. **Better UX** ✅
- Alternative link for users who can't click buttons
- Clear expiry notices
- Help link in footer
- Improved spacing and hierarchy

#### 5. **Accessibility** ♿
- Better color contrast
- Clear font sizes
- Proper heading structure
- Descriptive link text

---

## 🚀 How to Use These Templates

### **Method 1: Via Supabase Dashboard (Easiest)**

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Navigate to your project

2. **Go to Email Templates**
   - Click **Authentication** → **Email Templates**

3. **Copy Each Template**
   
   **For Email Confirmation:**
   - Click **"Confirm signup"**
   - Copy contents from `email-templates/confirmation-email.html`
   - Paste into the template editor
   - Click **Save**
   
   **For Password Reset:**
   - Click **"Reset password"**
   - Copy contents from `email-templates/password-reset.html`
   - Paste into the template editor
   - Click **Save**
   
   **For Magic Link:**
   - Click **"Magic link"**
   - Copy contents from `email-templates/magic-link.html`
   - Paste into the template editor
   - Click **Save**

---

## 🎨 Customization Options

### **Change Colors**

Find and replace these values in all templates:

**Emerald Green (Primary):**
- Current: `#10b981`
- Replace with your color: `#yourcolor`

**Hover Green:**
- Current: `#059669`
- Replace with darker shade: `#yourdarkercolor`

**Background:**
- Current: `#f7f9fc` (light gray-blue)
- Replace with: `#yourbackground`

### **Change Logo Text**

Find this in each template:
```html
<div class="logo">LifeOS</div>
```

You can replace with an image:
```html
<img src="https://yourdomain.com/logo.png" alt="LifeOS" style="height: 40px; margin-bottom: 24px;">
```

### **Change Icons**

Replace the emoji icons:
```html
<div class="icon">✉️</div>  <!-- Email confirmation -->
<div class="icon">🔐</div>  <!-- Password reset -->
<div class="icon">✨</div>  <!-- Magic link -->
```

Or use images:
```html
<img src="https://yourdomain.com/icon.png" style="width: 48px; height: 48px;">
```

### **Change Footer Links**

Update the footer domain:
```html
Visit <a href="https://shop.n8nfiroz.site">shop.n8nfiroz.site</a>
```

### **Change Copyright**

Update the year and company name:
```html
&copy; 2026 LifeOS. All rights reserved.
```

---

## 📊 Template Variables Reference

### **Available in All Templates:**
- `{{ .ConfirmationURL }}` - The magic link/confirmation URL
- `{{ .Token }}` - Raw token (if needed)
- `{{ .TokenHash }}` - Hashed token (if needed)
- `{{ .SiteURL }}` - Your site URL from Supabase settings

### **Email-Specific Variables:**
- `{{ .Email }}` - User's email address (some templates)

---

## ✅ Pre-Launch Checklist

Before using in production:

- [ ] **Test all 3 templates** by signing up/resetting password
- [ ] **Check on mobile** - Open email on phone
- [ ] **Test different email clients:**
  - [ ] Gmail
  - [ ] Apple Mail
  - [ ] Outlook
  - [ ] Yahoo Mail
- [ ] **Verify links work** - Click all buttons
- [ ] **Check spam folder** - Ensure emails arrive in inbox
- [ ] **Update domain references** - Change `shop.n8nfiroz.site` if needed
- [ ] **Test expiry times** - Verify links expire as expected
- [ ] **Proofread all copy** - Check for typos
- [ ] **Verify branding** - Logo, colors match your app

---

## 🎯 Email Sending Flow

### **Email Confirmation Flow:**
```
1. User signs up
2. Supabase sends confirmation-email.html
3. User clicks "Confirm Email Address"
4. Redirects to /auth/callback
5. User is logged in
```

### **Password Reset Flow:**
```
1. User clicks "Forgot Password"
2. Supabase sends password-reset.html
3. User clicks "Reset Password"
4. Redirects to password reset page
5. User creates new password
```

### **Magic Link Flow:**
```
1. User enters email
2. Supabase sends magic-link.html
3. User clicks "Sign In to LifeOS"
4. Redirects to /auth/callback
5. User is logged in
```

---

## 🛠️ Advanced: Custom SMTP Setup

If you want emails from your own domain (recommended):

### **With Resend (Free 3,000/mo):**

1. Sign up at https://resend.com
2. Get API key (starts with `re_`)
3. In Supabase:
   - Go to **Project Settings** → **Auth**
   - Enable **Custom SMTP**
   - Enter:
     ```
     Host: smtp.resend.com
     Port: 587
     Username: resend
     Password: re_your_api_key
     Sender: noreply@n8nfiroz.site
     Name: LifeOS
     ```
4. Save templates as shown above
5. Test!

**Result:** Emails will come from `LifeOS <noreply@n8nfiroz.site>` instead of Supabase!

---

## 🎨 Design Comparison

### **Your Original Design:**
```
✅ Clean minimal layout
✅ Emerald green branding
✅ Pill-shaped button
✅ Professional footer
✅ Soft shadows
```

### **Enhanced Version Adds:**
```
✨ Mobile responsiveness
✨ Email client compatibility
✨ Visual icons
✨ Alternative link box
✨ Expiry warnings
✨ Security notices (password reset)
✨ Better accessibility
✨ Improved spacing
```

---

## 📱 Mobile Preview

All templates are **fully responsive**:

**Desktop (450px container):**
- Large fonts (24px heading)
- Generous padding (40px)
- Wide button

**Mobile (<480px):**
- Smaller fonts (22px heading)
- Compact padding (30px)
- Full-width button
- Optimized icon size

---

## 🔍 Testing Guide

### **Test Email Confirmation:**
```bash
1. Sign up with a new email
2. Check inbox for confirmation email
3. Verify design matches template
4. Click "Confirm Email Address"
5. Should redirect to your app and log in
```

### **Test Password Reset:**
```bash
1. Click "Forgot Password" on login
2. Enter email
3. Check inbox for reset email
4. Verify design and security notice
5. Click "Reset Password"
6. Should redirect to password reset page
```

### **Test Magic Link:**
```bash
1. Request magic link (if enabled)
2. Check inbox
3. Verify design
4. Click "Sign In to LifeOS"
5. Should log in automatically
```

---

## 🎯 Best Practices

### **Email Design:**
- ✅ Keep width under 600px (450px is perfect)
- ✅ Use inline CSS for email clients
- ✅ Include plain-text alternative links
- ✅ Test on multiple devices
- ✅ Avoid complex layouts
- ✅ Use web-safe fonts
- ✅ Include expiry notices

### **Content:**
- ✅ Clear, concise copy
- ✅ Obvious call-to-action
- ✅ Friendly tone
- ✅ Security information
- ✅ Contact/help link

### **Branding:**
- ✅ Consistent with app design
- ✅ Logo prominently displayed
- ✅ Brand colors throughout
- ✅ Professional footer

---

## 🚨 Common Issues & Fixes

### **Issue: Emails go to spam**
**Fix:** 
- Set up custom SMTP with your domain
- Add SPF and DKIM records
- Avoid spam trigger words

### **Issue: Button doesn't work in Outlook**
**Fix:** Templates include MSO fixes, but test in Outlook

### **Issue: Template looks broken on mobile**
**Fix:** Templates are responsive, but test on real devices

### **Issue: Links expire too quickly**
**Fix:** 
- Confirmation: 24 hours (Supabase default)
- Password/Magic: 1 hour (Supabase default)
- Cannot be changed via templates

---

## ✨ Summary

**You now have:**
- ✅ 3 professional, branded email templates
- ✅ Mobile responsive design
- ✅ Email client compatibility
- ✅ Security best practices
- ✅ Beautiful, modern aesthetic
- ✅ Perfect match with your LifeOS branding

**Your original design was excellent!** I just added the technical bits needed for production use. 🎉

---

## 📚 Additional Resources

- [Supabase Email Templates Docs](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Email Design Best Practices](https://www.campaignmonitor.com/css/)
- [Resend Documentation](https://resend.com/docs)
- [Email Testing Tools](https://litmus.com/)

Happy emailing! ✉️✨
