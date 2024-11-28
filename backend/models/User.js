const mongoose = require('mongoose');
const crypto = require('crypto');

const usuarioSchema = new mongoose.Schema({
  nombreUsuario: { type: String, unique: true, required: true },
  contrasena: { type: String, required: true },
  email: { type: String, unique: true, required: true,  },
  fechaRegistro: { type: Date, default: Date.now },
  rol: { type: String }, // Asignar 'usuario' por defecto
});


// Middleware para aplicar el hash MD5 a la contraseña antes de guardar
usuarioSchema.pre('save', function (next) {
  if (this.isModified('contrasena')) {
    this.contrasena = crypto.createHash('md5').update(this.contrasena).digest('hex');
  }
  next();
});

module.exports = mongoose.model('Usuario', usuarioSchema);
