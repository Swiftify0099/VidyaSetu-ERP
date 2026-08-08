import app.modules.attendance.models
from app.core.dependencies import get_db
from app.modules.communication.service import MessageService

db = next(get_db())
tokens = MessageService.get_all_fcm_tokens(db)
print(f"Total Registered Users across Roles: {len(tokens)}\n")
for t in tokens:
    tok = t['fcm_token'] if t['fcm_token'] else f"Topic Fallback: '{t['topic']}'"
    print(f"Role: {t['role']:<20} | Name: {t['name']:<30} | ID: {t['identifier']:<35} | FCM/Topic: {tok}")
