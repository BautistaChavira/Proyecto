Este proyecto se compone de 3 servidores separados
Tenemos:
1.- El servidor que tiene el frontend
2.- El servidor que tiene backend que maneja la api y la conexión con otras apis como la de la IA
3.- El servidor de la base de datos.
¿Qué hace?
La utilidad principal de la página es escanear fotos de animales y distinguir entre perros y gatos. Adicionalmente como los requerimientos del proyecto incluían inicio de sesión, optamos por incluir un listado de mascotas personales, que básicamente guarda mascotas en la BD con el id del usuario que las registró como llave foránea. 
El sistema tiene algunas pocas funcionalidades que no dependen del inicio de sesión pero la consulta de imágenes con la IA y el listado de mascotas registrados requieren inicio de sesión para funcionar.
El componente de login se accede haciendo click en el botón con el logo usuario o en el texto justo enseguida de dicho botón que dice Iniciar Sesión. Al pulsarlo se renderiza el componente de login. En dicho componente hay dos funciones, Registrarse y hacer Login
Los apartados de Home, Catálogo y Curiosidades son meramente informativos y no contienen funcionalidades que reaccionen con el usuario en el sentido de que procesen información, simplemente muestran los ejemplos que hay en la BD.
Las pestañas de “Mis Mascotas” y “Consulta por Foto” son las que realmente le permiten al usuario interactuar.
Consulta por foto permite al usuario subir una imagen, al cargarla al navegador este la manda al api express que a su vez la manda por medio del api de hugging face al modelo de inteligencia artificial Microsoft Resnet-50, que es un modelo de inteligencia artificial de reconocimiento de imágenes. No esta específicamente entrenado para el reconocimiento de razas de perros o gatos, pero si cumple medianamente bien su propósito si lo acompañamos de un script para discriminar el resultado de lo que arroja.
La IA simplemente nos regresa la etiqueta con más peso dentro de lo que rescató de la imagen, es decir, si lo más reconocible de una imagen es un gato, nos retornará una etiqueta que diga que es un gato o un gato de una raza en particular.
Un script en el backend toma la etiqueta de la respuesta de la IA y la compara con un listado de razas o palabras clave más comunes entre razas de perros y gatos y hace una búsqueda parcial. Si un término de la respuesta coincida con cualquier de los de esta lista se considera mascota. Si coincide específicamente con los del arreglo de perros o gatos se le asigna si es gato o perro. Para ampliar el catálogo de razas de perros que se reconozcan como perro habría que ampliar este listado. Esto se debe a que la IA no retorna una etiqueta deseada en concreto, pero nos da la etiqueta con más peso.

<img width="921" height="526" alt="image" src="https://github.com/user-attachments/assets/e40f2eb5-f5bf-4555-bf09-d2caf8a7612f" />

Cómo esta implementado?

La página web esta dividida en componentes, cada menú es un componente separado, el componente App siempre se esta renderizando, renderiza una barra de navegación arriba y va renderizando los demás componentes en lo que resta de la pantalla conforme se van necesitando. Los datos del usuario se los van pasando como props conforme sea necesario. Solo se usó React + Vite, y por ende node.js.
El backend está corriendo express con estas dependencias
bcrypt para hashear contraseñas de forma segura. Se usa para proteger credenciales antes de guardarlas en la base de datos.
cors  para que la API sea accesible desde otros dominios como el entorno de prueba local.
dotenv para usar claves secretas desde las variables de entorno.
express como la api rest. Maneja rutas, middleware, peticiones y respuestas.
node-fetch como cliente http para hacer peticiones desde el backend (como enviar imágenes a Hugging Face o Resend, aunque todos los demás proveedores se fresearon pero bueno). 
Y pg com cliente oficial de PostgreSQL para Node.js
El backend tiene esta estructura

<img width="256" height="513" alt="image" src="https://github.com/user-attachments/assets/c7743a8f-d3c8-45c1-abf2-4f85a7e042b9" />

Donde lo más importante es el index.ts que contiene la lógica de todos los endpoints y llamadas a la base de datos, el init.sql que crea la base de datos de forma automática al desplegarse, ya que render te cobra para ver un panel de control de la BD y aiClient.ts que es el que hace las peticiones al api de la IA que usamos.
Usamos como inteligencia artificial el modelo de reconocimiento de y clasificación de imágenes Resnet-50 de Microsoft del proveedor HuggingFace.  De momento la estamos usando con el plan de prueba que solo deja hacer menos de 0.1 dólares

