import os
import datetime

# Try importing google libraries which might not be installed yet
try:
    import gspread
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build
    GOOGLE_LIBS_AVAILABLE = True
except ImportError:
    GOOGLE_LIBS_AVAILABLE = False

CREDENTIALS_FILE = 'credentials.json'
SHEET_NAME = 'HealthApp_Data'
CALENDAR_ID = 'primary'

class GoogleIntegration:
    def __init__(self):
        self.scope = [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/calendar'
        ]
        self.credentials = None
        self.client = None
        self.service_calendar = None
        
        if os.path.exists(CREDENTIALS_FILE) and GOOGLE_LIBS_AVAILABLE:
            try:
                self.credentials = Credentials.from_service_account_file(
                    CREDENTIALS_FILE, scopes=self.scope)
                self.client = gspread.authorize(self.credentials)
                self.service_calendar = build('calendar', 'v3', credentials=self.credentials)
                print("Google Integration: Connected successfully.")
            except Exception as e:
                print(f"Google Integration Error: {e}")
                self.client = None
        else:
            print("Google Integration: MOCK MODE (Syncing to onemeds001@gmail.com requires 'credentials.json')")
            print("Please upload 'credentials.json' and share Sheets with the Service Account email.")

    def add_appointment_to_sheet(self, appointment):
        """Adds appointment details to Google Sheet."""
        data = [
            str(appointment.id),
            appointment.user.username,
            appointment.user.email,
            appointment.doctor.name,
            str(appointment.date),
            str(appointment.time),
            str(datetime.datetime.now())
        ]
        
        if self.client:
            try:
                sheet = self.client.open(SHEET_NAME).sheet1
                sheet.append_row(data)
                print(f"Added appointment {appointment.id} to Google Sheet.")
            except Exception as e:
                print(f"Failed to write to Sheet: {e}")
        else:
            print(f"[MOCK] Added to Sheet: {data}")

    def add_order_to_sheet(self, order):
        """Adds order details to Google Sheet."""
        data = [
            str(order.id),
            order.user.username,
            order.user.email,
            f"Total: {order.total_amount}",
            order.status,
            str(datetime.datetime.now())
        ]
        
        if self.client:
            try:
                sheet = self.client.open(SHEET_NAME).get_worksheet(1) # Assuming sheet 2 for orders
                if not sheet: # Fallback to sheet 1
                    sheet = self.client.open(SHEET_NAME).sheet1
                sheet.append_row(data)
                print(f"Added order {order.id} to Google Sheet.")
            except Exception as e:
                print(f"Failed to write order to Sheet: {e}")
        else:
            print(f"[MOCK] Added Order to Sheet: {data}")

    def create_calendar_event(self, appointment):
        """Creates an event in Google Calendar."""
        if not self.service_calendar:
            print(f"[MOCK] Created Calendar Event: {appointment} for {appointment.user.email}")
            return

        try:
            # Construct start/end time in ISO format
            start_dt = datetime.datetime.combine(appointment.date, appointment.time)
            end_dt = start_dt + datetime.timedelta(minutes=30)
            
            event = {
                'summary': f'Appointment with Dr. {appointment.doctor.name}',
                'location': f'{appointment.doctor.hospital.name}, {appointment.doctor.hospital.location}',
                'description': f'Health Appointment for {appointment.user.username}',
                'start': {
                    'dateTime': start_dt.isoformat(),
                    'timeZone': 'UTC',
                },
                'end': {
                    'dateTime': end_dt.isoformat(),
                    'timeZone': 'UTC',
                },
                'attendees': [
                    {'email': appointment.user.email},
                    # {'email': 'msmayil20@gmail.com'}, # Admin email
                ],
            }

            event = self.service_calendar.events().insert(calendarId=CALENDAR_ID, body=event).execute()
            print('Event created: %s' % (event.get('htmlLink')))

        except Exception as e:
            print(f"Failed to create calendar event: {e}")
