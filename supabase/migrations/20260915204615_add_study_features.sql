/*
# Add study tracking, notes, and bookmarks to lessons

1. Modified Tables
- `lessons` gains `study_status` (text: new / in_progress / completed, default 'new') for tracking where the learner is.
- `lessons` gains `notes` (text, default '') for personal study notes attached to each lesson.
- `lessons` gains `bookmarked` (boolean, default false) for quick-access bookmarking.
- `lessons` gains `progress` (integer, default 0) for percentage-based progress (0-100).

2. Security
- No policy changes; existing anon/authenticated CRUD policies already cover these columns.
- All new columns are user-editable in this single-tenant workspace.

3. Important Notes
- All changes are additive (ALTER TABLE ADD COLUMN); no data is lost.
- Existing lessons get sensible defaults: status 'new', empty notes, not bookmarked, 0% progress.
*/

ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS study_status text NOT NULL DEFAULT 'new' CHECK (study_status IN ('new', 'in_progress', 'completed'));
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS bookmarked boolean NOT NULL DEFAULT false;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);