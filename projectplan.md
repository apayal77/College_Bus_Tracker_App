PHASE 1 — Foundation Setup
Prompt
Create complete project foundation for College Bus Tracker.

Frontend:
Generate React Native CLI structure with:
- navigation
- auth screens
- student dashboard placeholder
- driver dashboard placeholder
- admin module placeholder
- API service layer
- socket service layer
- OpenStreetMap placeholder

Backend:
Generate Node.js Express backend with:
- modular folder structure
- Express server
- Firebase Admin SDK setup
- Socket.IO server setup
- routes folder
- controllers
- middleware
- .env config

Generate:
all package installations
folder structure
package.json
server.js
socket setup
frontend setup
run commands

PHASE 2 — Firebase Phone Authentication
Prompt
Build Firebase phone OTP login.

Requirements:
- OTP authentication in React Native CLI
- Firebase setup
- login screen
- OTP verification screen
- secure auth persistence
- logout

After login:
Check Firestore users collection.
Only admin-approved phone numbers can enter.
Reject unauthorized users.

Route by role:
student dashboard
driver dashboard
admin dashboard

Generate:
Firebase auth setup
all screens
role-based navigation
validation
error handling
full code

PHASE 3 — Firestore Models
Prompt
Create Firestore database models.

Collections:
users
routes
trips

Generate schema structure:
Users:
name
phone
role
routeAssigned

Routes:
routeName
stops
driverId
studentIds

Trips:
status
startTime
endTime

Generate:
Firestore services
Node APIs
CRUD logic
seed data
validation

PHASE 4 — Admin Management
Prompt
Build admin management module.

Features:
Add students
Add drivers
Create routes
Assign routes
Edit users
Delete users
View route assignments

Generate:
admin screens
forms
Node APIs
Firestore integration
validation
error handling

PHASE 5 — Driver Dashboard and Trip Lifecycle
Prompt
Build driver dashboard.

Features:
- fetch assigned route
- show route stops
- start trip
- stop trip
- create trip records
- active trip status
- trip history

Generate:
UI
trip APIs
Firestore integration
frontend logic
error handling

PHASE 6 — Driver GPS Tracking
Prompt
Implement driver GPS tracking.

Use:
react-native-geolocation-service
react-native-background-geolocation

Requirements:
- Android permissions
- background location tracking
- foreground service
- send coordinates every 30 seconds
- persist to Firestore every 2 minutes
- emit coordinates through Socket.IO
- handle GPS off
- battery optimization

Generate:
tracking service
permissions setup
location logic
socket emit integration
all configs

PHASE 7 — Socket.IO Realtime Tracking (Core Phase)
Prompt
Build complete Socket.IO realtime tracking.

Requirements:
Driver emits:
locationUpdate

Students subscribe only to their route.
Use socket rooms.

Implement:
joinRoute room logic
locationUpdate events
tripStarted event
tripStopped event
broadcast only to same route
disconnect handling
reconnection logic
scalable socket architecture

Generate:
Socket.IO backend server
Socket client service for React Native
Room logic
Event handlers
Testing instructions
All code files

PHASE 8 — Student Live Tracking Map
Prompt
Build student live tracking screen.

Use OpenStreetMap.

Features:
- live map
- moving bus marker
- route polyline
- student stop marker
- receive Socket.IO updates
- animate moving marker

Generate:
Map screen
Socket integration
Marker animation
Polyline rendering
Performance optimization
Error handling

PHASE 9 — Socket Optimization
Prompt
Optimize realtime tracking.

Implement:
- location throttling
- reconnection recovery
- stale location handling
- socket heartbeat
- driver disconnect detection
- offline recovery

Generate production-grade socket improvements.

PHASE 11 — Notifications
PromptAdd Firebase Cloud Messaging.

Notifications:
trip started
bus near stop
trip ended

Generate setup and code.

PHASE 12 — Admin Live Monitoring Dashboard
Prompt
Build admin live monitoring.

Features:
see all active buses live
track all routes
trip logs
driver statuses
filter by route

Generate:
Dashboard
live map
socket integration
queries



Build Order (DO NOT CHANGE)

1 Foundation 2 Firebase auth 3 Firestore models 4 Admin CRUD 5 Trip lifecycle 6 GPS tracking 7 Socket.IO realtime 8 Student map 9 Socket optimization 10 ETA optional 11 Notifications 12 Admin monitoring 13 Security 14 Testing

Phase-by-phase only



