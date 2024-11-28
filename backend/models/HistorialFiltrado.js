const mongoose = require('mongoose');

const historialFiltradoSchema = new mongoose.Schema({
  dispositivoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispositivo' },
  fechaHoraFiltrado: { type: Date, default: Date.now },
  cantidadAceiteFiltrado: { type: Number, required: true },
  sensorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sensor' }
});

module.exports = mongoose.model('HistorialFiltrado', historialFiltradoSchema);
