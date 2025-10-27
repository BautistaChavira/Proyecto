En este segundo avance habilitaremos el backend y completaremos los scripts para que se pueda desplegar el servicio web de forma relativamente sencilla desde proveedores de servidores como render.

Primero que hay que aclarar que el despliegue se separa en varios pasos dadas las limitaciones del proveedor del servicio. En esta caso para render tenemos que hacer un contenedor solo para la base de datos y luego conectarnos a ella desde otro servicio contenedor

Primero creamos un contendor para una base de datos de postgres

<img width="322" height="401" alt="{D0B74EFC-6FCF-4807-BA2E-DFDA21DF1D07}" src="https://github.com/user-attachments/assets/f232959b-0eaa-4027-a886-7a8535ddde56" />


Dependiendo de la URL que nos de el proveedor del servicio o en cuál sea la URL de donde quiera que tengas tu base de datos, tendrás que modificar el script init-db.ts para que apunte a dicha url (o añadirla como variable de entorno, que sería lo ideal de hecho)

<img width="1224" height="201" alt="{AFE267F3-E038-4409-A8AA-5EBAF2C96721}" src="https://github.com/user-attachments/assets/49685d57-bedb-4de9-ba7c-111d7c16c1ad" />


En mi caso para Render, se nos proporciona una URL para la BD, en mi caso puedo usar una URL interna que solo funciona entre servicios de Render que es más corta y segura

<img width="664" height="123" alt="image" src="https://github.com/user-attachments/assets/6a2daf93-7813-48da-921a-ce279398fee2" />


Recordemos que en la linea del script se usa la url especificada por la variable de entorno o la que esta en el script, cualquiera de las dos forma debería funcionar pero por obvias cuestiones de seguridad no deberías de poner la url en el código dado que pues... bueno el código es público en github


Desplegar el backend de forma similar al front solo debemos poner backend como directorio root y los build y start comand son tal cual esos. npm buil y npm start
