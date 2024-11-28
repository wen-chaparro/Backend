const mongoose = require('mongoose');

const dispositivoSchema = new mongoose.Schema({
  ubicacion: { type: String, required: true },
  estado: { 
    type: String, 
    enum: ['Activo', 'Inactivo', 'Mantenimiento'], 
    required: true 
  },
  fechaInstalacion: { type: Date, default: Date.now },
  tipoNegocio: { 
    type: String, 
    enum: ['casa', 'restaurante', 'cafeteria', 'panaderia', 'pasteleria', 'comidas rapidas'] 
  },
  cantidadLitros: { 
    type: Number, 
    enum: [5, 10, 15], 
    required: true 
  },
  dispositivoId: { 
    type: String, 
    required: true, 
    unique: true 
  }
});

module.exports = mongoose.model('Dispositivo', dispositivoSchema);

