Choice: Update on a fixed interval (every 5 seconds)

Reason:
Calling UpdateFlightPosition on every animation tick (every 100ms) would
generate 10 database writes per second per active flight. This places
unnecessary load on the Wheatley server and the MySQL database, and could
cause rate-limiting or slow API responses that block the animation loop.

By updating on a fixed interval (every 5 seconds), the live position remains
smooth in the client (driven by server-side interpolation), while database
writes are reduced by 98%. The latest position is always held in server memory
and broadcast to subscribers in real time. The DB write only needs to be
accurate enough to resume from if the server restarts — every 5 seconds
is more than sufficient for that purpose.