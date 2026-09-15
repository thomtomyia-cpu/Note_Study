import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  Bookmark,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Filter,
  Grid2X2,
  Layers3,
  Library,
  Loader2,
  Menu,
  MoreHorizontal,
  NotebookPen,
  Play,
  Plus,
  Search,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getPdfPageCount, isPdfUrl, renderPdfPage, renderPdfPages } from '@/lib/pdf';

type StudyStatus = 'new' | 'in_progress' | 'completed';

type Lesson = {
  id: string;
  title: string;
  description: string;
  category: string;
  format: string;
  pages: number | null;
  duration: string | null;
  author: string;
  thumbnail_url: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  status: 'draft' | 'published' | 'processing';
  accent: string;
  featured: boolean;
  created_at: string;
  study_status: StudyStatus;
  notes: string;
  bookmarked: boolean;
  progress: number;
};

type LessonForm = {
  title: string;
  description: string;
  category: string;
  format: string;
  pages: string;
  duration: string;
  author: string;
};

const demoLessons: Lesson[] = [
  {
    id: 'demo-1',
    title: 'The Architecture of Attention',
    description: 'A visual field guide to designing work that holds attention and moves people forward.',
    category: 'Creative direction',
    format: 'PDF',
    pages: 42,
    duration: '18 min read',
    author: 'Mara Studio',
    thumbnail_url: null,
    file_url: null,
    file_name: null,
    file_size: null,
    status: 'published',
    accent: 'gold',
    featured: true,
    created_at: '2026-09-12T10:00:00Z',
    study_status: 'new',
    notes: '',
    bookmarked: false,
    progress: 0,
  },
  {
    id: 'demo-2',
    title: 'Notes on Visual Systems',
    description: 'A compact editorial toolkit for building systems with clarity, rhythm and character.',
    category: 'Design systems',
    format: 'PDF',
    pages: 28,
    duration: '12 min read',
    author: 'Mara Studio',
    thumbnail_url: null,
    file_url: null,
    file_name: null,
    file_size: null,
    status: 'published',
    accent: 'ink',
    featured: false,
    created_at: '2026-09-09T10:00:00Z',
    study_status: 'new',
    notes: '',
    bookmarked: false,
    progress: 0,
  },
  {
    id: 'demo-3',
    title: 'A Field Guide to Better Questions',
    description: 'Prompts and exercises for going beneath the obvious and finding the useful signal.',
    category: 'Thinking tools',
    format: 'Workbook',
    pages: 16,
    duration: '24 min read',
    author: 'Mara Studio',
    thumbnail_url: null,
    file_url: null,
    file_name: null,
    file_size: null,
    status: 'published',
    accent: 'coral',
    featured: false,
    created_at: '2026-09-04T10:00:00Z',
    study_status: 'new',
    notes: '',
    bookmarked: false,
    progress: 0,
  },
  {
    id: 'demo-4',
    title: 'Material & Meaning',
    description: 'How texture, contrast and restraint make an idea feel tangible.',
    category: 'Creative direction',
    format: 'Lecture',
    pages: 21,
    duration: '31 min watch',
    author: 'Mara Studio',
    thumbnail_url: null,
    file_url: null,
    file_name: null,
    file_size: null,
    status: 'published',
    accent: 'olive',
    featured: false,
    created_at: '2026-08-28T10:00:00Z',
    study_status: 'new',
    notes: '',
    bookmarked: false,
    progress: 0,
  },
];

const categories = ['All lessons', 'Creative direction', 'Design systems', 'Thinking tools', 'Inspiration'];
const initialForm: LessonForm = {
  title: '',
  description: '',
  category: 'Creative direction',
  format: 'PDF',
  pages: '',
  duration: '',
  author: 'You',
};

