import api from './api';

export interface Author { id: number; name: string; name_marathi?: string; is_active: boolean; }
export interface Publisher { id: number; name: string; address?: string; contact?: string; is_active: boolean; }
export interface BookCategory { id: number; name: string; name_marathi?: string; description?: string; is_active: boolean; }

export interface Book {
  id: number;
  uuid: string;
  title: string;
  title_marathi?: string;
  isbn?: string;
  accession_number?: string;
  author_id?: number;
  publisher_id?: number;
  category_id?: number;
  edition?: string;
  publication_year?: number;
  language: string;
  pages?: number;
  price?: number;
  total_copies: number;
  available_copies: number;
  description?: string;
  keywords?: string;
  location_shelf?: string;
  cover_image_path?: string;
  is_active: boolean;
  author?: Author;
  publisher?: Publisher;
  category?: BookCategory;
}

export interface LibraryMember {
  id: number;
  member_id: string;
  member_type: string;
  reference_id: number;
  full_name: string;
  standard?: string;
  division?: string;
  mobile?: string;
  membership_date: string;
  max_books_allowed: number;
  books_currently_issued: number;
  total_fine_due: number;
  is_blocked: boolean;
  is_active: boolean;
}

export interface BookIssue {
  id: number;
  issue_number: string;
  book_id: number;
  copy_id?: number;
  member_id: number;
  issue_date: string;
  due_date: string;
  return_date?: string;
  status: string;
  fine_amount: number;
  fine_paid: boolean;
  fine_per_day: number;
  remarks?: string;
  created_at?: string;
  book?: Book;
  member?: LibraryMember;
}

export interface LibraryStats {
  total_books: number;
  total_copies: number;
  available_copies: number;
  books_issued: number;
  overdue_books: number;
  total_members: number;
  active_members: number;
  total_fine_pending: number;
  new_books_this_month: number;
}

const libraryService = {
  async getStats(): Promise<LibraryStats> {
    const res = await api.get('/library/stats');
    return res.data.data;
  },

  async getAuthors(search?: string): Promise<Author[]> {
    const res = await api.get('/library/authors', { params: search ? { search } : {} });
    return res.data.data;
  },
  async createAuthor(data: { name: string; name_marathi?: string }): Promise<Author> {
    const res = await api.post('/library/authors', data);
    return res.data.data;
  },

  async getPublishers(): Promise<Publisher[]> {
    const res = await api.get('/library/publishers');
    return res.data.data;
  },
  async createPublisher(data: { name: string }): Promise<Publisher> {
    const res = await api.post('/library/publishers', data);
    return res.data.data;
  },

  async getCategories(): Promise<BookCategory[]> {
    const res = await api.get('/library/categories');
    return res.data.data;
  },
  async createCategory(data: { name: string; name_marathi?: string }): Promise<BookCategory> {
    const res = await api.post('/library/categories', data);
    return res.data.data;
  },

  // Books
  async getBooks(params?: { page?: number; per_page?: number; search?: string; category_id?: number; language?: string; available_only?: boolean }): Promise<{ items: Book[]; meta: any }> {
    const res = await api.get('/library/books', { params });
    return res.data.data;
  },
  async getBookById(id: number): Promise<Book> {
    const res = await api.get(`/library/books/${id}`);
    return res.data.data;
  },
  async createBook(data: Partial<Book>): Promise<Book> {
    const res = await api.post('/library/books', data);
    return res.data.data;
  },
  async updateBook(id: number, data: Partial<Book>): Promise<Book> {
    const res = await api.put(`/library/books/${id}`, data);
    return res.data.data;
  },
  async deleteBook(id: number): Promise<void> {
    await api.delete(`/library/books/${id}`);
  },

  // Members
  async getMembers(params?: { search?: string; member_type?: string; page?: number }): Promise<{ items: LibraryMember[]; meta: any }> {
    const res = await api.get('/library/members', { params });
    return res.data.data;
  },
  async createMember(data: { member_type: string; reference_id: number; full_name: string; standard?: string; division?: string; mobile?: string; max_books_allowed?: number }): Promise<LibraryMember> {
    const res = await api.post('/library/members', data);
    return res.data.data;
  },
  async getMemberIssues(memberId: number): Promise<{ items: BookIssue[]; meta: any }> {
    const res = await api.get(`/library/members/${memberId}/issues`);
    return res.data.data;
  },

  // Issues
  async issueBook(data: { book_id: number; member_id: number; due_date: string; fine_per_day?: number; remarks?: string }): Promise<BookIssue> {
    const res = await api.post('/library/issues', data);
    return res.data.data;
  },
  async getIssues(params?: { overdue_only?: boolean; page?: number }): Promise<{ items: BookIssue[]; meta: any }> {
    const res = await api.get('/library/issues', { params });
    return res.data.data;
  },
  async returnBook(issueId: number, data: { collect_fine?: boolean; remarks?: string }): Promise<BookIssue> {
    const res = await api.put(`/library/issues/${issueId}/return`, { collect_fine: true, ...data });
    return res.data.data;
  },
  async updateOverdue(): Promise<number> {
    const res = await api.post('/library/overdue/update', {});
    return res.data.data.updated;
  },
};

export default libraryService;
