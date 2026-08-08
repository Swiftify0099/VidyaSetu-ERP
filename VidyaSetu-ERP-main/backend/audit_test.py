import urllib.request
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

base = 'http://127.0.0.1:8000/api/v1'

print("=" * 65)
print("VIDYASETU ERP - ENTERPRISE API AUDIT v2")
print("=" * 65)

login_data = json.dumps({'username': 'admin', 'password': 'Admin@2024!'}).encode()
req = urllib.request.Request(base + '/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
try:
    r = urllib.request.urlopen(req)
    resp = json.loads(r.read())
    token = resp['data']['access_token']
    print('[PASS] LOGIN: admin authenticated')
except Exception as e:
    print('[FAIL] LOGIN:', e)
    sys.exit(1)

headers = {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}

results = {'pass': 0, 'fail': 0, 'warn': 0}

def test(name, method, path, body=None, expected_codes=[200, 201]):
    try:
        url = base + path
        data = json.dumps(body).encode() if body else None
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        r = urllib.request.urlopen(req, timeout=15)
        resp = json.loads(r.read())
        extra = ''
        if 'data' in resp and isinstance(resp['data'], dict):
            t = resp['data'].get('total', resp['data'].get('count', ''))
            if t != '':
                extra = ' | total=' + str(t)
        print(f'  [PASS] {name}{extra}')
        results['pass'] += 1
        return True
    except urllib.error.HTTPError as e:
        try:
            err = json.loads(e.read())
            detail = err.get('detail', err.get('message', 'HTTP ' + str(e.code)))
        except:
            detail = 'HTTP ' + str(e.code)
        print(f'  [FAIL] {name}: {detail}')
        results['fail'] += 1
        return False
    except Exception as e:
        print(f'  [FAIL] {name}: {str(e)[:70]}')
        results['fail'] += 1
        return False

# ============================================================
print("\n-- AUTH MODULE --")
test("GET /auth/me", "GET", "/auth/me")
test("GET /auth/my-permissions", "GET", "/auth/my-permissions")
test("GET /auth/users (admin)", "GET", "/auth/users?page=1&page_size=5")
test("GET /auth/roles", "GET", "/auth/roles")
test("GET /auth/permissions", "GET", "/auth/permissions")

print("\n-- STUDENTS MODULE --")
test("LIST students", "GET", "/students?page=1&page_size=5")
test("GET student stats", "GET", "/students/stats")

print("\n-- TEACHERS MODULE --")
test("LIST teachers", "GET", "/teachers?page=1&page_size=5")
test("GET teacher stats", "GET", "/teachers/stats")

print("\n-- OFFICE MODULE --")
test("LIST notices (office)", "GET", "/office/notices?page=1&page_size=5")
test("LIST visitor logs", "GET", "/office/visitors?page=1&page_size=5")
test("LIST events", "GET", "/office/events")
test("LIST enquiries", "GET", "/office/enquiries?page=1&page_size=5")

print("\n-- FINANCE MODULE --")
test("Finance stats", "GET", "/finance/stats")
test("LIST fee categories", "GET", "/finance/categories")
test("LIST fee structure", "GET", "/finance/structure")
test("LIST expenses", "GET", "/finance/expenses")
test("Fee defaulters", "GET", "/finance/defaulters?academic_year_id=1")

print("\n-- LIBRARY MODULE --")
test("LIST books", "GET", "/library/books?page=1&page_size=5")
test("Library stats", "GET", "/library/stats")
test("LIST book issues", "GET", "/library/issues?page=1&page_size=5")

print("\n-- EXAM MODULE --")
test("Exam stats", "GET", "/exam/stats")
test("LIST exam types", "GET", "/exam/types")
test("LIST exams", "GET", "/exam?page=1&page_size=5")

print("\n-- ATTENDANCE MODULE --")
test("Attendance stats", "GET", "/attendance/stats")
test("LIST holidays", "GET", "/attendance/holidays")
test("Student attendance today", "GET", "/attendance/student/day?date=2026-07-24&academic_year_id=1&standard=1")

print("\n-- TIMETABLE MODULE --")
test("LIST subjects", "GET", "/timetable/subjects")
test("LIST period configs", "GET", "/timetable/periods")
test("Timetable by class", "GET", "/timetable/class?standard=1&division=A&academic_year_id=1")

print("\n-- COMMUNICATION MODULE --")
test("LIST notices", "GET", "/communication/notices?page=1&page_size=5")
test("LIST announcements", "GET", "/communication/announcements?page=1&page_size=5")

print("\n-- INVENTORY MODULE --")
test("LIST stock items", "GET", "/inventory/stock?page=1&page_size=5")
test("LIST assets", "GET", "/inventory/assets?page=1&page_size=5")
test("LIST categories", "GET", "/inventory/categories")
test("Inventory stats", "GET", "/inventory/stats")

print("\n-- ANALYTICS MODULE --")
test("Analytics dashboard", "GET", "/analytics/dashboard?academic_year_id=1")
test("Analytics students", "GET", "/analytics/students?academic_year_id=1")
test("Analytics attendance", "GET", "/analytics/attendance?academic_year_id=1")
test("Analytics fees", "GET", "/analytics/fees?academic_year_id=1")
test("Analytics library", "GET", "/analytics/library")
test("Analytics inventory", "GET", "/analytics/inventory")

print("\n-- LEAVE MODULE --")
test("LIST leave applications", "GET", "/leave/applications?page=1&page_size=5")
test("LIST leave types", "GET", "/leave/types")
test("Leave stats", "GET", "/leave/stats")

print("\n-- LESSON PLANS MODULE --")
test("LIST lesson plans", "GET", "/lesson-plans?page=1&page_size=5")

print("\n-- QR MODULE --")
test("QR generate", "POST", "/qr/generate", {"entity_type": "student", "entity_id": 1})
test("QR scan logs", "GET", "/qr/logs?page=1&page_size=5")

print("\n-- AI MODULE --")
test("AI chat", "POST", "/ai/chat", {"message": "Hello, what is 2+2?", "language": "en"})
test("AI homework", "POST", "/ai/homework", {"subject": "Math", "topic": "Addition", "class_level": "5", "num_questions": 3, "language": "en"})
test("AI lesson plan", "POST", "/ai/lesson-plan", {"subject": "Science", "topic": "Plants", "class_level": "6", "duration_minutes": 45, "language": "en"})
test("AI student analysis", "POST", "/ai/student-analysis", {"student_id": 1})
test("AI question paper", "POST", "/ai/question-paper", {"subject": "Math", "class_level": "7", "exam_title": "Unit Test 1", "total_marks": 20, "topics": ["Algebra"], "language": "en"})

print("\n-- SETTINGS MODULE --")
test("System settings", "GET", "/system/settings")
test("Academic years", "GET", "/system/academic-years")

print("\n-- PORTALS --")
test("Parent portal /children", "GET", "/parent-portal/children")
test("Student portal /me (404 for admin OK)", "GET", "/student-portal/me")
test("Teacher portal /me (404 for admin OK)", "GET", "/teacher-portal/me")

print("\n-- SEARCH MODULE --")
test("Global search", "GET", "/search?q=test")

print("\n-- EXPORTS --")
try:
    req = urllib.request.Request(base + '/exports/students/excel', headers=headers)
    r = urllib.request.urlopen(req, timeout=15)
    ct = r.headers.get('Content-Type', '')
    if 'spreadsheet' in ct or 'excel' in ct or 'octet' in ct:
        print('  [PASS] Export students excel: returns binary file')
        results['pass'] += 1
    else:
        print(f'  [WARN] Export students excel: Content-Type={ct}')
        results['warn'] += 1
except Exception as e:
    print(f'  [FAIL] Export students excel: {str(e)[:70]}')
    results['fail'] += 1

try:
    req = urllib.request.Request(base + '/exports/attendance/pdf?standard=1&division=A', headers=headers)
    r = urllib.request.urlopen(req, timeout=15)
    ct = r.headers.get('Content-Type', '')
    if 'pdf' in ct or 'octet' in ct:
        print('  [PASS] Export attendance PDF: returns PDF file')
        results['pass'] += 1
    else:
        print(f'  [WARN] Export attendance PDF: Content-Type={ct}')
        results['warn'] += 1
except Exception as e:
    print(f'  [FAIL] Export attendance PDF: {str(e)[:70]}')
    results['fail'] += 1

print("\n" + "=" * 65)
total = results['pass'] + results['fail'] + results['warn']
pct = (results['pass'] / total * 100) if total > 0 else 0
print(f"AUDIT RESULTS: {results['pass']} PASS | {results['fail']} FAIL | {results['warn']} WARN")
print(f"PASS RATE: {pct:.1f}% ({results['pass']}/{total} tests)")
print("=" * 65)
