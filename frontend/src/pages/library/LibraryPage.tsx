import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Search, Plus, RefreshCw, Check, X, RotateCcw,
  AlertTriangle, Users, Library, BookMarked, Clock, IndianRupee,
  ArrowRight, ChevronLeft, ChevronRight, Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import libraryService, {
  Book, LibraryMember, BookIssue, LibraryStats, BookCategory, Author, Publisher,
} from '../../services/libraryService';
import PermissionGate from '../../components/ui/PermissionGate';
import styles from './LibraryPage.module.css';

type Section = 'dashboard' | 'catalog' | 'issue' | 'members' | 'overdue';

const LANGUAGES = ['Marathi','English','Hindi','Bilingual','Sanskrit','Urdu'];
const today = new Date().toISOString().split('T')[0];
const dueDefault = new Date(Date.now() + 14 * 864e5).toISOString().split('T')[0];

export default function LibraryPage() {
  const [section, setSection] = useState<Section>('dashboard');
  const [stats, setStats] = useState<LibraryStats | null>(null);

  // Catalog
  const [books, setBooks] = useState<Book[]>([]);
  const [bookMeta, setBookMeta] = useState<{ total: number; page: number; total_pages: number; has_next?: boolean }>({ total: 0, page: 1, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [availOnly, setAvailOnly] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [editBook, setEditBook] = useState<Book | null>(null);
  const [newBook, setNewBook] = useState({
    title: '', title_marathi: '', isbn: '', language: 'Marathi',
    publication_year: '', edition: '', pages: '', price: '',
    author_id: '', publisher_id: '', category_id: '',
    total_copies: '1', location_shelf: '', keywords: '', description: '',
  });
  const [savingBook, setSavingBook] = useState(false);

  // Masters
  const [categories, setCategories] = useState<BookCategory[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);

  // Issue / Return
  const [searchIssue, setSearchIssue] = useState('');
  const [foundBook, setFoundBook] = useState<Book | null>(null);
  const [searchMember, setSearchMember] = useState('');
  const [foundMember, setFoundMember] = useState<LibraryMember | null>(null);
  const [dueDate, setDueDate] = useState(dueDefault);
  const [issueRemarks, setIssueRemarks] = useState('');
  const [issuing, setIssuing] = useState(false);

  // Members
  const [members, setMembers] = useState<LibraryMember[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberType, setMemberType] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [newMember, setNewMember] = useState({ member_type: 'student', reference_id: '', full_name: '', standard: '', division: '', mobile: '', max_books_allowed: '2' });
  const [savingMember, setSavingMember] = useState(false);

  // Active Issues
  const [activeIssues, setActiveIssues] = useState<BookIssue[]>([]);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [returning, setReturning] = useState<number | null>(null);

  const loadStats = useCallback(async () => {
    try { setStats(await libraryService.getStats()); } catch {}
  }, []);

  const loadMasters = useCallback(async () => {
    try {
      const [cats, auths, pubs] = await Promise.all([
        libraryService.getCategories(),
        libraryService.getAuthors(),
        libraryService.getPublishers(),
      ]);
      setCategories(cats); setAuthors(auths); setPublishers(pubs);
    } catch {}
  }, []);

  useEffect(() => { loadStats(); loadMasters(); }, [loadStats, loadMasters]);

  const loadBooks = useCallback(async (page = 1) => {
    setLoadingBooks(true);
    try {
      const res = await libraryService.getBooks({
        page, per_page: 18, search: search || undefined,
        category_id: filterCat ? Number(filterCat) : undefined,
        available_only: availOnly || undefined,
      });
      setBooks(res.items); setBookMeta(res.meta);
    } catch {} finally { setLoadingBooks(false); }
  }, [search, filterCat, availOnly]);

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const res = await libraryService.getMembers({
        search: memberSearch || undefined,
        member_type: memberType || undefined,
      });
      setMembers(res.items);
    } catch {} finally { setLoadingMembers(false); }
  }, [memberSearch, memberType]);

  const loadIssues = useCallback(async () => {
    setLoadingIssues(true);
    try {
      const res = await libraryService.getIssues({ overdue_only: overdueOnly });
      setActiveIssues(res.items);
    } catch {} finally { setLoadingIssues(false); }
  }, [overdueOnly]);

  useEffect(() => { if (section === 'catalog') loadBooks(); }, [section, loadBooks]);
  useEffect(() => { if (section === 'members') loadMembers(); }, [section, loadMembers]);
  useEffect(() => { if (section === 'overdue' || section === 'issue') loadIssues(); }, [section, loadIssues]);

  const resetBookForm = () => setNewBook({ title: '', title_marathi: '', isbn: '', language: 'Marathi', publication_year: '', edition: '', pages: '', price: '', author_id: '', publisher_id: '', category_id: '', total_copies: '1', location_shelf: '', keywords: '', description: '' });

  const saveBook = async () => {
    if (!newBook.title) { toast.error('Title is required.'); return; }
    setSavingBook(true);
    try {
      const payload: any = {
        ...newBook,
        publication_year: newBook.publication_year ? Number(newBook.publication_year) : null,
        pages: newBook.pages ? Number(newBook.pages) : null,
        price: newBook.price ? Number(newBook.price) : null,
        total_copies: Number(newBook.total_copies) || 1,
        author_id: newBook.author_id ? Number(newBook.author_id) : null,
        publisher_id: newBook.publisher_id ? Number(newBook.publisher_id) : null,
        category_id: newBook.category_id ? Number(newBook.category_id) : null,
      };
      if (editBook) { await libraryService.updateBook(editBook.id, payload); toast.success('Book updated!'); }
      else { await libraryService.createBook(payload); toast.success('Book added to catalog!'); }
      setShowBookModal(false); setEditBook(null); resetBookForm();
      loadBooks(); loadStats();
    } catch { toast.error('Failed to save book.'); }
    finally { setSavingBook(false); }
  };

  const deleteBook = async (id: number) => {
    if (!confirm('Remove this book from catalog?')) return;
    try { await libraryService.deleteBook(id); toast.success('Book removed.'); loadBooks(); loadStats(); }
    catch { toast.error('Delete failed.'); }
  };

  const searchBookForIssue = async () => {
    if (!searchIssue.trim()) return;
    try {
      const res = await libraryService.getBooks({ search: searchIssue, available_only: true });
      if (res.items.length === 1) { setFoundBook(res.items[0]); toast.success('Book found!'); }
      else if (res.items.length === 0) toast.error('No available book found.')
      else { setFoundBook(res.items[0]); toast('Multiple found. First result selected.', { icon: 'ℹ️' }); }
    } catch { toast.error('Search failed.'); }
  };

  const searchMemberForIssue = async () => {
    if (!searchMember.trim()) return;
    try {
      const res = await libraryService.getMembers({ search: searchMember });
      if (res.items.length >= 1) { setFoundMember(res.items[0]); toast.success('Member found!'); }
      else toast.error('Member not found.');
    } catch { toast.error('Search failed.'); }
  };

  const issueBook = async () => {
    if (!foundBook || !foundMember) { toast.error('Select both book and member.'); return; }
    if (!dueDate) { toast.error('Set due date.'); return; }
    setIssuing(true);
    try {
      const issue = await libraryService.issueBook({
        book_id: foundBook.id, member_id: foundMember.id,
        due_date: dueDate, remarks: issueRemarks || undefined,
      });
      toast.success(`✅ Issued! Issue No: ${issue.issue_number}`);
      setFoundBook(null); setFoundMember(null); setSearchIssue(''); setSearchMember('');
      setIssueRemarks(''); setDueDate(dueDefault);
      loadStats(); loadIssues();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Issue failed.');
    } finally { setIssuing(false); }
  };

  const returnBook = async (issueId: number) => {
    setReturning(issueId);
    try {
      const issue = await libraryService.returnBook(issueId, { collect_fine: true });
      const msg = issue.fine_amount > 0 ? `Returned ✅ Fine: ₹${issue.fine_amount}` : 'Book returned! ✅';
      toast.success(msg); loadIssues(); loadStats();
    } catch { toast.error('Return failed.'); }
    finally { setReturning(null); }
  };

  const saveMember = async () => {
    if (!newMember.full_name || !newMember.reference_id) { toast.error('Name and reference ID required.'); return; }
    setSavingMember(true);
    try {
      await libraryService.createMember({
        ...newMember, reference_id: Number(newMember.reference_id),
        max_books_allowed: Number(newMember.max_books_allowed) || 2,
      });
      toast.success('Library member registered!');
      setShowMemberModal(false);
      setNewMember({ member_type: 'student', reference_id: '', full_name: '', standard: '', division: '', mobile: '', max_books_allowed: '2' });
      loadMembers(); loadStats();
    } catch { toast.error('Failed.'); }
    finally { setSavingMember(false); }
  };

  const updateOverdue = async () => {
    try {
      const count = await libraryService.updateOverdue();
      toast.success(`${count} records marked overdue.`);
      loadStats(); loadIssues();
    } catch { toast.error('Failed.'); }
  };

  const daysOverdue = (due: string) => {
    const diff = Math.floor((Date.now() - new Date(due).getTime()) / 864e5);
    return diff > 0 ? diff : 0;
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Library Management</h1>
          <p className={styles.pageSub}>ग्रंथालय व्यवस्थापन · Book Catalog & Issue/Return</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        {([
          { id: 'dashboard', label: 'Dashboard',    icon: <Library size={14}/> },
          { id: 'catalog',   label: 'Book Catalog', icon: <BookOpen size={14}/> },
          { id: 'issue',     label: 'Issue & Return', icon: <BookMarked size={14}/> },
          { id: 'members',   label: 'Members',      icon: <Users size={14}/> },
          { id: 'overdue',   label: 'Overdue',      icon: <AlertTriangle size={14}/> },
        ] as const).map(t => (
          <button key={t.id} className={`${styles.tab} ${section === t.id ? styles.tabActive : ''}`}
            onClick={() => setSection(t.id as Section)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ──────────────────────────────────────── */}
      {section === 'dashboard' && stats && (
        <div className={styles.dashContent}>
          <div className={styles.kpiGrid}>
            {[
              { label: 'Total Books',      value: stats.total_books,      sub: `${stats.total_copies} copies`, icon: <BookOpen size={20}/>, color: 'var(--color-primary)', action: () => setSection('catalog') },
              { label: 'Available',        value: stats.available_copies, sub: `of ${stats.total_copies} copies`, icon: <Check size={20}/>, color: 'var(--color-success)', action: () => setSection('catalog') },
              { label: 'Books Issued',     value: stats.books_issued,     sub: 'currently out', icon: <BookMarked size={20}/>, color: 'var(--color-warning)', action: () => setSection('issue') },
              { label: 'Overdue',          value: stats.overdue_books,    sub: 'past due date', icon: <AlertTriangle size={20}/>, color: 'var(--color-danger)', action: () => setSection('overdue') },
              { label: 'Members',          value: stats.active_members,   sub: `${stats.total_members} registered`, icon: <Users size={20}/>, color: 'var(--color-info)', action: () => setSection('members') },
              { label: 'Fine Pending',     value: `₹${Number(stats.total_fine_pending).toLocaleString('en-IN')}`, sub: 'uncollected', icon: <IndianRupee size={20}/>, color: 'var(--color-danger)' },
              { label: 'New This Month',   value: stats.new_books_this_month, sub: 'books added', icon: <Plus size={20}/>, color: 'var(--color-primary)' },
            ].map(k => (
              <div key={k.label} className={`${styles.kpiCard} ${k.action ? styles.kpiClickable : ''}`}
                   style={{ '--kc': k.color } as React.CSSProperties}
                   onClick={k.action}>
                <div className={styles.kpiIcon} style={{ color: k.color }}>{k.icon}</div>
                <div className={styles.kpiVal}>{k.value}</div>
                <div className={styles.kpiLabel}>{k.label}</div>
                <div className={styles.kpiSub}>{k.sub}</div>
                {k.action && <ArrowRight size={13} className={styles.kpiArrow}/>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CATALOG ──────────────────────────────────────────── */}
      {section === 'catalog' && (
        <div className={styles.catalogContent}>
          <div className={styles.toolbar}>
            <div className={styles.searchWrap}>
              <Search size={14} className={styles.searchIcon}/>
              <input className={styles.searchInput} placeholder="Search title, ISBN, accession number..."
                value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadBooks()}/>
            </div>
            <select className={styles.filterSel} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={availOnly} onChange={e => setAvailOnly(e.target.checked)}/>
              Available only
            </label>
            <button className={styles.iconBtn} onClick={() => loadBooks()}><RefreshCw size={14}/></button>
            <PermissionGate permission="library.manage">
              <button className={styles.addBtn} onClick={() => { resetBookForm(); setEditBook(null); setShowBookModal(true); }}>
                <Plus size={15}/> Add Book
              </button>
            </PermissionGate>
          </div>

          {loadingBooks ? (
            <div className={styles.bookGrid}>{Array.from({length:6}).map((_,i)=><div key={i} className={`${styles.bookCard} ${styles.skeleton}`}/>)}</div>
          ) : books.length === 0 ? (
            <div className={styles.emptyState}><BookOpen size={64}/><p>No books found</p></div>
          ) : (
            <>
              <div className={styles.bookGrid}>
                {books.map(b => (
                  <div key={b.id} className={styles.bookCard}>
                    <div className={styles.bookCover}>
                      {b.cover_image_path
                        ? <img src={`${import.meta.env.VITE_STORAGE_URL}/${b.cover_image_path}`} alt={b.title}/>
                        : <div className={styles.bookCoverPlaceholder}>
                            <BookOpen size={32}/>
                          </div>}
                      <div className={`${styles.availBadge} ${b.available_copies > 0 ? styles.availGreen : styles.availRed}`}>
                        {b.available_copies}/{b.total_copies}
                      </div>
                    </div>
                    <div className={styles.bookInfo}>
                      <div className={styles.bookTitle}>{b.title}</div>
                      {b.title_marathi && <div className={styles.bookTitleMr}>{b.title_marathi}</div>}
                      {b.author && <div className={styles.bookAuthor}>{b.author.name}</div>}
                      <div className={styles.bookMeta}>
                        {b.category && <span className={styles.catTag}><Tag size={10}/> {b.category.name}</span>}
                        <span className={styles.langTag}>{b.language}</span>
                        {b.publication_year && <span>{b.publication_year}</span>}
                      </div>
                      {b.accession_number && <div className={styles.accNo}>{b.accession_number}</div>}
                    </div>
                    <div className={styles.bookActions}>
                      <PermissionGate permission="library.manage">
                        <button className={styles.miniBtn} onClick={() => {
                          setEditBook(b);
                          setNewBook({ title: b.title, title_marathi: b.title_marathi || '', isbn: b.isbn || '', language: b.language, publication_year: String(b.publication_year || ''), edition: b.edition || '', pages: String(b.pages || ''), price: String(b.price || ''), author_id: String(b.author_id || ''), publisher_id: String(b.publisher_id || ''), category_id: String(b.category_id || ''), total_copies: String(b.total_copies), location_shelf: b.location_shelf || '', keywords: b.keywords || '', description: b.description || '' });
                          setShowBookModal(true);
                        }}>Edit</button>
                        <button className={`${styles.miniBtn} ${styles.miniBtnDanger}`} onClick={() => deleteBook(b.id)}>Delete</button>
                      </PermissionGate>
                    </div>
                  </div>
                ))}
              </div>
              {/* Pagination */}
              {bookMeta.total_pages > 1 && (
                <div className={styles.pagination}>
                  <button className={styles.pageBtn} disabled={bookMeta.page === 1} onClick={() => loadBooks(bookMeta.page - 1)}><ChevronLeft size={14}/></button>
                  <span className={styles.pageInfo}>Page {bookMeta.page} of {bookMeta.total_pages} · {bookMeta.total} books</span>
                  <button className={styles.pageBtn} disabled={!bookMeta.has_next} onClick={() => loadBooks(bookMeta.page + 1)}><ChevronRight size={14}/></button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ISSUE & RETURN ──────────────────────────────────── */}
      {section === 'issue' && (
        <div className={styles.issueLayout}>
          {/* Issue Form */}
          <div className={styles.issueForm}>
            <h3 className={styles.panelTitle}><BookMarked size={15}/> Issue Book</h3>

            <div className={styles.issueSearch}>
              <label className={styles.issueLabel}>Search Book (title / accession / ISBN)</label>
              <div className={styles.searchRow}>
                <input className={styles.input} value={searchIssue} onChange={e => setSearchIssue(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchBookForIssue()} placeholder="Search available books..."/>
                <button className={styles.iconBtn} onClick={searchBookForIssue}><Search size={14}/></button>
              </div>
              {foundBook && (
                <div className={styles.foundCard}>
                  <BookOpen size={16} style={{ color: 'var(--color-primary)' }}/>
                  <div>
                    <div className={styles.foundName}>{foundBook.title}</div>
                    <div className={styles.foundMeta}>{foundBook.accession_number} · {foundBook.available_copies} available</div>
                  </div>
                  <button className={styles.clearBtn} onClick={() => setFoundBook(null)}><X size={12}/></button>
                </div>
              )}
            </div>

            <div className={styles.issueSearch}>
              <label className={styles.issueLabel}>Search Member (name / member ID)</label>
              <div className={styles.searchRow}>
                <input className={styles.input} value={searchMember} onChange={e => setSearchMember(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchMemberForIssue()} placeholder="Search library member..."/>
                <button className={styles.iconBtn} onClick={searchMemberForIssue}><Search size={14}/></button>
              </div>
              {foundMember && (
                <div className={`${styles.foundCard} ${foundMember.is_blocked ? styles.foundBlocked : ''}`}>
                  <Users size={16} style={{ color: 'var(--color-success)' }}/>
                  <div>
                    <div className={styles.foundName}>{foundMember.full_name}</div>
                    <div className={styles.foundMeta}>
                      {foundMember.member_id} · {foundMember.books_currently_issued}/{foundMember.max_books_allowed} books issued
                      {foundMember.is_blocked && <span className={styles.blockedTag}> 🚫 BLOCKED</span>}
                    </div>
                  </div>
                  <button className={styles.clearBtn} onClick={() => setFoundMember(null)}><X size={12}/></button>
                </div>
              )}
            </div>

            <div className={styles.issueFieldRow}>
              <div className={styles.issueField}>
                <label className={styles.issueLabel}>Due Date *</label>
                <input type="date" className={styles.input} value={dueDate} onChange={e => setDueDate(e.target.value)} min={today}/>
              </div>
            </div>
            <div className={styles.issueField}>
              <label className={styles.issueLabel}>Remarks</label>
              <input className={styles.input} value={issueRemarks} onChange={e => setIssueRemarks(e.target.value)} placeholder="Optional"/>
            </div>

            <button className={styles.issueBtn} onClick={issueBook}
              disabled={issuing || !foundBook || !foundMember}>
              {issuing ? <span className={styles.spin}/> : <BookMarked size={16}/>}
              {issuing ? 'Issuing...' : 'Issue Book'}
            </button>
          </div>

          {/* Active Issues */}
          <div className={styles.activeIssues}>
            <div className={styles.panelTitleRow}>
              <h3 className={styles.panelTitle}><Clock size={15}/> Currently Issued</h3>
              <button className={styles.iconBtn} onClick={loadIssues}><RefreshCw size={13}/></button>
            </div>
            {loadingIssues ? <div className={styles.loadingSkel}/> : (
              <div className={styles.issueList}>
                {activeIssues.length === 0 ? (
                  <div className={styles.emptyMsg}>No books currently issued.</div>
                ) : activeIssues.map(issue => {
                  const over = daysOverdue(issue.due_date);
                  return (
                    <div key={issue.id} className={`${styles.issueItem} ${over > 0 ? styles.issueOverdue : ''}`}>
                      <div className={styles.issueItemLeft}>
                        <div className={styles.issueNo}>{issue.issue_number}</div>
                        <div className={styles.issueBookName}>{issue.book?.title || `Book #${issue.book_id}`}</div>
                        <div className={styles.issueMemberName}>{issue.member?.full_name || `Member #${issue.member_id}`}</div>
                        <div className={styles.issueDue}>
                          Due: {new Date(issue.due_date).toLocaleDateString('en-IN')}
                          {over > 0 && <span className={styles.overdueChip}> 🔴 {over}d late</span>}
                        </div>
                      </div>
                      <button className={styles.returnBtn} onClick={() => returnBook(issue.id)}
                        disabled={returning === issue.id}>
                        {returning === issue.id ? <span className={styles.spin}/> : <RotateCcw size={13}/>} Return
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MEMBERS ──────────────────────────────────────────── */}
      {section === 'members' && (
        <div className={styles.membersContent}>
          <div className={styles.toolbar}>
            <div className={styles.searchWrap}>
              <Search size={14} className={styles.searchIcon}/>
              <input className={styles.searchInput} placeholder="Search by name or member ID..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)}/>
            </div>
            <select className={styles.filterSel} value={memberType} onChange={e => setMemberType(e.target.value)}>
              <option value="">All Types</option>
              {['student','teacher','staff'].map(t=><option key={t}>{t}</option>)}
            </select>
            <button className={styles.iconBtn} onClick={loadMembers}><RefreshCw size={14}/></button>
            <PermissionGate permission="library.manage">
              <button className={styles.addBtn} onClick={() => setShowMemberModal(true)}><Plus size={15}/> Add Member</button>
            </PermissionGate>
          </div>
          {loadingMembers ? <div className={styles.loadingSkel}/> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr>
                  <th>Member ID</th><th>Name</th><th>Type</th><th>Standard</th>
                  <th>Issued</th><th>Max Allowed</th><th>Fine Due</th><th>Status</th>
                </tr></thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr><td colSpan={8} className={styles.emptyCell}><div className={styles.emptyState}><Users size={48}/><p>No members found</p></div></td></tr>
                  ) : members.map(m => (
                    <tr key={m.id} className={styles.tr}>
                      <td className={styles.monoId}>{m.member_id}</td>
                      <td><strong>{m.full_name}</strong></td>
                      <td><span className={styles.typeBadge}>{m.member_type}</span></td>
                      <td>{m.standard ? `Std ${m.standard}${m.division || ''}` : '—'}</td>
                      <td className={styles.issuedCount}>{m.books_currently_issued}</td>
                      <td>{m.max_books_allowed}</td>
                      <td className={m.total_fine_due > 0 ? styles.fineDue : ''}>{m.total_fine_due > 0 ? `₹${Number(m.total_fine_due).toFixed(2)}` : '—'}</td>
                      <td>{m.is_blocked ? <span className={styles.tagDanger}>Blocked</span> : <span className={styles.tagSuccess}>Active</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── OVERDUE ──────────────────────────────────────────── */}
      {section === 'overdue' && (
        <div className={styles.overdueContent}>
          <div className={styles.toolbar}>
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={overdueOnly} onChange={e => setOverdueOnly(e.target.checked)}/>
              Show overdue only
            </label>
            <button className={styles.iconBtn} onClick={loadIssues}><RefreshCw size={14}/></button>
            <PermissionGate permission="library.manage">
              <button className={styles.warnBtn} onClick={updateOverdue}><AlertTriangle size={14}/> Mark Overdue</button>
            </PermissionGate>
          </div>
          {loadingIssues ? <div className={styles.loadingSkel}/> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr>
                  <th>Issue No.</th><th>Book Title</th><th>Member</th><th>Issued</th>
                  <th>Due Date</th><th>Overdue Days</th><th>Fine (est.)</th><th>Status</th><th>Action</th>
                </tr></thead>
                <tbody>
                  {activeIssues.length === 0 ? (
                    <tr><td colSpan={9} className={styles.emptyCell}><div className={styles.emptyState}><Check size={48}/><p>No overdue books! 🎉</p></div></td></tr>
                  ) : activeIssues.map(issue => {
                    const over = daysOverdue(issue.due_date);
                    const estFine = over * Number(issue.fine_per_day);
                    return (
                      <tr key={issue.id} className={`${styles.tr} ${over > 0 ? styles.trOverdue : ''}`}>
                        <td className={styles.monoId}>{issue.issue_number}</td>
                        <td className={styles.bookNameCell}>{issue.book?.title || `#${issue.book_id}`}</td>
                        <td>{issue.member?.full_name || `#${issue.member_id}`}</td>
                        <td>{new Date(issue.issue_date).toLocaleDateString('en-IN')}</td>
                        <td>{new Date(issue.due_date).toLocaleDateString('en-IN')}</td>
                        <td>{over > 0 ? <span className={styles.overdueDays}>{over} days</span> : '—'}</td>
                        <td className={estFine > 0 ? styles.fineAmt : ''}>{estFine > 0 ? `₹${estFine.toFixed(2)}` : '—'}</td>
                        <td><span className={`${styles.tag} ${issue.status === 'overdue' ? styles.tagDanger : styles.tagWarning}`}>{issue.status}</span></td>
                        <td>
                          <button className={styles.returnBtn} onClick={() => returnBook(issue.id)}
                            disabled={returning === issue.id}>
                            {returning === issue.id ? <span className={styles.spin}/> : <RotateCcw size={12}/>} Return
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════ Book Modal ════ */}
      {showBookModal && (
        <div className={styles.overlay} onClick={() => setShowBookModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editBook ? 'Edit Book' : 'Add Book to Catalog'}</h3>
              <button className={styles.modalClose} onClick={() => setShowBookModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mf}><label className={styles.ml}>Title *</label><input className={styles.mi} value={newBook.title} onChange={e => setNewBook(p=>({...p,title:e.target.value}))} placeholder="Book title"/></div>
              <div className={styles.mf}><label className={styles.ml}>Title (Marathi)</label><input className={styles.mi} value={newBook.title_marathi} onChange={e => setNewBook(p=>({...p,title_marathi:e.target.value}))} placeholder="मराठीत शीर्षक"/></div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Author</label>
                  <select className={styles.mi} value={newBook.author_id} onChange={e => setNewBook(p=>({...p,author_id:e.target.value}))}>
                    <option value="">Select author</option>
                    {authors.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div className={styles.mf}><label className={styles.ml}>Publisher</label>
                  <select className={styles.mi} value={newBook.publisher_id} onChange={e => setNewBook(p=>({...p,publisher_id:e.target.value}))}>
                    <option value="">Select publisher</option>
                    {publishers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className={styles.mf}><label className={styles.ml}>Category</label>
                  <select className={styles.mi} value={newBook.category_id} onChange={e => setNewBook(p=>({...p,category_id:e.target.value}))}>
                    <option value="">Select category</option>
                    {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>ISBN</label><input className={styles.mi} value={newBook.isbn} onChange={e => setNewBook(p=>({...p,isbn:e.target.value}))} placeholder="ISBN"/></div>
                <div className={styles.mf}><label className={styles.ml}>Language</label>
                  <select className={styles.mi} value={newBook.language} onChange={e => setNewBook(p=>({...p,language:e.target.value}))}>
                    {LANGUAGES.map(l=><option key={l}>{l}</option>)}
                  </select>
                </div>
                <div className={styles.mf}><label className={styles.ml}>Year</label><input type="number" className={styles.mi} value={newBook.publication_year} onChange={e => setNewBook(p=>({...p,publication_year:e.target.value}))} placeholder="2024"/></div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Edition</label><input className={styles.mi} value={newBook.edition} onChange={e => setNewBook(p=>({...p,edition:e.target.value}))} placeholder="e.g. 3rd"/></div>
                <div className={styles.mf}><label className={styles.ml}>Pages</label><input type="number" className={styles.mi} value={newBook.pages} onChange={e => setNewBook(p=>({...p,pages:e.target.value}))} placeholder="0"/></div>
                <div className={styles.mf}><label className={styles.ml}>Price (₹)</label><input type="number" className={styles.mi} value={newBook.price} onChange={e => setNewBook(p=>({...p,price:e.target.value}))} placeholder="0.00"/></div>
                <div className={styles.mf}><label className={styles.ml}>Copies</label><input type="number" className={styles.mi} value={newBook.total_copies} onChange={e => setNewBook(p=>({...p,total_copies:e.target.value}))} min="1"/></div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Shelf Location</label><input className={styles.mi} value={newBook.location_shelf} onChange={e => setNewBook(p=>({...p,location_shelf:e.target.value}))} placeholder="e.g. Rack A-3"/></div>
                <div className={styles.mf}><label className={styles.ml}>Keywords</label><input className={styles.mi} value={newBook.keywords} onChange={e => setNewBook(p=>({...p,keywords:e.target.value}))} placeholder="Tags for search"/></div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowBookModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={saveBook} disabled={savingBook}>
                {savingBook ? <span className={styles.spin}/> : <Check size={14}/>} {editBook ? 'Update' : 'Add Book'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ Member Modal ════ */}
      {showMemberModal && (
        <div className={styles.overlay} onClick={() => setShowMemberModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Register Library Member</h3>
              <button className={styles.modalClose} onClick={() => setShowMemberModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Type</label>
                  <select className={styles.mi} value={newMember.member_type} onChange={e => setNewMember(p=>({...p,member_type:e.target.value}))}>
                    {['student','teacher','staff'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className={styles.mf}><label className={styles.ml}>Reference ID *</label><input type="number" className={styles.mi} value={newMember.reference_id} onChange={e => setNewMember(p=>({...p,reference_id:e.target.value}))} placeholder="Student/Teacher ID"/></div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Full Name *</label><input className={styles.mi} value={newMember.full_name} onChange={e => setNewMember(p=>({...p,full_name:e.target.value}))} placeholder="Full name"/></div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Standard</label><input className={styles.mi} value={newMember.standard} onChange={e => setNewMember(p=>({...p,standard:e.target.value}))} placeholder="e.g. 9"/></div>
                <div className={styles.mf}><label className={styles.ml}>Division</label><input className={styles.mi} value={newMember.division} onChange={e => setNewMember(p=>({...p,division:e.target.value}))} placeholder="A/B/C"/></div>
                <div className={styles.mf}><label className={styles.ml}>Mobile</label><input className={styles.mi} value={newMember.mobile} onChange={e => setNewMember(p=>({...p,mobile:e.target.value}))} placeholder="Mobile"/></div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Max Books Allowed</label>
                <select className={styles.mi} value={newMember.max_books_allowed} onChange={e => setNewMember(p=>({...p,max_books_allowed:e.target.value}))}>
                  {[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowMemberModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={saveMember} disabled={savingMember}>{savingMember ? <span className={styles.spin}/> : <Check size={14}/>} Register</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
