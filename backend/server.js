const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const crypto = require('crypto');
// Importar modelos
const Usuario = require('./models/User.js');
const Dispositivo = require('./models/Dispositivo.js');
const Administrador = require('./models/admin.js');
const Contenedor = require('./models/Contenedor.js');
const HistorialFiltrado = require('./models/HistorialFiltrado.js');
const { Admin } = require('mongodb');
const admin = require('./models/admin.js');

// Clave secreta para JWT
const JWT_SECRET = 'tu_clave_secreta';
const JWT_ADMIN= 'tu_clave_admin';

const app = express();
app.use(express.json());


const conexion ="mongodb+srv://wench2707:Lukas$2011@cluster0.thilx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
mongoose.connect(conexion, {

}).then(()=> console.log("Conectado a Mongo"))
.catch(err=> console.log(err))

//Servicio Usuarios - registro y login con jwt ----------------------------------------------------------------------------------------------------------

//CORS desde localhost origen específico de tu frontend 
app.use(cors({ origin: 'http://localhost:8082',  
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos HTTP permitidos 
  credentials: true // Habilita cookies si es necesario 
  })); 
  

// Resto de la configuración de tu servidor
app.use(express.json());


// Middleware para verificar el token JWT
const autenticarJWT = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  try {
    // Verificar el token y obtener la información del usuario
    const datos = jwt.verify(token, JWT_SECRET);
    req.usuarioId = datos.id;
     // Se añade el rol al objeto `req` para ser usado en las rutas protegidas
    next();
  } catch (error) {
    res.status(403).json({ error: 'Token inválido' });
  }
};

// Ejemplo de ruta protegida usando el middleware de autenticación
app.get('/usuarios/id', autenticarJWT, async (req, res) => {
  try {
    const usuario = await Usuario.findOne({email : req.usuarioId});
    if (!usuario) return res.status(404).send('Usuario no encontrado');

    res.send(usuario);
  } catch (error) {
    res.status(500).send(error);
  }
});


// Ruta para registro de usuarios
app.post('/registro', async (req, res) => {
  try {
    const { nombreUsuario, contrasena, email, dispositivoId, contrasenaConfirmacion } = req.body;

    // Verificar que las contraseñas coincidan
    if (contrasena !== contrasenaConfirmacion) {
      return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
    }

    // Verificar si ya existe un usuario con el mismo correo o nombre de usuario
    const correoExistente = await Usuario.findOne({ email  });
    const usuarioExistente = await Usuario.findOne({nombreUsuario});

    if (usuarioExistente) {
      console.log('usuario en uso');
      return res.status(400).json({ error: 'El nombre de usuario ya está en uso.' });
      
    }
    if (correoExistente) {
      return res.status(400).json({ error: 'El correo electrónico ya está en uso.' });
    }


    // Crear el usuario con la contraseña encriptada
    const nuevoUsuario = new Usuario({
      nombreUsuario,
      contrasena,
      email,
      rol: 'usuario' // Por defecto asignamos el rol 'usuario'
    });

    // Guardar el usuario en la base de datos
    await nuevoUsuario.save();

    res.status(201).json({ message: 'Usuario registrado exitosamente', usuario: nuevoUsuario });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar el usuario', detalle: error.message });
  }
});

// Ruta para registrar administradores
app.post('/registroAdmin', autenticarJWT, async (req, res) => {
  const { nombreUsuario, contrasena, rol } = req.body;

  try {
    // Obtener el usuario autenticado
    const usuarioAutenticado = await Usuario.findOne({ email: req.usuarioId }); // Usar `email` para buscar al usuario
    if (!usuarioAutenticado) {
      return res.status(404).json({ error: 'Usuario autenticado no encontrado.' });
    }


    // Verificar si el usuario tiene permiso para crear administradores
    if (usuarioAutenticado.rol !== 'usuario') {
      return res.status(403).json({ error: 'No tienes permisos para crear administradores.' });
    }

    // Verificar si ya existe un administrador con el mismo nombre de usuario
    const adminExistente = await Administrador.findOne({ nombreUsuario });
    if (adminExistente) {
      return res.status(400).json({ error: 'El nombre de usuario ya está en uso.' });
    }

    // Crear el administrador y asignar el campo 'creadoPor'
    const nuevoAdmin = new Administrador({
      nombreUsuario,
      contrasena,
      rol : 'administrador',
      creadoPor: usuarioAutenticado.id // Relación con el usuario creador
    });

    // Guardar el administrador en la base de datos
    await nuevoAdmin.save();
    res.status(201).send({ message: 'Administrador registrado correctamente.' });
  } catch (error) {
    res.status(500).send({ error: 'Error al registrar el administrador.', detalle: error.message });
  }
});



