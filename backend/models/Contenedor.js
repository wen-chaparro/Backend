const mongoose = require('mongoose');

const contenedorSchema = new mongoose.Schema({
  capacidadMaxima: { type: Number, required: true },
  nivelActualAceite: { type: Number, required: true },
  dispositivoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispositivo' },
  sensorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sensor' }
});

module.exports = mongoose.model('Contenedor', contenedorSchema);
