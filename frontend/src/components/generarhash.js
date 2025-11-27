const bcrypt = require("bcrypt");

const generarHash = async () => {
  const password = "admin"; // ← la contraseña que quieres usar
  const hash = await bcrypt.hash(password, 10);
  console.log("Hash generado:", hash);
};

generarHash();