// Ruta para login (autenticación de usuarios y administradores) CHECK :)
app.post('/login', async (req, res) => {
  const { email, contrasena } = req.body;
  
  try {
    // Verificar si el usuario existe
    const usuario = await Usuario.findOne({ email });
    if (!usuario) return res.status(400).json({ error: 'Clave o Usuario incorrecto' });
    
    // Comparación del hash almacenado con la contraseña en texto claro
    const cont2 = crypto.createHash('md5').update(contrasena).digest('hex');
    var esValida = false
    if(cont2 == usuario.contrasena){
       esValida = true  
      //await bcrypt.compare(contrasena, usuario.contrasena); 
    }
     
    if (!esValida) return res.status(400).json({ error: 'Clave o Usuario incorrecto' });

    // Generar el token JWT si las credenciales son válidas
    const token1 =  jwt.sign(
      { "id": email }, 
      JWT_SECRET, // Aquí pones tu clave secreta
      { expiresIn: '1h' }
    );
    
    // Enviar el token al cliente
    res.json({ token : token1 });
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor', detalle: error.message });
  }
});



//login para administradores

// Ruta de login
app.post('/login_Admin', async (req, res) => {
  const { nombreUsuario, contrasena } = req.body;
  
  try {
    // Verificar si el administrador existe
    const admin = await Administrador.findOne({ nombreUsuario: nombreUsuario });

    if (!admin) return res.status(400).json({ error: 'Clave o Usuario incorrecto' });
    
    // Comparación del hash almacenado con la contraseña en texto claro
    const cont2 = crypto.createHash('md5').update(contrasena).digest('hex');
    var esValida = false;
    if(cont2 == admin.contrasena) {
      esValida = true;  
    }
    
    if (!esValida) return res.status(400).json({ error: 'Clave o Usuario incorrecto' });

    // Generar el token JWT si las credenciales son válidas
    const token1 = jwt.sign(
      { "id": nombreUsuario },
      JWT_SECRET, // Aquí pones tu clave secreta
      { expiresIn: '30m' }
    );
    
    // Enviar el token al cliente
    res.json({ token: token1 });
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor', detalle: error.message });
  }
});



  
  //Actualización de usuarios
  app.put('/usuarios/:id', autenticarJWT, async (req, res) => {
    try {
      const usuario = await Usuario.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!usuario) return res.status(404).send();
      res.send(usuario);
    } catch (error) {
      res.status(400).send(error);
    }
  });

  //Eliminación de usuarios
  app.delete('/usuarios/:id', autenticarJWT, async (req, res) => {
    try {
      const usuario = await Usuario.findByIdAndDelete(req.params.id);
      if (!usuario) return res.status(404).send();
      res.send(usuario);
    } catch (error) {
      res.status(500).send(error);
    }
  });



//Servicio de Dispositivo ---------------------------------------------------------------------------------------------------------

// Crear un nuevo dispositivo
app.post('/dispositivos', async (req, res) => {
  try {
    const { ubicacion, estado, fechaInstalacion, tipoNegocio, cantidadLitros, dispositivoId } = req.body;

    // Validar que la cantidad de litros sea 5, 10 o 15
    if (![5, 10, 15].includes(cantidadLitros)) {
      return res.status(400).send({ error: "La cantidad de litros debe ser 5, 10 o 15." });
    }

    // Crear una nueva instancia del modelo con los datos validados
    const nuevoDispositivo = new Dispositivo({
      ubicacion,
      estado,
      fechaInstalacion,
      tipoNegocio,
      cantidadLitros,
      dispositivoId,
    });

    // Guardar en la base de datos
    await nuevoDispositivo.save();
    res.status(201).send(nuevoDispositivo);
  } catch (error) {
    // Manejo de errores, incluyendo violación de campo único
    if (error.code === 11000 && error.keyPattern?.dispositivoId) {
      res.status(400).send({ error: "El ID de dispositivo ya existe. Use un ID único." });
    } else {
      res.status(400).send(error);
    }
  }
});

  
// Obtener todos los dispositivos con soporte para filtros opcionales
app.get('/dispositivos', async (req, res) => {
  try {
    // Leer filtros desde los parámetros de consulta
    const { estado, tipoNegocio, cantidadLitros } = req.query;

    // Construir el objeto de búsqueda dinámicamente
    const filtro = {};
    if (estado) filtro.estado = estado;
    if (tipoNegocio) filtro.tipoNegocio = tipoNegocio;
    if (cantidadLitros) filtro.cantidadLitros = Number(cantidadLitros);

    // Consultar dispositivos en la base de datos con el filtro
    const dispositivos = await Dispositivo.find(filtro);
    res.send(dispositivos);
  } catch (error) {
    res.status(500).send({ error: "Error al obtener los dispositivos", detalles: error.message });
  }
});

