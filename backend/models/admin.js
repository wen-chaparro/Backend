const mongoose = require('mongoose');
const crypto = require('crypto');

const AdminSchema = new mongoose.Schema({
  nombreUsuario: { type: String, unique: true, required: true },
  contrasena: { type: String, required: true },
  fechaRegistro: { type: Date, default: Date.now },
  rol: { type: String }, // Asignar 'ADMIN' por defecto
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }
});


// Middleware para aplicar el hash MD5 a la contraseña antes de guardar
AdminSchema.pre('save', function (next) {
  if (this.isModified('contrasena')) {
    this.contrasena = crypto.createHash('md5').update(this.contrasena).digest('hex');
  }
  next();
});

module.exports = mongoose.model('Admin', AdminSchema);