<img width="816" height="891" alt="image" src="https://github.com/user-attachments/assets/e62134d4-3744-42e4-a603-556c830a3e34" />

¿Cómo se despliega?
Primero tenemos que hacer un servidor para base de datos postgres. En mi caso particular para render lo tuve que hacer así porque render no deja alojar base de datos y servicios web varios a la vez.
Una vez creamos la Base de datos deberíamos tener una URL de acceso y credenciales de usuario, estas credenciales de usuario deben ser puestas en el servidor Backend (que recordemos es el que recibe peticiones de la página del front y consulta la BD).
Todos los servicios a los que se conecta el backend deberían de estar conectados por medio de las variables de entorno para no exponer nuestras conexiones en el código, sin embargo, también puede modificar el código en líneas como ésta. No es recomendable pero también se puede

<img width="921" height="63" alt="image" src="https://github.com/user-attachments/assets/4204f7fe-69ac-464e-91fb-63c145c069fa" />

El panel de entorno de Render nos deja poner varias variables de entorno en él. Así se debería de ver nuestro panel de entorno

<img width="921" height="247" alt="image" src="https://github.com/user-attachments/assets/47693e38-fe50-48dd-9400-4defeaf4462f" />

Con la Api Key para conectarnos con el api de la IA de HuggingFace, La URL para la BD ( que ya debe incluir en ella las credenciales de usuario ), y las variables para el uso de hasheo y seguridad.
Cabe destacar que cambiar de modelo de inteligencia artificial implicaría potencialmente cambiar la forma en la que se maneja la respuesta en el “aiClient.ts” y/o el archivo con los endpoints de expres “index.ts”

Una vez creado el servidor de la BD y obtenidas las URL y Api Keys, procedemos a desplegar el servidor Backend, para desplegarlo simplemente despliega desde Render con las cinco variables de entorno ya puestas. El servidor arranca solo gracias a los archivos de configuración y dependencias. Solo tienes que desplegar a partir del directorio Backend del repositorio de github en vez de desplegar desde la raíz. Backend, no root.
El servidor Backend tiene un archivo “init.sql” que contiene las sentencias para crear la estructura de las tablas en la base de datos suficiente para que le proyecto funcione. Si no es la primera vez que despliegas el back, verás un mensaje en consola con algo así como “Las tablas ya están creadas” dando a entender que se intentaron volver a crear, pero no fue necesario.
Una vez dado de alta el back ya solo falta desplegar el servidor frontend con la página web de react. De igual forma debería poder desplegarse con los comandos de siempre, “npm install” y “npm start” de forma automática, solamente tienes que cambiar el directorio de despliegue de root a Frontend en la configuración de despliegue sobre repositorios de github.
El frontend también puede hacer uso de una variable de entorno, o también puedes poner la url después del || , (no recomendable) 

<img width="639" height="61" alt="image" src="https://github.com/user-attachments/assets/ce80268f-bf2d-49c4-abaf-dbe12f92ef6d" />

En resumidas cuentas, el despliegue consiste en
Crear una BD en render.
Crear un servidor para servicios web en render, poner las variables de entorno que requiere el back (key de la ia, salt, bycript rounds, db url).
Desplegar el backend.
Crear un servidor para página web en render, poner la url de la api como variable de entorno.
Desplegar el front.

Pruebas de la página en funcionamiento

<img width="921" height="852" alt="image" src="https://github.com/user-attachments/assets/7eb9122d-e3d6-49e6-a38e-4ccc9dcf1aa0" />

<img width="921" height="495" alt="image" src="https://github.com/user-attachments/assets/cb9ceda9-7c6c-472e-8189-0a0996f29f6a" />

<img width="920" height="783" alt="image" src="https://github.com/user-attachments/assets/d967b40a-31de-4b44-9d6a-9ec0b686e267" />

<img width="1796" height="935" alt="{456175DE-C06A-40F5-A9E1-C1E4BE2BD986}" src="https://github.com/user-attachments/assets/e000bf18-ef91-4cb0-8f35-de52c5981839" />