// Obtener un dispositivo específico por ID
app.get('/dispositivos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validar que el ID sea válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ error: "El ID proporcionado no es válido." });
    }

    // Buscar el dispositivo por ID
    const dispositivo = await Dispositivo.findById(id);
    if (!dispositivo) {
      return res.status(404).send({ error: "Dispositivo no encontrado." });
    }

    res.send(dispositivo);
  } catch (error) {
    res.status(500).send({ error: "Error al obtener el dispositivo", detalles: error.message });
  }
});

// Actualizar un dispositivo
app.put('/dispositivos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidadLitros } = req.body;

    // Validar que el ID sea válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ error: "El ID proporcionado no es válido." });
    }

    // Validar que la cantidad de litros sea válida si se proporciona
    if (cantidadLitros && ![5, 10, 15].includes(cantidadLitros)) {
      return res.status(400).send({ error: "La cantidad de litros debe ser 5, 10 o 15." });
    }

    // Actualizar el dispositivo y devolver el documento actualizado
    const dispositivo = await Dispositivo.findByIdAndUpdate(id, req.body, { 
      new: true, 
      runValidators: true 
    });

    if (!dispositivo) {
      return res.status(404).send({ error: "Dispositivo no encontrado." });
    }

    res.send(dispositivo);
  } catch (error) {
    res.status(400).send({ error: "Error al actualizar el dispositivo", detalles: error.message });
  }
});

  
// Eliminar un dispositivo con motivo
app.delete('/dispositivos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    // Validar que el ID sea válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ error: "El ID proporcionado no es válido." });
    }

    // Validar que se proporcione un motivo
    if (!motivo || motivo.trim() === "") {
      return res.status(400).send({ error: "Debe proporcionar un motivo para la eliminación." });
    }

    // Eliminar el dispositivo
    const dispositivo = await Dispositivo.findByIdAndDelete(id);

    if (!dispositivo) {
      return res.status(404).send({ error: "Dispositivo no encontrado." });
    }

    // Registrar el motivo (aquí se podría guardar en un log o base de datos adicional)
    console.log(`Dispositivo eliminado. ID: ${id}, Motivo: ${motivo}`);

    res.send({ mensaje: "Dispositivo eliminado con éxito.", dispositivo, motivo });
  } catch (error) {
    res.status(500).send({ error: "Error al eliminar el dispositivo", detalles: error.message });
  }
});


  
  //Servicio de HistorialFiltrado ----------------------------------------------------------------------------------------------------
  
  // Crear un nuevo registro de historial de filtrado
  app.post('/historial-filtrado', async (req, res) => {
    try {
      const nuevoHistorial = new HistorialFiltrado(req.body);
      await nuevoHistorial.save();
      res.status(201).send(nuevoHistorial);
    } catch (error) {
      res.status(400).send(error);
    }
  });
  
  // Obtener todos los registros de historial de filtrado
  app.get('/historial-filtrado', async (req, res) => {
    try {
      const historial = await HistorialFiltrado.find();
      res.send(historial);
    } catch (error) {
      res.status(500).send(error);
    }
  });
  
  // Obtener un registro específico de historial de filtrado
  app.get('/historial-filtrado/:id', async (req, res) => {
    try {
      const historial = await HistorialFiltrado.findById(req.params.id);
      if (!historial) return res.status(404).send();
      res.send(historial);
    } catch (error) {
      res.status(500).send(error);
    }
  });
  
  // Eliminar un registro de historial de filtrado
  app.delete('/historial-filtrado/:id', async (req, res) => {
    try {
      const historial = await HistorialFiltrado.findByIdAndDelete(req.params.id);
      if (!historial) return res.status(404).send();
      res.send(historial);
    } catch (error) {
      res.status(500).send(error);
    }
  });


app.listen(3001, ()=>{
    console.log("Servidor escuchando por el puerto 3001");
})