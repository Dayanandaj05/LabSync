# Special Classes Implementation (Periods 10 & 11)

## Overview
Added comprehensive support for special class hours (periods 10 and 11) with mandatory reason collection and reporting integration.

## Features Implemented

### 1. **Special Reason Collection**
- **Periods Covered**: Period 10 (3:20-4:30) and Period 11 (4:30-6:00)
- **Mandatory Field**: Special reason is required when booking periods 10 or 11
- **UI Indicators**: Orange styling and warning icons for special periods

### 2. **Frontend Changes**

#### BookingModal.jsx
- Added `specialReason` state
- Added validation for special periods
- Added special reason input field with orange styling
- Shows special reason in existing booking views

#### RecurringBooking.jsx
- Added `specialReason` state and validation
- Added period 10 back to period selector
- Added special reason input field
- Orange styling for periods 10 & 11 when selected
- Validation in both regular and exam modes

#### TimetableGrid.jsx
- Added period 10 to PERIOD_LABELS
- Shows special reason in booking cells for periods 10 & 11

### 3. **Backend Changes**

#### Booking Model
- Added `specialReason` field to schema

#### Booking Routes
- Added `specialReason` handling in single and recurring booking endpoints
- Passes special reason through all booking creation flows

#### Admin Routes
- Added special reason to CSV export (new column)
- Added special reason to PDF export (new column)
- Updated bulk timetable upload to handle special reasons

### 4. **Report Integration**

#### CSV Export
- New column: "Special Reason"
- Shows special reasons for periods 10 & 11
- Empty for regular periods

#### PDF Export
- New column: "Special Reason" 
- Shows "Not specified" for periods 10 & 11 without reasons
- Shows "N/A" for regular periods

#### Bulk Upload
- Accepts `specialreason` header in CSV files
- Automatically applies special reasons to uploaded timetables

## Usage Examples

### 1. **Single Booking**
1. Select period 10 or 11 in booking modal
2. Orange "Special Class Reason" field appears
3. Enter reason (e.g., "Project completion session")
4. Reason is stored and displayed in reports

### 2. **Recurring Booking**
1. Select periods including 10 or 11
2. Orange warning appears: "Special periods selected"
3. Special reason field becomes mandatory
4. All recurring bookings get the same special reason

### 3. **Bulk Upload**
CSV format with special reason:
```csv
day,period,lab,subject,purpose,specialreason,startDate,endDate
Mon,10,CC,CS101,Advanced Lab,Extra practice session,2024-01-15,2024-05-15
Tue,11,IS,CS102,Project Work,Project completion,2024-01-15,2024-05-15
```

### 4. **Report Generation**
- CSV reports include special reasons in dedicated column
- PDF reports show special reasons for extended hours
- Filtering and sorting work with special reason data

## Validation Rules

1. **Mandatory Reason**: Special reason required for periods 10 & 11
2. **Frontend Validation**: Prevents submission without reason
3. **Backend Validation**: Server-side validation for API calls
4. **Bulk Upload**: Accepts optional special reasons in CSV

## Visual Indicators

1. **Period Selector**: Orange styling for periods 10 & 11
2. **Input Field**: Orange border and background for special reason
3. **Timetable Grid**: Orange badge showing special reason
4. **Booking Modal**: Orange section for special reason display

## Database Schema
```javascript
{
  // ... existing fields
  specialReason: { type: String }, // For periods 10 & 11 special classes
  // ... rest of schema
}
```

## API Changes

### Single Booking
```javascript
POST /api/bookings
{
  // ... existing fields
  specialReason: "Project completion session" // For periods 10 & 11
}
```

### Recurring Booking
```javascript
POST /api/bookings/recurring
{
  // ... existing fields
  specialReason: "Extra practice session" // Applied to all bookings
}
```

## Testing Checklist

- [ ] Single booking with period 10/11 requires special reason
- [ ] Recurring booking with period 10/11 requires special reason
- [ ] Special reason appears in timetable grid
- [ ] Special reason appears in booking modal views
- [ ] CSV export includes special reason column
- [ ] PDF export includes special reason column
- [ ] Bulk upload accepts special reason from CSV
- [ ] Validation prevents submission without special reason
- [ ] Regular periods (1-9) don't require special reason

## Notes

- Period 10 and 11 represent extended class hours beyond normal schedule
- Special reasons help track why extended hours were needed
- Reports now provide complete visibility into special class usage
- Bulk upload supports both specific dates and recurring patterns with special reasons