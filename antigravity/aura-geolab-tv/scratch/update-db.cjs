const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('aura.db');
db.run("UPDATE displays SET visualStyle = 'geolab' WHERE id = '3lxY0IcAPobwLVbssVk3AWo58uk2'", [], (err) => {
  if (err) {
    console.error("Error updating DB:", err);
  } else {
    console.log("Local database updated successfully: visualStyle set to 'geolab' for user 3lxY0IcAPobwLVbssVk3AWo58uk2");
  }
  db.close();
});
