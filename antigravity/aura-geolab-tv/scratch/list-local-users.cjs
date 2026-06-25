const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('aura.db');

db.all("SELECT id, email, role, slug FROM users", [], (err, rows) => {
  if (err) {
    console.error("Error fetching users:", err);
  } else {
    console.log("=== LOCAL USERS ===");
    console.log(rows);
  }
  
  db.all("SELECT id, establishmentName, visualStyle FROM displays", [], (err2, rows2) => {
    if (err2) {
      console.error("Error fetching displays:", err2);
    } else {
      console.log("=== LOCAL DISPLAYS ===");
      console.log(rows2);
    }
    db.close();
  });
});
