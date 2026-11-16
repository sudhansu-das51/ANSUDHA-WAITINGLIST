-- ==============================================================================
-- ANSUDHA — Heritage Waiting List
-- Database Setup & RLS Schema for Pre-Launch Waiting List
-- ==============================================================================

-- 1. Create the Waitlist Registrations Table
CREATE TABLE IF NOT EXISTS public.waitlist_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT,
    country_code VARCHAR(10) DEFAULT '+91',
    phone VARCHAR(25),
    source TEXT DEFAULT 'web_landing',
    status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'notified'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Constraints: Must provide at least one contact channel (Email or Mobile)
    CONSTRAINT waitlist_contact_required CHECK (
        (email IS NOT NULL AND trim(email) != '') OR 
        (phone IS NOT NULL AND trim(phone) != '')
    ),
    CONSTRAINT waitlist_email_format CHECK (
        email IS NULL OR email = '' OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    CONSTRAINT waitlist_name_length CHECK (char_length(trim(full_name)) >= 2)
);

-- 2. Create Unique Indexes (when provided) to Prevent Duplicate Registrations
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_unique_email 
ON public.waitlist_registrations (lower(trim(email)))
WHERE email IS NOT NULL AND trim(email) != '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_unique_phone 
ON public.waitlist_registrations (country_code, trim(phone))
WHERE phone IS NOT NULL AND trim(phone) != '';

-- 3. Create Index on Created Date for Sorting & Reporting
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at 
ON public.waitlist_registrations (created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.waitlist_registrations ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- A. Allow anyone (anonymous public visitor) to insert their registration
DROP POLICY IF EXISTS "Allow anonymous visitors to register for waitlist" ON public.waitlist_registrations;
CREATE POLICY "Allow anonymous visitors to register for waitlist"
ON public.waitlist_registrations
FOR INSERT
TO anon, authenticated
WITH CHECK (
    char_length(trim(full_name)) >= 2 AND
    (
        (email IS NOT NULL AND char_length(trim(email)) >= 5) OR
        (phone IS NOT NULL AND char_length(trim(phone)) >= 6)
    )
);

-- B. Disallow public reading (SELECT) to protect subscriber privacy & personal data
DROP POLICY IF EXISTS "Disallow public read on waitlist" ON public.waitlist_registrations;
CREATE POLICY "Disallow public read on waitlist"
ON public.waitlist_registrations
FOR SELECT
TO anon
USING (false);

-- C. Full access for Service Role (used by Edge Functions, Admin dashboards, and exports)
DROP POLICY IF EXISTS "Service role full access on waitlist" ON public.waitlist_registrations;
CREATE POLICY "Service role full access on waitlist"
ON public.waitlist_registrations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 6. Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_waitlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_waitlist_updated_at ON public.waitlist_registrations;
CREATE TRIGGER trg_waitlist_updated_at
BEFORE UPDATE ON public.waitlist_registrations
FOR EACH ROW
EXECUTE FUNCTION public.handle_waitlist_updated_at();

-- 7. Helpful Views for Admin Analytics
CREATE OR REPLACE VIEW public.waitlist_summary AS
SELECT 
    COUNT(*) as total_subscribers,
    COUNT(CASE WHEN country_code = '+91' THEN 1 END) as domestic_subscribers,
    COUNT(CASE WHEN country_code != '+91' THEN 1 END) as international_subscribers,
    DATE(MIN(created_at)) as first_registration,
    DATE(MAX(created_at)) as latest_registration
FROM public.waitlist_registrations;

COMMENT ON TABLE public.waitlist_registrations IS 'Stores pre-launch waitlist registrations for ANSUDHA.';

-- 8. Create the Waitlist OTPs Verification Table
CREATE TABLE IF NOT EXISTS public.waitlist_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact TEXT NOT NULL, -- normalized email (lowercase) or full phone (e.g. +919876543210)
    channel TEXT NOT NULL, -- 'email' or 'sms'
    otp_code TEXT NOT NULL, -- 4-digit code
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT false,
    attempts INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_waitlist_otps_contact 
ON public.waitlist_otps (contact, created_at DESC);

ALTER TABLE public.waitlist_otps ENABLE ROW LEVEL SECURITY;

-- Allow anon visitors to insert and verify OTPs
DROP POLICY IF EXISTS "Allow anonymous to insert waitlist otps" ON public.waitlist_otps;
CREATE POLICY "Allow anonymous to insert waitlist otps"
ON public.waitlist_otps
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous to select waitlist otps" ON public.waitlist_otps;
CREATE POLICY "Allow anonymous to select waitlist otps"
ON public.waitlist_otps
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow anonymous to update waitlist otps" ON public.waitlist_otps;
CREATE POLICY "Allow anonymous to update waitlist otps"
ON public.waitlist_otps
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on waitlist otps" ON public.waitlist_otps;
CREATE POLICY "Service role full access on waitlist otps"
ON public.waitlist_otps
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON TABLE public.waitlist_otps IS 'Stores 4-digit OTP verification codes for email and SMS validation.';