function formatSize(bytes: number | null): string {
  if (!bytes) return 'No file yet';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isDemo(id: string): boolean {
  return id.startsWith('demo-');
}

function App() {
  const [lessons, setLessons] = useState<Lesson[]>(demoLessons);
  const [activeCategory, setActiveCategory] = useState('All lessons');
  const [activeNav, setActiveNav] = useState('Library');
  const [query, setQuery] = useState('');
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<LessonForm>(initialForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadLessons() {
      const { data, error: loadError } = await supabase
        .from('lessons')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (active && !loadError && data && data.length > 0) setLessons(data as Lesson[]);
      if (active) setIsLoading(false);
    }
    void loadLessons();
    return () => {
      active = false;
    };
  }, []);

  const visibleLessons = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();
    return lessons.filter((lesson) => {
      const matchesCategory = activeCategory === 'All lessons' || lesson.category === activeCategory;
      const matchesQuery = !normalizedQuery || `${lesson.title} ${lesson.description} ${lesson.category}`.toLowerCase().includes(normalizedQuery);
      const matchesNav =
        activeNav === 'Library' ? true :
        activeNav === 'My uploads' ? lesson.author === 'You' :
        activeNav === 'Bookmarked' ? lesson.bookmarked :
        activeNav === 'In progress' ? lesson.study_status === 'in_progress' :
        true;
      return matchesCategory && matchesQuery && matchesNav;
    });
  }, [activeCategory, activeNav, lessons, query]);

  const featuredLesson = lessons.find((lesson) => lesson.featured) ?? lessons[0];
  const inProgressLessons = lessons.filter((l) => l.study_status === 'in_progress');
  const bookmarkCount = lessons.filter((l) => l.bookmarked).length;

  function updateForm(field: keyof LessonForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file && !form.title) updateForm('title', file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    if (file && file.type === 'application/pdf') updateForm('format', 'PDF');
    if (file && file.type.startsWith('video/')) updateForm('format', 'Video');
  }

  async function updateLessonState(id: string, updates: Partial<Lesson>) {
    setLessons((current) => current.map((l) => (l.id === id ? { ...l, ...updates } : l)));
    if (activeLesson && activeLesson.id === id) setActiveLesson((prev) => prev ? { ...prev, ...updates } : prev);
    if (isDemo(id)) return;
    try {
      await supabase.from('lessons').update(updates).eq('id', id);
    } catch (cause) {
      console.error('lesson update failed', cause);
    }
  }

  async function toggleBookmark(lesson: Lesson) {
    updateLessonState(lesson.id, { bookmarked: !lesson.bookmarked });
    setMessage(!lesson.bookmarked ? 'Bookmarked for later' : 'Removed bookmark');
    window.setTimeout(() => setMessage(''), 2400);
  }

  async function setStudyStatus(lesson: Lesson, status: StudyStatus) {
    const progress = status === 'completed' ? 100 : status === 'in_progress' ? (lesson.progress || 5) : 0;
    updateLessonState(lesson.id, { study_status: status, progress });
    setMessage(status === 'completed' ? 'Lesson marked as complete' : status === 'in_progress' ? 'Lesson started' : 'Reset to new');
    window.setTimeout(() => setMessage(''), 2400);
  }

  async function saveNotes(lesson: Lesson, notes: string) {
    updateLessonState(lesson.id, { notes });
  }

  async function setProgress(lesson: Lesson, progress: number) {
    const status: StudyStatus = progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : 'new';
    updateLessonState(lesson.id, { progress, study_status: status });
  }

  async function handlePublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) return;
    setIsSaving(true);
    setError('');
    try {
      let fileUrl: string | null = null;
      let fileName: string | null = selectedFile?.name ?? null;
      let fileSize: number | null = selectedFile?.size ?? null;

      if (selectedFile) {
        const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '-');
        const path = `${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from('lesson-files').upload(path, selectedFile, { upsert: false });
        if (uploadError) throw uploadError;
        const { data: publicFile } = supabase.storage.from('lesson-files').getPublicUrl(path);
        fileUrl = publicFile.publicUrl;
      }

      const { data, error: insertError } = await supabase
        .from('lessons')
        .insert({
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
          format: form.format,
          pages: form.pages ? Number(form.pages) : null,
          duration: form.duration.trim() || null,
          author: form.author.trim() || 'You',
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
          status: 'published',
          accent: 'gold',
          featured: false,
          study_status: 'new',
          notes: '',
          bookmarked: false,
          progress: 0,
        })
        .select()
        .maybeSingle();
      if (insertError || !data) throw insertError ?? new Error('Missing lesson');
      setLessons((current) => [data as Lesson, ...current]);
      setForm(initialForm);
      setSelectedFile(null);
      setIsPublishOpen(false);
      setMessage('Lesson published to your library');
      window.setTimeout(() => setMessage(''), 3200);
    } catch (cause) {
      console.error('lesson publish failed', cause);
      setError('We could not publish this lesson. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark"><Sparkles size={17} strokeWidth={2.2} /></div>
        <div className="brand-copy"><span>mara</span><small>LEARNING STUDIO</small></div>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={activeNav === 'Library' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveNav('Library')}><Library size={18} /> Library <span className="nav-count">{lessons.length}</span></button>
          <button className={activeNav === 'In progress' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveNav('In progress')}><Clock3 size={18} /> In progress {inProgressLessons.length > 0 && <span className="nav-count accent">{inProgressLessons.length}</span>}</button>
          <button className={activeNav === 'Bookmarked' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveNav('Bookmarked')}><Bookmark size={18} /> Bookmarked {bookmarkCount > 0 && <span className="nav-count accent">{bookmarkCount}</span>}</button>
          <button className={activeNav === 'My uploads' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveNav('My uploads')}><UploadCloud size={18} /> My uploads</button>
        </nav>
        <div className="side-rule" />
        <div className="sidebar-label">Your space</div>
        <button className="nav-item subtle" onClick={() => setIsPublishOpen(true)}><Plus size={18} /> Publish a lesson</button>
        <div className="sidebar-bottom">
          <div className="mini-profile"><div className="avatar">MS</div><div><strong>Mara Studio</strong><span>Creator workspace</span></div><MoreHorizontal size={17} /></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand"><div className="brand-mark"><Sparkles size={16} /></div><strong>mara</strong></div>
          <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>{activeNav}</strong></div>
          <div className="topbar-actions"><div className="top-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search lessons" /></div><button className="icon-button mobile-menu"><Menu size={19} /></button><button className="publish-button" onClick={() => setIsPublishOpen(true)}><Plus size={17} /> Publish <span>lesson</span></button></div>
        </header>

        <div className="content-wrap">
          <section className="intro-row">
            <div><div className="eyebrow"><span className="eyebrow-dot" /> The open library</div><h1>Ideas worth<br /><em>keeping.</em></h1><p className="intro-copy">A considered collection of lessons, notes and references for curious people making meaningful things.</p></div>
            <div className="intro-meta"><span>EST. 2024</span><span className="meta-line" /><span>{lessons.length} PUBLISHED LESSONS</span></div>
          </section>

          {inProgressLessons.length > 0 && activeNav === 'Library' && (
            <section className="continue-section">
              <div className="section-kicker"><Clock3 size={13} /> Continue studying</div>
              <div className="continue-row">
                {inProgressLessons.slice(0, 3).map((lesson) => (
                  <button key={lesson.id} className="continue-card" onClick={() => setActiveLesson(lesson)}>
                    <div className={`continue-cover art-${lesson.accent}`}>
                      <div className="continue-progress-bar"><div style={{ width: `${lesson.progress}%` }} /></div>
                    </div>
                    <div className="continue-info">
                      <strong>{lesson.title}</strong>
                      <span>{lesson.progress}% complete</span>
                    </div>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              </div>
            </section>
          )}

          {featuredLesson && activeNav === 'Library' && (
            <section className="feature-card" onClick={() => setActiveLesson(featuredLesson)}>
              <div className={`feature-art art-${featuredLesson.accent}`}><div className="art-orb orb-one" /><div className="art-orb orb-two" /><div className="art-grid" /><div className="feature-doc"><span>FIELD NOTE 01</span><strong>THE<br />ARCHITECTURE<br /><i>OF ATTENTION</i></strong><small>MARA / 2026</small></div><div className="art-caption">A FIELD GUIDE TO<br />SEEING CLEARLY</div></div>
              <div className="feature-copy"><div className="section-kicker">Featured lesson <ArrowUpRight size={15} /></div><h2>{featuredLesson.title}</h2><p>{featuredLesson.description}</p><div className="feature-details"><span><FileText size={15} /> {featuredLesson.format}</span><span><BookOpen size={15} /> {featuredLesson.pages ?? '—'} pages</span><span><Clock3 size={15} /> {featuredLesson.duration ?? 'Self-paced'}</span></div><button className="text-button">Open lesson <ArrowUpRight size={16} /></button></div>
            </section>
          )}

          <section className="library-section">
            <div className="section-heading"><div><div className="eyebrow muted">Explore the archive</div><h2>{activeNav === 'Bookmarked' ? 'Bookmarked lessons' : activeNav === 'In progress' ? 'In progress' : 'All lessons'}</h2></div><div className="view-actions"><button className="filter-button"><Filter size={15} /> Filter</button><button className="view-button active"><Grid2X2 size={16} /></button></div></div>
            <div className="category-row">{categories.map((category) => <button key={category} className={activeCategory === category ? 'category-pill active' : 'category-pill'} onClick={() => setActiveCategory(category)}>{category}</button>)}</div>
            {isLoading ? <div className="empty-state">Loading the library…</div> : visibleLessons.length > 0 ? <div className="lesson-grid">{visibleLessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} onOpen={() => setActiveLesson(lesson)} onBookmark={() => toggleBookmark(lesson)} />)}</div> : <div className="empty-state"><Search size={21} /><span>{activeNav === 'Bookmarked' ? 'No bookmarked lessons yet.' : activeNav === 'In progress' ? 'No lessons in progress.' : 'No lessons match that search.'}</span><button onClick={() => { setQuery(''); setActiveCategory('All lessons'); setActiveNav('Library'); }}>Back to library</button></div>}
          </section>
        </div>
      </main>

      {message && <div className="toast"><span className="toast-check"><Check size={14} /></span>{message}</div>}
      {activeLesson && (
        <LessonModal
          lesson={activeLesson}
          onClose={() => setActiveLesson(null)}
          onBookmark={() => toggleBookmark(activeLesson)}
          onSetStatus={(status) => setStudyStatus(activeLesson, status)}
          onSaveNotes={(notes) => saveNotes(activeLesson, notes)}
          onSetProgress={(progress) => setProgress(activeLesson, progress)}
        />
      )}
      {isPublishOpen && <PublishModal form={form} selectedFile={selectedFile} isSaving={isSaving} error={error} onClose={() => { setIsPublishOpen(false); setError(''); }} onSubmit={handlePublish} onChange={updateForm} onFileChange={handleFileChange} />}
    </div>
  );
}

function LessonCard({ lesson, onOpen, onBookmark }: { lesson: Lesson; onOpen: () => void; onBookmark: () => void }) {
  return (
    <article className="lesson-card" onClick={onOpen}>
      <div className={`lesson-cover art-${lesson.accent}`}>
        <div className="cover-noise" />
        <div className="cover-top">
          <span>{lesson.format}</span>
          <span>{lesson.pages ? `${lesson.pages} P.` : 'LESSON'}</span>
        </div>
        {lesson.study_status !== 'new' && (
          <div className="cover-progress">
            <div className="cover-progress-bar" style={{ width: `${lesson.progress}%` }} />
          </div>
        )}
        {lesson.bookmarked && <Bookmark size={14} fill="currentColor" className="cover-bookmark" />}
        {lesson.notes && <NotebookPen size={13} className="cover-notes-icon" />}
        <div className="cover-title">{lesson.title}</div>
        <div className="cover-footer"><span>{lesson.category}</span><ArrowUpRight size={15} /></div>
        <PdfHoverPreview lesson={lesson} />
      </div>
      <div className="lesson-card-info">
        <div>
          <h3>{lesson.title}</h3>
          <p>{lesson.description}</p>
        </div>
        <button className="bookmark-toggle" onClick={(e) => { e.stopPropagation(); onBookmark(); }} aria-label="Bookmark">
          <Bookmark size={15} fill={lesson.bookmarked ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="lesson-card-meta">
        <span>{lesson.author}</span>
        <span className="meta-right">
          {lesson.study_status === 'completed' && <><Check size={11} /> Completed</>}
          {lesson.study_status === 'in_progress' && <><Clock3 size={11} /> {lesson.progress}%</>}
          {lesson.study_status === 'new' && (lesson.duration ?? formatSize(lesson.file_size))}
        </span>
      </div>
    </article>
  );
}

function PdfHoverPreview({ lesson }: { lesson: Lesson }) {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);

  const canPreview = isPdfUrl(lesson.file_url);

  useEffect(() => {
    if (!canPreview) return;
    let cancelled = false;
    async function loadPreview() {
      if (loaded || cancelled) return;
      setLoading(true);
      try {
        if (!lesson.file_url) return;
        const count = await getPdfPageCount(lesson.file_url);
        const pagesToRender = Math.min(count, 6);
        const pageNumbers = Array.from({ length: pagesToRender }, (_, i) => i + 1);
        const rendered = await renderPdfPages(lesson.file_url, pageNumbers, 0.35);
        if (!cancelled) {
          setPages(rendered);
          setLoaded(true);
        }
      } catch (cause) {
        console.error('preview load failed', cause);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const timer = window.setTimeout(loadPreview, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canPreview, lesson.file_url, loaded]);

  useEffect(() => {
    if (!loaded || pages.length <= 1) return;
    const el = scrollRef.current;
    if (!el) return;
    let dir = 1;
    let pos = 0;
    const max = el.scrollHeight - el.clientHeight;
    const tick = () => {
      pos += dir * 0.6;
      if (pos >= max) { dir = -1; pos = max; }
      if (pos <= 0) { dir = 1; pos = 0; }
      el.scrollTop = pos;
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [loaded, pages.length]);

  if (!canPreview) {
    return (
      <div className="hover-preview">
        <div className="preview-play"><Play size={16} fill="currentColor" /></div>
        <strong>Preview lesson</strong>
        <span>Hover to explore</span>
      </div>
    );
  }

  return (
    <div className="hover-preview" ref={containerRef}>
      {loading && !loaded && (
        <div className="preview-loading">
          <Loader2 size={20} className="spin" />
          <span>Loading preview…</span>
        </div>
      )}
      {loaded && pages.length > 0 && (
        <div className="preview-pages" ref={scrollRef}>
          {pages.map((src, i) => (
            <img key={i} src={src} alt={`Page ${i + 1}`} className="preview-page-img" />
          ))}
        </div>
      )}
      {loaded && (
        <div className="preview-badge">
          <FileText size={11} /> {pages.length} pages
        </div>
      )}
    </div>
  );
}

function LessonModal({
  lesson,
  onClose,
  onBookmark,
  onSetStatus,
  onSaveNotes,
  onSetProgress,
}: {
  lesson: Lesson;
  onClose: () => void;
  onBookmark: () => void;
  onSetStatus: (status: StudyStatus) => void;
  onSaveNotes: (notes: string) => void;
  onSetProgress: (progress: number) => void;
}) {
  const [notes, setNotes] = useState(lesson.notes);
  const [notesSaved, setNotesSaved] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewMode, setViewMode] = useState<'details' | 'reader' | 'notes'>('details');

  useEffect(() => {
    setNotes(lesson.notes);
  }, [lesson.id, lesson.notes]);

  const handleNotesChange = useCallback((value: string) => {
    setNotes(value);
    setNotesSaved(false);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      onSaveNotes(value);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 1800);
    }, 800);
  }, [onSaveNotes]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="lesson-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={18} /></button>

        {viewMode === 'reader' && isPdfUrl(lesson.file_url) && lesson.file_url && (
          <PdfReader url={lesson.file_url} lesson={lesson} onSetProgress={onSetProgress} onBack={() => setViewMode('details')} />
        )}

        {viewMode !== 'reader' && (
          <>
            <div className={`modal-art art-${lesson.accent}`}>
              <div className="art-orb orb-one" />
              <div className="art-orb orb-two" />
              <div className="modal-doc">
                <span>{lesson.format} / {lesson.category}</span>
                <strong>{lesson.title}</strong>
                <small>BY {lesson.author.toUpperCase()}</small>
              </div>
              {lesson.study_status !== 'new' && (
                <div className="modal-progress-badge">
                  {lesson.study_status === 'completed' ? <><Check size={12} /> Completed</> : <><Clock3 size={12} /> {lesson.progress}%</>}
                </div>
              )}
            </div>
            <div className="modal-content">
              <div className="modal-tabs">
                <button className={viewMode === 'details' ? 'modal-tab active' : 'modal-tab'} onClick={() => setViewMode('details')}>Details</button>
                {isPdfUrl(lesson.file_url) && lesson.file_url && (
                  <button className={viewMode === 'reader' ? 'modal-tab active' : 'modal-tab'} onClick={() => setViewMode('reader')}><BookOpen size={14} /> Read</button>
                )}
                <button className={viewMode === 'notes' ? 'modal-tab active' : 'modal-tab'} onClick={() => setViewMode('notes')}><NotebookPen size={14} /> Notes</button>
              </div>

              {viewMode === 'details' && (
                <>
                  <div className="section-kicker">Lesson details <ArrowUpRight size={15} /></div>
                  <h2>{lesson.title}</h2>
                  <p>{lesson.description}</p>
                  <div className="modal-stats">
                    <div><span>FORMAT</span><strong>{lesson.format}</strong></div>
                    <div><span>LENGTH</span><strong>{lesson.pages ? `${lesson.pages} pages` : lesson.duration ?? 'Self-paced'}</strong></div>
                    <div><span>AUTHOR</span><strong>{lesson.author}</strong></div>
                  </div>

                  {lesson.study_status !== 'new' && (
                    <div className="modal-progress-section">
                      <div className="modal-progress-label">
                        <span>Your progress</span>
                        <strong>{lesson.progress}%</strong>
                      </div>
                      <div className="modal-progress-track">
                        <div className="modal-progress-fill" style={{ width: `${lesson.progress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="modal-actions">
                    {lesson.file_url ? (
                      <a className="download-button" href={lesson.file_url} target="_blank" rel="noreferrer">
                        <ArrowDownToLine size={17} /> Download lesson
                      </a>
                    ) : (
                      <button className="download-button" onClick={() => {}}>
                        Preview available soon <ArrowUpRight size={17} />
                      </button>
                    )}
                    <button className="ghost-button" onClick={onBookmark}>
                      <Bookmark size={16} fill={lesson.bookmarked ? 'currentColor' : 'none'} />
                      {lesson.bookmarked ? 'Bookmarked' : 'Bookmark'}
                    </button>
                  </div>

                  <div className="study-controls">
                    <div className="study-label">Study status</div>
                    <div className="study-buttons">
                      <button
                        className={lesson.study_status === 'new' ? 'study-btn active' : 'study-btn'}
                        onClick={() => onSetStatus('new')}
                      >New</button>
                      <button
                        className={lesson.study_status === 'in_progress' ? 'study-btn active' : 'study-btn'}
                        onClick={() => onSetStatus('in_progress')}
                      >In progress</button>
                      <button
                        className={lesson.study_status === 'completed' ? 'study-btn active' : 'study-btn'}
                        onClick={() => onSetStatus('completed')}
                      >Completed</button>
                    </div>
                  </div>
                </>
              )}

              {viewMode === 'notes' && (
                <div className="notes-section">
                  <div className="notes-header">
                    <div className="section-kicker"><NotebookPen size={14} /> Your study notes</div>
                    {notesSaved && <span className="notes-saved"><Check size={13} /> Saved</span>}
                  </div>
                  <p className="notes-hint">Write down key takeaways, questions, or reminders. Notes save automatically.</p>
                  <textarea
                    className="notes-textarea"
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Start writing your notes…"
                    rows={10}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PdfReader({ url, lesson, onSetProgress, onBack }: { url: string; lesson: Lesson; onSetProgress: (progress: number) => void; onBack: () => void; }) {
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageImages, setPageImages] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const count = await getPdfPageCount(url);
        if (cancelled) return;
        setPageCount(count);
        const initialPages = Math.min(count, 3);
        const rendered = await renderPdfPages(url, Array.from({ length: initialPages }, (_, i) => i + 1), 1.1);
        if (cancelled) return;
        const newMap = new Map<number, string>();
        rendered.forEach((src, i) => newMap.set(i + 1, src));
        setPageImages(newMap);
        setLoading(false);
      } catch (cause) {
        console.error('reader init failed', cause);
        setLoading(false);
      }
    }
    void init();
    return () => { cancelled = true; };
  }, [url]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || loading) return;
    const handler = () => {
      const pageHeight = el.scrollHeight / pageCount;
      const page = Math.min(Math.ceil((el.scrollTop + el.clientHeight * 0.3) / pageHeight), pageCount);
      setCurrentPage(page);
      const progress = Math.round((page / pageCount) * 100);
      if (progress !== lesson.progress) onSetProgress(progress);
    };
    el.addEventListener('scroll', handler);
    return () => el.removeEventListener('scroll', handler);
  }, [loading, pageCount, lesson.progress, onSetProgress]);

  async function renderMore(upTo: number) {
    if (rendering || upTo <= pageImages.size) return;
    setRendering(true);
    try {
      const toRender = [];
      for (let i = pageImages.size + 1; i <= Math.min(upTo, pageCount); i++) toRender.push(i);
      if (toRender.length === 0) return;
      const rendered = await renderPdfPages(url, toRender, 1.1);
      setPageImages((prev) => {
        const next = new Map(prev);
        rendered.forEach((src, i) => next.set(toRender[i], src));
        return next;
      });
    } catch (cause) {
      console.error('render more failed', cause);
    } finally {
      setRendering(false);
    }
  }

  function goToPage(page: number) {
    const el = scrollRef.current;
    if (!el) return;
    const pageHeight = el.scrollHeight / pageCount;
    el.scrollTo({ top: (page - 1) * pageHeight, behavior: 'smooth' });
  }

  if (loading) {
    return (
      <div className="pdf-reader-loading">
        <Loader2 size={28} className="spin" />
        <span>Loading document…</span>
      </div>
    );
  }

  return (
    <div className="pdf-reader">
      <div className="pdf-reader-toolbar">
        <button className="pdf-reader-close" onClick={onBack}>
          <ChevronLeft size={18} /> Back to details
        </button>
        <div className="pdf-reader-info">
          <strong>{lesson.title}</strong>
          <span>{currentPage} / {pageCount}</span>
        </div>
        <div className="pdf-reader-nav">
          <button onClick={() => goToPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}><ChevronLeft size={18} /></button>
          <button onClick={() => goToPage(Math.min(pageCount, currentPage + 1))} disabled={currentPage >= pageCount}><ChevronRight size={18} /></button>
        </div>
      </div>
      <div
        className="pdf-reader-scroll"
        ref={scrollRef}
        onScroll={() => {
          if (pageImages.size < pageCount) {
            const el = scrollRef.current;
            if (!el) return;
            if (el.scrollTop / el.scrollHeight > 0.6) renderMore(pageImages.size + 3);
          }
        }}
      >
        {Array.from(pageImages.entries()).sort((a, b) => a[0] - b[0]).map(([pageNum, src]) => (
          <img key={pageNum} src={src} alt={`Page ${pageNum}`} className="pdf-reader-page" />
        ))}
        {pageImages.size < pageCount && (
          <div className="pdf-reader-more">
            <Loader2 size={20} className="spin" /> Loading more pages…
          </div>
        )}
      </div>
    </div>
  );
}

