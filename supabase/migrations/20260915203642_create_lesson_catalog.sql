/*
# Create the single-tenant lesson catalog

1. New Tables
- `lessons` stores published lesson metadata, display artwork, file details, categories, format information, and publication status.
- `lessons.id` is the stable identifier used by the library and detail views.
- `lessons.title` and `lessons.description` contain the lesson's visible copy.
- `lessons.category`, `lessons.format`, `lessons.pages`, and `lessons.duration` power filtering and quick facts.
- `lessons.author`, `lessons.thumbnail_url`, `lessons.file_url`, `lessons.file_name`, and `lessons.file_size` describe the lesson and its downloadable material.
- `lessons.status`, `lessons.accent`, and `lessons.featured` control publication and visual presentation.
- `lessons.created_at` and `lessons.updated_at` track the catalog timeline.

2. Storage
- Create the public `lesson-files` bucket for intentionally public lesson materials.
- Allow the no-auth single-tenant app to manage objects in this bucket.

3. Security
- Enable row level security on `lessons`.
- Add separate anon/authenticated policies for SELECT, INSERT, UPDATE, and DELETE because this app has no sign-in screen and its catalog is intentionally shared.
- Add separate storage policies scoped to the `lesson-files` bucket.

4. Important Notes
- This is a single-tenant publishing workspace as requested; there is no account boundary yet.
- The table is designed so authentication and role-based access can be added later without changing the lesson experience.
*/

CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  format text NOT NULL DEFAULT 'PDF',
  pages integer,
  duration text,
  author text NOT NULL DEFAULT 'You',
  thumbnail_url text,
  file_url text,
  file_name text,
  file_size bigint,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'processing')),
  accent text NOT NULL DEFAULT 'amber',
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read lessons" ON public.lessons;
CREATE POLICY "Public can read lessons" ON public.lessons FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can publish lessons" ON public.lessons;
CREATE POLICY "Public can publish lessons" ON public.lessons FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Public can edit lessons" ON public.lessons;
CREATE POLICY "Public can edit lessons" ON public.lessons FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can remove lessons" ON public.lessons;
CREATE POLICY "Public can remove lessons" ON public.lessons FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS lessons_created_at_idx ON public.lessons (created_at DESC);
CREATE INDEX IF NOT EXISTS lessons_category_idx ON public.lessons (category);
CREATE INDEX IF NOT EXISTS lessons_featured_idx ON public.lessons (featured) WHERE featured = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-files', 'lesson-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can read lesson files" ON storage.objects;
CREATE POLICY "Public can read lesson files" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'lesson-files');

DROP POLICY IF EXISTS "Public can upload lesson files" ON storage.objects;
CREATE POLICY "Public can upload lesson files" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'lesson-files');

DROP POLICY IF EXISTS "Public can update lesson files" ON storage.objects;
CREATE POLICY "Public can update lesson files" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'lesson-files') WITH CHECK (bucket_id = 'lesson-files');

DROP POLICY IF EXISTS "Public can delete lesson files" ON storage.objects;
CREATE POLICY "Public can delete lesson files" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'lesson-files');