El proyecto de momento cuenta con la estructura básica del esqueleto de los elementos del frontend. Contiene solo los elementos de la interfaz sin un diseño estético

<img width="1920" height="911" alt="{28EBE25C-D044-434F-8AB9-97FC6C06599F}" src="https://github.com/user-attachments/assets/62d2dc1e-31e5-48c4-a735-a8bc0e4de17f" />

La estructura del funcionamiento de la página es que lo que se carga se un solo dominio sin subdominios y toda la interactividad y redirecciones en realidad las maneja react

Los distintos menús están separados en distintos archivos o componentes así que simplemente los desplegamos o vamos alternando como sea necesario, el código fue diseñado de la forma más modular posible

Los botones ya redirigen entre componentes y los componentes que deberían de hacer consultas a bases de datos en realidad si tratan de hacer las consultas, el código ya hace llamadas a un endpoint, pero los nombres de las url que usé son solo placeholders dado que
aún no completamos el desarrollo escencial del servidor de la api ni la base de datos. El front trata de hacer las consultas y al fallar porque ni las url estan bien ni los servidores existen, pone datos por defecto hardcodeados

<img width="928" height="113" alt="image" src="https://github.com/user-attachments/assets/14b6b6f3-b7a4-402d-bd3e-60a871747e0f" />

La  página ya puede ser desplegada directamente, solo tienes que configurar tu hostinger o servidor para arrancar la página desde el directorio frontend, no desde la raíz del proyecto

El directorio de backend de momento solo tiene la estructura básica de los archivos que vamos a necesitar para que puedas desplegar también la base de datos y la api de forma relativamente sencilla, pero los scripts y el sql que usaremos para generar la base de datos aún no
están hechos

<img width="367" height="170" alt="{3F9793DE-09AC-4AE0-B1FC-B013DC08BFB9}" src="https://github.com/user-attachments/assets/a9c336b0-00fc-4164-89ff-e4cfa6a03be3" />

(Trabajo en progreso)