function PublishModal({ form, selectedFile, isSaving, error, onClose, onSubmit, onChange, onFileChange }: { form: LessonForm; selectedFile: File | null; isSaving: boolean; error: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onChange: (field: keyof LessonForm, value: string) => void; onFileChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="publish-modal" onMouseDown={(event) => event.stopPropagation()}><div className="publish-modal-head"><div><div className="eyebrow muted">Your workspace</div><h2>Publish a lesson</h2><p>Give a good idea a place to land.</p></div><button className="modal-close" onClick={onClose}><X size={18} /></button></div><form onSubmit={onSubmit}><label className="file-drop"><input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov,.mp3,.zip" onChange={onFileChange} /><UploadCloud size={23} /><strong>{selectedFile ? selectedFile.name : 'Drop your lesson here'}</strong><span>{selectedFile ? formatSize(selectedFile.size) : 'PDF, video, audio or any other format'}</span></label><div className="form-grid"><label><span>Title</span><input required value={form.title} onChange={(event) => onChange('title', event.target.value)} placeholder="e.g. The quiet power of…" /></label><label><span>Category</span><select value={form.category} onChange={(event) => onChange('category', event.target.value)}><option>Creative direction</option><option>Design systems</option><option>Thinking tools</option><option>Inspiration</option></select></label><label className="full"><span>Description</span><textarea value={form.description} onChange={(event) => onChange('description', event.target.value)} placeholder="What will people take away from this lesson?" rows={3} /></label><label><span>Format</span><select value={form.format} onChange={(event) => onChange('format', event.target.value)}><option>PDF</option><option>Video</option><option>Audio</option><option>Workbook</option><option>Article</option></select></label><label><span>Pages or duration</span><input value={form.pages} onChange={(event) => onChange('pages', event.target.value)} placeholder="42" /></label></div>{error && <div className="form-error">{error}</div>}<div className="form-footer"><span>It will appear in your public library.</span><button className="publish-button large" disabled={isSaving}>{isSaving ? 'Publishing…' : 'Publish lesson'} <ArrowUpRight size={17} /></button></div></form></div></div>;
}

export default App;
