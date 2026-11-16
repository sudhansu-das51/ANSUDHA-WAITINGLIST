# ANSUDHA — Supabase & Transactional Email Setup Guide

This guide explains how to connect your Supabase database and Resend transactional email service to the ANSUDHA Waiting List website.

---

## 1. Quick Supabase Setup (Database & Security)

1. **Create a Supabase Project**:
   - Go to [supabase.com](https://supabase.com) and create a free project (e.g. `ansudha-waitlist`).

2. **Execute the Database Schema**:
   - In your Supabase Dashboard, open the **SQL Editor** from the left navigation bar.
   - Open `supabase/schema.sql` from this repository, copy its entire contents, and paste into the Supabase SQL editor.
   - Click **Run**.
   - This creates:
     - `waitlist_registrations` table with unique constraint on `email`
     - Automatic duplicate prevention
     - Strict Row Level Security (RLS): anonymous users can only `INSERT`, subscriber PII cannot be read publicly
     - Automated `updated_at` trigger
     - `waitlist_summary` analytics view

3. **Get Your API Credentials**:
   - Go to **Project Settings** → **API**.
   - Copy:
     - **Project URL** (e.g., `https://your-project-ref.supabase.co`)
     - **anon / public key** (safe for client-side JavaScript)

4. **Add Credentials to the Frontend**:
   - Open `ansudha-waitlist/js/supabase.js`.
   - Replace the placeholders:
     ```javascript
     const SUPABASE_CONFIG = {
       url: 'https://YOUR_PROJECT_REF.supabase.co',
       anonKey: 'YOUR_ANON_PUBLIC_KEY',
       tableName: 'waitlist_registrations'
     };
     ```

---

## 2. Transactional Email Setup (Resend)

To send automated welcome confirmation and launch emails without exposing credentials to the browser, use the Supabase Edge Function provided in `supabase/functions/send-waitlist-email`.

1. **Sign Up for Resend**:
   - Create a free account at [resend.com](https://resend.com).
   - Generate an API Key (e.g., `re_123456789...`).
   - Verify your sending domain (e.g. `ansudha.com`) or test with Resend's onboarding address.

2. **Deploy the Supabase Edge Function**:
   - Install Supabase CLI locally if not already installed:
     ```bash
     npm install -g supabase
     ```
   - Login and link your project:
     ```bash
     supabase login
     supabase link --project-ref your-project-ref
     ```
   - Set secrets on Supabase:
     ```bash
     supabase secrets set RESEND_API_KEY=re_your_api_key_here
     supabase secrets set FROM_EMAIL="ANSUDHA <welcome@ansudha.com>"
     ```
   - Deploy the function:
     ```bash
     supabase functions deploy send-waitlist-email
     ```

3. **Automate via Database Webhook (Recommended)**:
   - In Supabase Dashboard → **Database** → **Webhooks**.
   - Click **Create Webhook**.
   - Name: `on_waitlist_signup`.
   - Table: `waitlist_registrations`.
   - Events: `INSERT`.
   - Webhook type: **Supabase Edge Function**.
   - Select: `send-waitlist-email`.
   - Method: `POST`.
   - Whenever someone registers, Supabase will automatically trigger the Edge Function to send them the confirmation email!

---

## 3. How Duplicate Registrations are Handled

- Postgres checks `UNIQUE INDEX ON lower(trim(email))`.
- If an email already exists in the database, Supabase returns error code `23505`.
- The frontend `js/supabase.js` and `js/main.js` gracefully intercept this and show an appreciative message:
  *"You're already on our waiting list! We have your details recorded and will notify you as soon as we launch."*
- No duplicate records will ever be created.

