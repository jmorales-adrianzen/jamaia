import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'; // 👈 AGREGA ESTA LÍNEA AQUÍ


@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './planner.component.html',
  styleUrls: ['./planner.component.css']
})
export class PlannerComponent implements OnInit {
  personas: number = 4;
  maxPersonas: number = 10;
  minPersonas: number = 1;
  paisActual: string = 'PE';
  simboloMoneda: string = 'S/';
  
  cargando: boolean = false;
  mostrarResultado: boolean = false;
  selectAllChecked: boolean = false;

  constructor(private sanitizer: DomSanitizer) {}

  menuSemanal = {
    lunes: 'ninguno',
    martes: 'ninguno',
    miercoles: 'ninguno',
    jueves: 'ninguno',
    viernes: 'ninguno',
    sabado: 'ninguno',
    domingo: 'ninguno'
  };

  despensa: { [key: string]: boolean } = {
    arroz: false, aceite: false, sal: false, pimienta: false, comino: false,
    azucar: false, fideos: false, atun: false, lenteja_id: false, frejol_id: false,
    hamburguesa: false, nuggets: false, leche: false, mantequilla: false, galleta_soda: false
  };

  platosDisponibles: { key: string; nombre: string }[] = [];
  comprasGlobales: { [nombre: string]: { cant: number; unidad: string; costo: number } } = {};
  costoTotalGlobal: number = 0;
  htmlCompras: string = '';
 htmlSugerencias: SafeHtml | string = '';

  CatPlatosPeru: { [key: string]: any } = {
    ninguno: {
      nombre: "— Ninguno / Descanso —",
      ingredientes: [],
      sugerenciaPrevia: "",
      preparacion: "",
      imagen: ""
    },
    lentejas_pescado: {
      nombre: "Lentejas con pescado frito",
      imagen: "assets/imagenes/lentejas-con-pescado-frito.jpg",
      ingredientes: [
        { id: "lenteja_id", nombre: "Lentejas", cant: 125, unidad: "g", precioUnit: 0.01 },
        { id: "pescado", nombre: "Pescado Bonito", cant: 200, unidad: "g", precioUnit: 0.012 },
        { id: "cebolla_ajo", nombre: "Cebolla y Ajo", cant: 40, unidad: "g", precioUnit: 0.006 }
      ],
      sugerenciaPrevia: "Remojar las lentejas 2 a 3 horas antes en agua templada con una pizca de sal para acelerar su cocción y mejorar su digestibilidad.",
      preparacion: "1. Sofríe en una olla cebolla finamente picada y ajo molido hasta que transparenten.<br>2. Agrega las lentejas escurridas, cubre con agua o caldo caliente y cocina a fuego medio por 25 min.<br>3. Sazona el pescado Bonito con sal, pimienta, comino y gotas de limón.<br>4. Pásalo por harina limpia, sacude el exceso y fríelo en aceite bien caliente por 3 min por lado hasta dorar saliendo crujiente.<br>5. Sirve acompañado de salsa criolla fresca."
    },
    carne_papas: {
      nombre: "Carne frita con papas doradas, ensalada y arroz",
      imagen: "assets/imagenes/carne-frita-papas-ensalada-arroz.jpg",
      ingredientes: [
        { id: "carne", nombre: "Bistec de carne", cant: 150, unidad: "g", precioUnit: 0.033 },
        { id: "papa", nombre: "Papa Blanca/Canchán", cant: 200, unidad: "g", precioUnit: 0.003 },
        { id: "ensalada", nombre: "Tomate y Lechuga", cant: 150, unidad: "g", precioUnit: 0.005 },
        { id: "limon", nombre: "Limón", cant: 1, unidad: "unid", precioUnit: 0.3 },
        { id: "arroz", nombre: "Arroz", cant: 100, unidad: "g", precioUnit: 0.004 }
      ],
      sugerenciaPrevia: "Sancochar las papas peladas con sal con anticipación para dorarlas de inmediato sin que absorban demasiado aceite.",
      preparacion: "1. Corta las papas sancochadas en rodajas gruesas y dóralas en sartén caliente con mantequilla o aceite hasta formar costra dorada.<br>2. Condimenta la carne con pimienta, comino, abundante ajo y sal al gusto.<br>3. Pásala a fuego alto durante 2 minutos por lado para sellar todos sus jugos.<br>4. Corta lechuga y tomate en rodajas, adereza con limón, aceite y sal minutos antes de servir."
    },
    pollo_plancha: {
      nombre: "Pollo a la plancha con ensalada y papas doradas",
      imagen: "assets/imagenes/pollo-plancha-ensalada-papas-doradas.jpg",
      ingredientes: [
        { id: "pollo_pechuga", nombre: "Pechuga de pollo", cant: 175, unidad: "g", precioUnit: 0.016 },
        { id: "papa", nombre: "Papa Blanca/Canchán", cant: 200, unidad: "g", precioUnit: 0.003 },
        { id: "ensalada", nombre: "Tomate y Lechuga", cant: 150, unidad: "g", precioUnit: 0.005 },
        { id: "limon", nombre: "Limón", cant: 1, unidad: "unid", precioUnit: 0.3 }
      ],
      sugerenciaPrevia: "Filetear la pechuga delgada y marinar con ajo, orégano seco, pimienta y chorro de vinagre durante al menos 30 minutos.",
      preparacion: "1. Calienta la plancha o sartén antiadherente a fuego máximo con un pincelado de aceite.<br>2. Coloca los filetes de pollo y déjalos cocinar 3 a 4 minutos por lado sin moverlos para marcar bien la carne.<br>3. Saltea las papas pre-sancochadas en la misma sartén para aprovechar los jugos del pollo.<br>4. Acompaña con abundante ensalada fresca aderezada al instante."
    },
    frejol_atun: {
      nombre: "Frejoles con arroz y croqueta de atún",
      imagen: "assets/imagenes/frejoles-arroz-croqueta-atun.jpg",
      ingredientes: [
        { id: "frejol_id", nombre: "Fréjol Canario/Panamito", cant: 125, unidad: "g", precioUnit: 0.01 },
        { id: "atun", nombre: "Lata de Atún", cant: 0.5, unidad: "lata", precioUnit: 5.0 },
        { id: "huevos", nombre: "Huevos", cant: 1, unidad: "unid", precioUnit: 0.7 },
        { id: "cebolla_ajo", nombre: "Cebolla y Ajo", cant: 40, unidad: "g", precioUnit: 0.006 },
        { id: "arroz", nombre: "Arroz", cant: 100, unidad: "g", precioUnit: 0.004 }
      ],
      sugerenciaPrevia: "⚠️ Tarea previa fundamental: Remojar los fréjoles en abundante agua limpia desde la noche anterior (mínimo 8 horas).",
      preparacion: "1. Sancocha los fréjoles remojados en olla a presión o tradicional con un trozo de tocino u orégano.<br>2. Prepara un aderezo criollo denso con cebolla picadita y ajo, vierte sobre los fréjoles y bate vigorosamente para espesar el caldo.<br>3. Drena el atún, mézclalo con huevo, cebolla china, galleta molida o harina, pimienta y sal.<br>4. Forme hamburguesitas/croquetas y fríelas hasta que queden doraditas por fuera."
    },
    pure_broaster: {
      nombre: "Puré con pollo broaster y arroz",
      imagen: "assets/imagenes/pure-pollo-broaster-arroz.jpg",
      ingredientes: [
        { id: "pollo_presas", nombre: "Pollo en presas", cant: 300, unidad: "g", precioUnit: 0.011 },
        { id: "papa", nombre: "Papa Amarilla/Canchán", cant: 250, unidad: "g", precioUnit: 0.0035 },
        { id: "leche", nombre: "Leche evaporada", cant: 0.25, unidad: "lata", precioUnit: 4.2 },
        { id: "mantequilla", nombre: "Mantequilla", cant: 20, unidad: "g", precioUnit: 0.02 },
        { id: "harina_chuno", nombre: "Harina y Chuño", cant: 80, unidad: "g", precioUnit: 0.005 },
        { id: "huevos", nombre: "Huevos", cant: 0.5, unidad: "unid", precioUnit: 0.7 },
        { id: "arroz", nombre: "Arroz", cant: 100, unidad: "g", precioUnit: 0.004 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Sancochar ligeramente las presas de pollo durante 10 min en agua con sal para garantizar que no queden crudas cerca del hueso al freír.",
      preparacion: "1. Prensa la papa sancochada tibia. En una olla disuelve mantequilla con leche evaporada tibia, integra la papa prensada y remueve vigorosamente hasta cremar.<br>2. Para el empanizado: Mezcla harina con chuño, pimienta, comino, pimentón dulce y sal.<br>3. Pasa el pollo precocido por huevo batido y empápalo en la mezcla seca.<br>4. Fríe en abundante aceite hondo caliente hasta lograr una capa crocante y dorada."
    },
    tallarin_verde: {
      nombre: "Tallarín verde con chuleta de cerdo",
      imagen: "assets/imagenes/tallarines-verde-chuleta-cerdo.jpg",
      ingredientes: [
        { id: "chuleta", nombre: "Chuleta de Cerdo", cant: 200, unidad: "g", precioUnit: 0.02 },
        { id: "fideos", nombre: "Fideos Spaguetti", cant: 125, unidad: "g", precioUnit: 0.006 },
        { id: "espinaca_albahaca", nombre: "Espinaca y Albahaca", cant: 100, unidad: "g", precioUnit: 0.008 },
        { id: "queso_fresco", nombre: "Queso fresco", cant: 60, unidad: "g", precioUnit: 0.028 },
        { id: "leche", nombre: "Leche evaporada", cant: 0.2, unidad: "lata", precioUnit: 4.2 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Deshojar, lavar cuidadosamente las hojas de espinaca y albahaca, y dorar ligeramente la albahaca en sartén para potenciar su aroma.",
      preparacion: "1. Blanquea la espinaca en agua hirviendo por 1 minuto. Licúala junto a la albahaca, queso fresco, leche evaporada y sofrito de cebolla.<br>2. Cocina los fideos al dente en abundante agua hirviendo con sal.<br>3. Vierte la salsa verde sobre los fideos recién escurridos y mezcla a fuego bajo por 2 min.<br>4. Dora las chuletas de cerdo previamente marinadas con ajo, vinagre, pimienta y sal en sartén bien caliente."
    },
    aji_gallina: {
      nombre: "Ají de gallina",
      imagen: "assets/imagenes/aji-de-gallina.jpg",
      ingredientes: [
        { id: "pollo_pechuga", nombre: "Pechuga de pollo", cant: 200, unidad: "g", precioUnit: 0.016 },
        { id: "aji_amarillo", nombre: "Ají amarillo molido", cant: 40, unidad: "g", precioUnit: 0.01 },
        { id: "galleta_soda", nombre: "Galleta de soda o Pan", cant: 40, unidad: "g", precioUnit: 0.008 },
        { id: "leche", nombre: "Leche evaporada", cant: 0.2, unidad: "lata", precioUnit: 4.2 },
        { id: "papa", nombre: "Papa Amarilla", cant: 150, unidad: "g", precioUnit: 0.004 },
        { id: "huevos", nombre: "Huevos duros", cant: 0.5, unidad: "unid", precioUnit: 0.7 },
        { id: "arroz", nombre: "Arroz", cant: 100, unidad: "g", precioUnit: 0.004 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Sancochar la pechuga de pollo con una rama de apio y deshilacharla fina. Remojar la galleta de soda en leche con anticipación.",
      preparacion: "1. Prepara un aderezo muy paciente con cebolla picadita, ajo molido y ají amarillo licuado hasta que el aceite se separe.<br>2. Agrega la galleta rehidratada licuada junto con un poco de caldo de pollo caliente.<br>3. Incorpora el pollo deshilachado, ajusta sal y remueve constantemente hasta lograr textura cremosa.<br>4. Sirve sobre rodajas de papa amarilla sancochada y decora con huevo duro y aceituna."
    },
    chaufa_pollo: {
      nombre: "Arroz chaufa de pollo",
      imagen: "assets/imagenes/arroz-chaufa-pollo.jpg",
      ingredientes: [
        { id: "pollo_pechuga", nombre: "Pechuga de pollo en cubos", cant: 180, unidad: "g", precioUnit: 0.016 },
        { id: "arroz", nombre: "Arroz cocido frío", cant: 120, unidad: "g", precioUnit: 0.004 },
        { id: "huevos", nombre: "Huevos", cant: 1, unidad: "unid", precioUnit: 0.7 },
        { id: "cebolla_china", nombre: "Cebolla china y Kion", cant: 50, unidad: "g", precioUnit: 0.008 },
        { id: "sillao", nombre: "Sillao", cant: 20, unidad: "ml", precioUnit: 0.01 }
      ],
      sugerenciaPrevia: "💡 Tarea previa indispensable: Contar con el arroz blanco cocido previamente y bien frío de refrigeradora para que no se apelmace en el wok.",
      preparacion: "1. En un wok o sartén muy caliente con poco aceite, saltea los cubitos de pollo sazonados con sillao y kion rayado.<br>2. Haz una tortilla delgada con los huevos, pícala en cuadritos y reserva.<br>3. Incorpora el arroz frío al wok hirviendo y saltea con movimientos envolventes.<br>4. Vierte sillao, gotas de aceite de ajonjolí y finaliza agregando la tortilla junto a la cebolla china fresca picada."
    },
    pollo_guisado: {
      nombre: "Pollo guisado con arroz",
      imagen: "assets/imagenes/pollo-guisado-arroz.jpg",
      ingredientes: [
        { id: "pollo_presas", nombre: "Pollo en presas", cant: 250, unidad: "g", precioUnit: 0.011 },
        { id: "papa", nombre: "Papa Blanca", cant: 150, unidad: "g", precioUnit: 0.003 },
        { id: "zanahoria_alverja", nombre: "Zanahoria y Alverjitas", cant: 80, unidad: "g", precioUnit: 0.006 },
        { id: "cebolla_ajo", nombre: "Cebolla y Ajo", cant: 40, unidad: "g", precioUnit: 0.006 },
        { id: "arroz", nombre: "Arroz", cant: 100, unidad: "g", precioUnit: 0.004 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Picar la cebolla en cuadritos mínimos, pelar y cortar la papa en cubos medianos.",
      preparacion: "1. Sella las presas de pollo salpimentadas en la olla hasta que tomen tono dorado.<br>2. Retira el pollo, dora cebolla, ajo y ají panca en el mismo aceite.<br>3. Regresa el pollo, agrega la zanahoria picada, alverjitas, papa en cubos y un chorrito de agua o caldo.<br>4. Tapa y deja guisar a fuego medio-bajo durante 20 minutos hasta que la papa esté suave y la salsa reducida."
    },
    estofado_pollo: {
      nombre: "Estofado de pollo",
      imagen: "assets/imagenes/estofado-pollo.jpg",
      ingredientes: [
        { id: "pollo_presas", nombre: "Pollo en presas", cant: 250, unidad: "g", precioUnit: 0.011 },
        { id: "tomate_panca", nombre: "Tomate y Ají Panca", cant: 80, unidad: "g", precioUnit: 0.007 },
        { id: "papa", nombre: "Papa Blanca", cant: 150, unidad: "g", precioUnit: 0.003 },
        { id: "zanahoria_alverja", nombre: "Zanahoria y Alverjitas", cant: 80, unidad: "g", precioUnit: 0.006 },
        { id: "arroz", nombre: "Arroz", cant: 100, unidad: "g", precioUnit: 0.004 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Licuar tomate fresco pelado junto con ají panca para lograr un aderezo base sabroso.",
      preparacion: "1. Dora las presas salpimentadas. Prepara el aderezo cocinando cebolla picada con el tomate licuado, laurel y hongo seco.<br>2. Agrega las presas, zanahorias en rodajas, alverjitas y las papas peladas por la mitad.<br>3. Añade medio vaso de vino tinto o agua y cocina a fuego lento por 25 min.<br>4. Sirve bien caliente acompañado de arroz blanco graneado."
    },
    seco_pollo_frejoles: {
      nombre: "Seco de pollo con frejoles",
      imagen: "assets/imagenes/seco-pollo-frejoles.jpg",
      ingredientes: [
        { id: "pollo_presas", nombre: "Pollo en presas", cant: 250, unidad: "g", precioUnit: 0.011 },
        { id: "culantro", nombre: "Culantro licuado", cant: 40, unidad: "g", precioUnit: 0.01 },
        { id: "frejol_id", nombre: "Fréjol cocido", cant: 125, unidad: "g", precioUnit: 0.01 },
        { id: "cebolla_ajo", nombre: "Cebolla y Ajo", cant: 40, unidad: "g", precioUnit: 0.006 },
        { id: "arroz", nombre: "Arroz", cant: 100, unidad: "g", precioUnit: 0.004 }
      ],
      sugerenciaPrevia: "⚠️ Tarea previa: Dejar fréjoles en remojo desde la noche anterior y licuar el culantro con un chorrito de chicha de jora o cerveza negra.",
      preparacion: "1. Sofríe lentamente cebolla picada, ajo y ají amarillo en pasta hasta dorar. Añade el culantro licuado y sofríe 5 min más para quitar el gusto a crudo.<br>2. Agrega el pollo y arvejas, tapa y cocina en sus propios jugos a fuego lento por 20 min.<br>3. Sirve junto a los fréjoles bien cremosos guisados aparte y arroz blanco."
    },
    arroz_con_pollo: {
      nombre: "Arroz con pollo",
      imagen: "assets/imagenes/arroz-pollo.jpg",
      ingredientes: [
        { id: "pollo_presas", nombre: "Pollo en presas", cant: 250, unidad: "g", precioUnit: 0.011 },
        { id: "culantro", nombre: "Culantro licuado", cant: 50, unidad: "g", precioUnit: 0.01 },
        { id: "arroz", nombre: "Arroz", cant: 120, unidad: "g", precioUnit: 0.004 },
        { id: "zanahoria_alverja", nombre: "Zanahoria y Alverja", cant: 80, unidad: "g", precioUnit: 0.007 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Licuar el culantro fresco con cerveza o agua tibia para obtener un color verde vivo.",
      preparacion: "1. Sella las presas sazonadas en una olla con aceite y retíralas.<br>2. Sofreír cebolla, ajo, ají mirasol y culantro licuado hasta concentrar sabores.<br>3. Vierte el caldo o agua, reincorpora las presas y cocina 10 min. Retira las presas, agrega el arroz, zanahorias, alverjitas y pimiento.<br>4. Cocina a fuego bajo tapado hasta que el arroz quede perfectamente graneado verde."
    },
    tallarines_rojos_pollo: {
      nombre: "Tallarines rojos con pollo",
      imagen: "assets/imagenes/tallarines-rojos-pollo.jpg",
      ingredientes: [
        { id: "pollo_presas", nombre: "Pollo en presas", cant: 250, unidad: "g", precioUnit: 0.011 },
        { id: "fideos", nombre: "Fideos Spaguetti", cant: 125, unidad: "g", precioUnit: 0.006 },
        { id: "tomate_panca", nombre: "Tomate y Zanahoria rallada", cant: 100, unidad: "g", precioUnit: 0.006 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Rallar finamente la zanahoria para incorporarla directamente al aderezo de tomate, aportando dulzor natural.",
      preparacion: "1. Dora el pollo. Sofríe cebolla en cubitos, ají panca en pasta, ajo, hongo y laurel.<br>2. Añade el tomate licuado y la zanahoria rallada. Cocina a fuego lento para que tome cuerpo la salsa roja.<br>3. Introduce el pollo para que termine su cocción impregnándose de la salsa tuco.<br>4. Sirve sobre tallarines sancochados al dente y espolvorea queso parmesano al gusto."
    },
    tallarines_verdes_bistec: {
      nombre: "Tallarines verdes con bistec de carne",
      imagen: "assets/imagenes/tallarines-verdes-bistec-carne.jpg",
      ingredientes: [
        { id: "carne", nombre: "Bistec de carne", cant: 150, unidad: "g", precioUnit: 0.033 },
        { id: "fideos", nombre: "Fideos Spaguetti", cant: 125, unidad: "g", precioUnit: 0.006 },
        { id: "espinaca_albahaca", nombre: "Espinaca y Albahaca", cant: 100, unidad: "g", precioUnit: 0.008 },
        { id: "queso_fresco", nombre: "Queso fresco", cant: 60, unidad: "g", precioUnit: 0.028 },
        { id: "leche", nombre: "Leche evaporada", cant: 0.2, unidad: "lata", precioUnit: 4.2 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Lavar bien la verdura y ablandar la carne dándole suaves golpecitos con un mazo de cocina.",
      preparacion: "1. Saltea la albahaca y blanquea la espinaca. Licúalas con leche evaporada, queso fresco salado y un aderezo de cebolla sofrita.<br>2. Mezcla la salsa cremosa con los tallarines recién sancochados.<br>3. Cocina el bistec sazonado en sartén hirviendo por 1.5 min por lado.<br>4. Sirve de inmediato para disfrutar la jugosidad del bistec sobre la pasta verde."
    },
    lomo_saltado: {
      nombre: "Lomo saltado",
      imagen: "assets/imagenes/lomo-saltado.jpg",
      ingredientes: [
        { id: "carne", nombre: "Carne de res en tiras", cant: 180, unidad: "g", precioUnit: 0.038 },
        { id: "cebolla_tomate", nombre: "Cebolla y Tomate en gajos", cant: 180, unidad: "g", precioUnit: 0.006 },
        { id: "papa", nombre: "Papa Canchán (frita)", cant: 200, unidad: "g", precioUnit: 0.0035 },
        { id: "sillao", nombre: "Sillao y Vinagre", cant: 30, unidad: "ml", precioUnit: 0.01 },
        { id: "arroz", nombre: "Arroz", cant: 100, unidad: "g", precioUnit: 0.004 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Cortar cebolla y tomate en gajos gruesos sin semillas, tener las papas fritas crocantes listas antes de encender el wok.",
      preparacion: "1. Calienta un wok a fuego extremo con un hilito de aceite humo saliente.<br>2. Saltea las tiras de carne sazonadas en tandas pequeñas para flambear.<br>3. Agrega la cebolla, ají amarillo en tiras, tomate, vierte vinagre tinto y sillao rápidamente por los bordes del wok.<br>4. Apaga el fuego, mezcla con las papas fritas y culantro picado. Sirve inmediatamente junto a arroz blanco."
    },
    pollo_saltado: {
      nombre: "Pollo saltado",
      imagen: "assets/imagenes/pollo-saltado.jpg",
      ingredientes: [
        { id: "pollo_pechuga", nombre: "Pechuga en tiras", cant: 180, unidad: "g", precioUnit: 0.016 },
        { id: "cebolla_tomate", nombre: "Cebolla y Tomate en gajos", cant: 180, unidad: "g", precioUnit: 0.006 },
        { id: "papa", nombre: "Papa frita", cant: 200, unidad: "g", precioUnit: 0.003 },
        { id: "sillao", nombre: "Sillao y Vinagre", cant: 30, unidad: "ml", precioUnit: 0.01 },
        { id: "arroz", nombre: "Arroz", cant: 100, unidad: "g", precioUnit: 0.004 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Cortar la pechuga en tiras gruesas y salpimentar minutos antes de entrar al sartén.",
      preparacion: "1. Saltea las tiras de pollo a fuego máximo hasta lograr un sellado dorado superficial.<br>2. Agrega la cebolla roja en gajos gruesos y ají amarillo; saltea durante 1 minuto.<br>3. Añade los tomates, sillao y chorrito de vinagre para levantar los sabores ahumados.<br>4. Combina con papas fritas crocantes y sirve al momento."
    },
    bistec_pobre: {
      nombre: "Bistec a lo pobre",
      imagen: "assets/imagenes/bistec-pobre.jpg",
      ingredientes: [
        { id: "carne", nombre: "Bistec de carne", cant: 160, unidad: "g", precioUnit: 0.033 },
        { id: "papa", nombre: "Papa frita", cant: 200, unidad: "g", precioUnit: 0.003 },
        { id: "huevos", nombre: "Huevos", cant: 1, unidad: "unid", precioUnit: 0.7 },
        { id: "platano", nombre: "Plátano de isla", cant: 1, unidad: "unid", precioUnit: 0.8 },
        { id: "arroz", nombre: "Arroz", cant: 100, unidad: "g", precioUnit: 0.004 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Freír primero las papas fritas y plátanos para tener la guarnición caliente lista al servir la carne.",
      preparacion: "1. Fríe el plátano de isla cortado a lo largo hasta que caramelice por fuera.<br>2. Fríe el huevo en aceite asegurando la yema tierna y la clara crujiente por los bordes.<br>3. Pasa el bistec sazonado con ajo, sal y pimienta por la plancha hirviendo.<br>4. Monta el bistec sobre una cama de arroz graneado, coloca el huevo montado arriba y acompaña con papas y plátano frito."
    },
    cau_cau_pollo: {
      nombre: "Cau cau de pollo",
      imagen: "assets/imagenes/cau-cau-pollo.jpg",
      ingredientes: [
        { id: "pollo_pechuga", nombre: "Pechuga en cubitos", cant: 180, unidad: "g", precioUnit: 0.016 },
        { id: "papa", nombre: "Papa Canchán en cubitos", cant: 200, unidad: "g", precioUnit: 0.003 },
        { id: "palillo_aji", nombre: "Palillo y Ají amarillo", cant: 30, unidad: "g", precioUnit: 0.008 },
        { id: "arroz", nombre: "Arroz", cant: 100, unidad: "g", precioUnit: 0.004 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Picar el pollo y las papas en cubitos homogéneos pequeños para lograr cocción pareja.",
      preparacion: "1. Sofríe cebolla en cuadritos con ajo, ají amarillo licuado y palillo en polvo hasta dorar.<br>2. Agrega los cubos de pollo y rehoga 3 minutos.<br>3. Incorpora las papas en cubitos, alverjitas y cubre con un poco de caldo caliente.<br>4. Cocina tapado por 15 min y finaliza espolvoreando hierbabuena fresca finamente picada."
    },
    arroz_tapado: {
      nombre: "Arroz tapado",
      imagen: "assets/imagenes/arroz-tapado.jpg",
      ingredientes: [
        { id: "carne_molida", nombre: "Carne molida", cant: 150, unidad: "g", precioUnit: 0.025 },
        { id: "cebolla_tomate", nombre: "Cebolla picada fina", cant: 60, unidad: "g", precioUnit: 0.006 },
        { id: "huevos", nombre: "Huevos duros y Pasas", cant: 0.5, unidad: "unid", precioUnit: 0.8 },
        { id: "arroz", nombre: "Arroz", cant: 150, unidad: "g", precioUnit: 0.004 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Sancochar los huevos duros y picarlos; tener las pasas rehidratadas en agua tibia.",
      preparacion: "1. Prepara el 'pino': Dora carne molida con cebolla picada, ajo, ají panca, comino, pasas y aceituna picada.<br>2. Añade el huevo duro picado al apagar el fuego.<br>3. Para el armado: En una taza redonda engrasada coloca una capa de arroz cocido, luego la carne guisada y cubre con otra capa de arroz prensando suavemente.<br>4. Desmolda en el plato y sirve con plátano frito y huevo."
    },
    quinua_huevo: {
      nombre: "Quinua con arroz y huevo montado",
      imagen: "assets/imagenes/quinua-arroz-huevo-montado.jpg",
      ingredientes: [
        { id: "quinua", nombre: "Quinua perla", cant: 80, unidad: "g", precioUnit: 0.012 },
        { id: "huevos", nombre: "Huevos", cant: 1, unidad: "unid", precioUnit: 0.7 },
        { id: "queso_fresco", nombre: "Queso fresco en cubos", cant: 40, unidad: "g", precioUnit: 0.028 },
        { id: "arroz", nombre: "Arroz", cant: 100, unidad: "g", precioUnit: 0.004 }
      ],
      sugerenciaPrevia: "⚠️ Tarea previa: Lavar la quinua refregándola suavemente en agua 3 o 4 veces en colador tupido para eliminar la saponina amarga.",
      preparacion: "1. Dora cebolla, ajo y ají mirasol en una olla. Agrega la quinua lavada, cubre con agua o caldo y granea por 20 min.<br>2. Agrega cubos de queso fresco salado al apagar y mezcla delicadamente.<br>3. Fríe un huevo montado dejando la yema líquida.<br>4. Sirve la quinua cremosa con arroz y el huevo recién frito arriba."
    }
  };

  CatPlatosArgentina: { [key: string]: any } = {
    ninguno: {
      nombre: "— Ninguno / Descanso —",
      ingredientes: [],
      sugerenciaPrevia: "",
      preparacion: "",
      imagen: ""
    },
    lentejas_pescado: {
      nombre: "Lentejas con filet de pescado frito",
      imagen: "assets/imagenes/lentejas-con-pescado-frito.jpg",
      ingredientes: [
        { id: "lenteja_id", nombre: "Lentejas secas", cant: 125, unidad: "g", precioUnit: 3.5 },
        { id: "pescado", nombre: "Filet de Merluza", cant: 200, unidad: "g", precioUnit: 9.0 },
        { id: "cebolla_ajo", nombre: "Cebolla y Ajo", cant: 40, unidad: "g", precioUnit: 2.0 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Dejar las lentejas en remojo 2 horas antes de cocinar para acelerar su cocción.",
      preparacion: "1. Rehogá en una olla la cebolla picada fina y ajo en un chorrito de aceite.<br>2. Sumá las lentejas, cubrí con agua o caldo de verduras y cociná a fuego medio por 25 min.<br>3. Condimentá los filets de merluza con sal, pimienta y limón.<br>4. Pasalos por harina, rebozalos bien y freílos en aceite caliente por 3 min por lado hasta dorar.<br>5. Serví acompañado de ensalada o salsa criolla."
    },
    carne_papas: {
      nombre: "Bife a la plancha con papas doradas, ensalada y arroz",
      imagen: "assets/imagenes/carne-frita-papas-ensalada-arroz.jpg",
      ingredientes: [
        { id: "carne", nombre: "Bife de bola / Nalgas / Cuadril", cant: 150, unidad: "g", precioUnit: 12.0 },
        { id: "papa", nombre: "Papa blanca / Spunta", cant: 200, unidad: "g", precioUnit: 1.2 },
        { id: "ensalada", nombre: "Tomate y Lechuga", cant: 150, unidad: "g", precioUnit: 2.5 },
        { id: "limon", nombre: "Limón", cant: 1, unidad: "unid", precioUnit: 150.0 },
        { id: "arroz", nombre: "Arroz largo fino", cant: 100, unidad: "g", precioUnit: 1.8 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Hervir las papas peladas con sal previamente para dorarlas directo en la sartén.",
      preparacion: "1. Cortá las papas hervidas en rodajas o cubos y doralas en sartén con manteca o aceite hasta formar costra crocante.<br>2. Condimentá la carne con ajo, sal y pimienta.<br>3. Hacé los bifes a la plancha bien caliente 2 minutos por lado.<br>4. Serví con ensalada fresca de lechuga y tomate aderezada con limón y aceite."
    },
    pollo_plancha: {
      nombre: "Suprema de pollo a la plancha con ensalada y papas",
      imagen: "assets/imagenes/pollo-plancha-ensalada-papas-doradas.jpg",
      ingredientes: [
        { id: "pollo_pechuga", nombre: "Suprema de pollo", cant: 175, unidad: "g", precioUnit: 6.5 },
        { id: "papa", nombre: "Papa blanca / Spunta", cant: 200, unidad: "g", precioUnit: 1.2 },
        { id: "ensalada", nombre: "Tomate y Lechuga", cant: 150, unidad: "g", precioUnit: 2.5 },
        { id: "limon", nombre: "Limón", cant: 1, unidad: "unid", precioUnit: 150.0 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Marinar la suprema cortada fina con ajo picado, orégano, pimienta y un chorro de vinagre o limón.",
      preparacion: "1. Calentá bien la plancha con unas gotas de aceite.<br>2. Cociná las supremas 4 minutos por lado sin moverlas para marcar bien la carne.<br>3. Dorá las papas previamente hervidas en la misma plancha.<br>4. Acompañá con ensalada fresca recién aderezada."
    },
    frejol_atun: {
      nombre: "Porotos con buñuelos/croquetas de atún",
      imagen: "assets/imagenes/frejoles-arroz-croqueta-atun.jpg",
      ingredientes: [
        { id: "frejol_id", nombre: "Porotos alubia / frutilla", cant: 125, unidad: "g", precioUnit: 3.8 },
        { id: "atun", nombre: "Lata de Atún", cant: 0.5, unidad: "lata", precioUnit: 1800.0 },
        { id: "huevos", nombre: "Huevos", cant: 1, unidad: "unid", precioUnit: 250.0 },
        { id: "cebolla_ajo", nombre: "Cebolla y Ajo", cant: 40, unidad: "g", precioUnit: 2.0 },
        { id: "arroz", nombre: "Arroz largo fino", cant: 100, unidad: "g", precioUnit: 1.8 }
      ],
      sugerenciaPrevia: "⚠️ Tarea previa: Dejar los porotos en remojo en abundante agua desde la noche anterior (mínimo 8 horas).",
      preparacion: "1. Herví los porotos en agua con sal o laurel hasta que estén tiernos.<br>2. Hacé un rehogado denso con cebolla y ajo en una olla y volcá los porotos con un poco de su caldo para espesar.<br>3. Escurrí el atún, mezclalo con huevo, harina o pan rallado, cebollita de verdeo y sal.<br>4. Formá croquetas y freílas en aceite caliente hasta dorar."
    },
    pure_broaster: {
      nombre: "Puré de papas con pollo frito crocante y arroz",
      imagen: "assets/imagenes/pure-pollo-broaster-arroz.jpg",
      ingredientes: [
        { id: "pollo_presas", nombre: "Presas de Pollo", cant: 300, unidad: "g", precioUnit: 4.5 },
        { id: "papa", nombre: "Papa negra / Spunta", cant: 250, unidad: "g", precioUnit: 1.2 },
        { id: "leche", nombre: "Leche entera / fluida", cant: 0.1, unidad: "litro", precioUnit: 1200.0 },
        { id: "mantequilla", nombre: "Manteca", cant: 20, unidad: "g", precioUnit: 15.0 },
        { id: "harina_chuno", nombre: "Harina y Almidón de maíz", cant: 80, unidad: "g", precioUnit: 2.0 },
        { id: "huevos", nombre: "Huevos", cant: 0.5, unidad: "unid", precioUnit: 250.0 },
        { id: "arroz", nombre: "Arroz largo fino", cant: 100, unidad: "g", precioUnit: 1.8 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Hervir las presas de pollo 10 minutos antes en agua con sal para asegurar cocción pareja al freír.",
      preparacion: "1. Pisá las papas hervidas calientes con manteca, leche tibia, sal y nuez moscada hasta cremar.<br>2. Mezclá harina con almidón de maíz, pimentón dulce, comino y pimienta.<br>3. Pasá el pollo hervido por huevo batido y luego por la mezcla de harina secándola bien.<br>4. Freí en abundante aceite caliente hasta que quede súper crocante."
    },
    tallarin_verde: {
      nombre: "Tallarines con salsa pesto/verde y chuleta de cerdo",
      imagen: "assets/imagenes/tallarines-verde-chuleta-cerdo.jpg",
      ingredientes: [
        { id: "chuleta", nombre: "Carré / Chuleta de cerdo", cant: 200, unidad: "g", precioUnit: 7.5 },
        { id: "fideos", nombre: "Tallarines / Spaghettis", cant: 125, unidad: "g", precioUnit: 2.2 },
        { id: "espinaca_albahaca", nombre: "Espinaca y Albahaca fresca", cant: 100, unidad: "g", precioUnit: 3.5 },
        { id: "queso_fresco", nombre: "Queso cremoso / Cuartirolo", cant: 60, unidad: "g", precioUnit: 8.0 },
        { id: "leche", nombre: "Leche entera", cant: 0.1, unidad: "litro", precioUnit: 1200.0 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Lavar bien las hojas de albahaca y espinaca antes de procesar.",
      preparacion: "1. Pasá la espinaca por agua hirviendo 1 min. Procesá con albahaca, queso, un chorrito de leche y sofrito de cebolla.<br>2. Herví los tallarines en abundante agua con sal al dente.<br>3. Mezclá la pasta escurrida con la salsa verde cremosa a fuego suave.<br>4. Dorá la chuleta de cerdo a la plancha condimentada con ajo y pimienta."
    },
    aji_gallina: {
      nombre: "Ají de pollo estilo peruano",
      imagen: "assets/imagenes/aji-de-gallina.jpg",
      ingredientes: [
        { id: "pollo_pechuga", nombre: "Suprema de pollo", cant: 200, unidad: "g", precioUnit: 6.5 },
        { id: "aji_amarillo", nombre: "Ají/Morrón amarillo o ají molido", cant: 40, unidad: "g", precioUnit: 4.0 },
        { id: "galleta_soda", nombre: "Pan lactal o Tostadas", cant: 40, unidad: "g", precioUnit: 3.0 },
        { id: "leche", nombre: "Leche entera", cant: 0.1, unidad: "litro", precioUnit: 1200.0 },
        { id: "papa", nombre: "Papa hervida", cant: 150, unidad: "g", precioUnit: 1.2 },
        { id: "huevos", nombre: "Huevos duros", cant: 0.5, unidad: "unid", precioUnit: 250.0 },
        { id: "arroz", nombre: "Arroz largo fino", cant: 100, unidad: "g", precioUnit: 1.8 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Hervir el pollo con verduritas y desmenuzarlo. Remojar el pan lactal en leche.",
      preparacion: "1. Rehogá cebolla picada fina con ajo y ají/morrón procesado hasta ablandar.<br>2. Sumá el pan rehidratado procesado con un poco de caldo de pollo caliente.<br>3. Agregá el pollo desmenuzado, revolvé constantemente a fuego suave hasta que espese y quede cremoso.<br>4. Serví sobre rodajas de papa hervida con huevo duro picado y arroz."
    },
    chaufa_pollo: {
      nombre: "Arroz salteado con pollo estilo Chaufa",
      imagen: "assets/imagenes/arroz-chaufa-pollo.jpg",
      ingredientes: [
        { id: "pollo_pechuga", nombre: "Suprema en cubos", cant: 180, unidad: "g", precioUnit: 6.5 },
        { id: "arroz", nombre: "Arroz cocido frío", cant: 120, unidad: "g", precioUnit: 1.8 },
        { id: "huevos", nombre: "Huevos", cant: 1, unidad: "unid", precioUnit: 250.0 },
        { id: "cebolla_china", nombre: "Cebollita de verdeo y Jengibre", cant: 50, unidad: "g", precioUnit: 3.0 },
        { id: "sillao", nombre: "Salsa de soja", cant: 20, unidad: "ml", precioUnit: 4.0 }
      ],
      sugerenciaPrevia: "💡 Tarea previa fundamental: Usar arroz cocido del día anterior bien frío de heladera.",
      preparacion: "1. En sartén o wok muy caliente con aceite, salteá los cubitos de pollo con salsa de soja y jengibre rallado.<br>2. Hacé una omelette finita con el huevo, picala en trocitos y reservá.<br>3. Agregá el arroz frío al wok salteando fuerte.<br>4. Sumá más salsa de soja, la omelette y terminá con abundante cebollita de verdeo fresca picada."
    },
    pollo_guisado: {
      nombre: "Guiso de pollo con papas y arroz",
      imagen: "assets/imagenes/pollo-guisado-arroz.jpg",
      ingredientes: [
        { id: "pollo_presas", nombre: "Presas de Pollo", cant: 250, unidad: "g", precioUnit: 4.5 },
        { id: "papa", nombre: "Papa negra / Spunta", cant: 150, unidad: "g", precioUnit: 1.2 },
        { id: "zanahoria_alverja", nombre: "Zanahoria y Arvejas", cant: 80, unidad: "g", precioUnit: 2.5 },
        { id: "cebolla_ajo", nombre: "Cebolla y Ajo", cant: 40, unidad: "g", precioUnit: 2.0 },
        { id: "arroz", nombre: "Arroz largo fino", cant: 100, unidad: "g", precioUnit: 1.8 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Picar la cebolla fina, pelar y cortar la papa en cubos medianos.",
      preparacion: "1. Sellá las presas de pollo salpimentadas en la cacerola con aceite.<br>2. Retirás el pollo, dorás cebolla y ajo en la misma cacerola.<br>3. Volvé a poner el pollo, sumá la zanahoria en rodajas, las arvejas, papas en cubos y agua o caldo.<br>4. Tapá y dejá guisar 20 min a fuego medio hasta que la papa esté tierna."
    },
    estofado_pollo: {
      nombre: "Estofado de pollo al tuco",
      imagen: "assets/imagenes/estofado-pollo.jpg",
      ingredientes: [
        { id: "pollo_presas", nombre: "Presas de Pollo", cant: 250, unidad: "g", precioUnit: 4.5 },
        { id: "tomate_panca", nombre: "Puré de tomate y Pimentón", cant: 80, unidad: "g", precioUnit: 3.0 },
        { id: "papa", nombre: "Papa negra / Spunta", cant: 150, unidad: "g", precioUnit: 1.2 },
        { id: "zanahoria_alverja", nombre: "Zanahoria y Arvejas", cant: 80, unidad: "g", precioUnit: 2.5 },
        { id: "arroz", nombre: "Arroz blanco", cant: 100, unidad: "g", precioUnit: 1.8 }
      ],
      sugerenciaPrevia: "💡 Recomendación: Usar puré de tomate o extracto junto con una hojita de laurel para un tuco más sabroso.",
      preparacion: "1. Dorá las presas de pollo. Hacé un rehogado con cebolla picada, puré de tomate, pimentón dulce y laurel.<br>2. Incorporá el pollo, las zanahorias en rodajas, las arvejas y papas peladas al medio.<br>3. Agregá un chorrito de vino tinto o agua y cociná a fuego lento por 25 min.<br>4. Serví caliente con arroz blanco."
    },
    seco_pollo_frejoles: {
      nombre: "Pollo al cilantro con porotos",
      imagen: "assets/imagenes/seco-pollo-frejoles.jpg",
      ingredientes: [
        { id: "pollo_presas", nombre: "Presas de Pollo", cant: 250, unidad: "g", precioUnit: 4.5 },
        { id: "culantro", nombre: "Cilantro procesado", cant: 40, unidad: "g", precioUnit: 4.0 },
        { id: "frejol_id", nombre: "Porotos guisados", cant: 125, unidad: "g", precioUnit: 3.8 },
        { id: "cebolla_ajo", nombre: "Cebolla y Ajo", cant: 40, unidad: "g", precioUnit: 2.0 },
        { id: "arroz", nombre: "Arroz largo fino", cant: 100, unidad: "g", precioUnit: 1.8 }
      ],
      sugerenciaPrevia: "⚠️ Tarea previa: Dejar porotos en remojo la noche anterior y procesar el cilantro fresco con agua o caldo.",
      preparacion: "1. Rehogá cebolla, ajo y agregá el cilantro procesado cocinando 5 min.<br>2. Incorporá el pollo y arvejas, cocinando tapado a fuego lento 20 min.<br>3. Serví junto a los porotos guisados bien cremosos y arroz blanco."
    },
    arroz_con_pollo: {
      nombre: "Arroz con pollo al cilantro",
      imagen: "assets/imagenes/arroz-pollo.jpg",
      ingredientes: [
        { id: "pollo_presas", nombre: "Presas de Pollo", cant: 250, unidad: "g", precioUnit: 4.5 },
        { id: "culantro", nombre: "Cilantro procesado", cant: 50, unidad: "g", precioUnit: 4.0 },
        { id: "arroz", nombre: "Arroz largo fino", cant: 120, unidad: "g", precioUnit: 1.8 },
        { id: "zanahoria_alverja", nombre: "Zanahoria y Arvejas", cant: 80, unidad: "g", precioUnit: 2.5 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Procesar el cilantro fresco con un poquito de caldo o agua tibia.",
      preparacion: "1. Sellá las presas de pollo en aceite y reservá.<br>2. Rehogá cebolla, ajo y el cilantro procesado hasta integrar bien.<br>3. Volvé a poner el pollo con caldo y cociná 10 min. Retirá el pollo, agregá el arroz, zanahorias y arvejas.<br>4. Cociná a fuego bajo tapado hasta que el arroz esté a punto y bien verde."
    },
    tallarines_rojos_pollo: {
      nombre: "Tallarines con tuco y pollo",
      imagen: "assets/imagenes/tallarines-rojos-pollo.jpg",
      ingredientes: [
        { id: "pollo_presas", nombre: "Presas de Pollo", cant: 250, unidad: "g", precioUnit: 4.5 },
        { id: "fideos", nombre: "Tallarines", cant: 125, unidad: "g", precioUnit: 2.2 },
        { id: "tomate_panca", nombre: "Puré de tomate y Zanahoria", cant: 100, unidad: "g", precioUnit: 2.5 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Rallar la zanahoria bien finita para sumarla directo al tuco.",
      preparacion: "1. Dorá las presas. Rehogá cebolla picada, ajo, laurel y pimentón.<br>2. Sumá el puré de tomate y la zanahoria rallada. Dejá espesar la salsa a fuego lento.<br>3. Agregá el pollo para terminar la cocción dentro del tuco.<br>4. Serví sobre los tallarines hervidos al dente con queso rallado por encima."
    },
    tallarines_verdes_bistec: {
      nombre: "Tallarines con pesto/salsa verde y bife",
      imagen: "assets/imagenes/tallarines-verdes-bistec-carne.jpg",
      ingredientes: [
        { id: "carne", nombre: "Bife de bola / Nalgas", cant: 150, unidad: "g", precioUnit: 12.0 },
        { id: "fideos", nombre: "Tallarines", cant: 125, unidad: "g", precioUnit: 2.2 },
        { id: "espinaca_albahaca", nombre: "Espinaca y Albahaca", cant: 100, unidad: "g", precioUnit: 3.5 },
        { id: "queso_fresco", nombre: "Queso fresco / Cremoso", cant: 60, unidad: "g", precioUnit: 8.0 },
        { id: "leche", nombre: "Leche entera", cant: 0.1, unidad: "litro", precioUnit: 1200.0 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Tierno ablandar la carne con suaves golpes si es un corte magro.",
      preparacion: "1. Procesá la albahaca y espinaca pasadas por agua tibia con leche, queso fresco y cebolla sofrita.<br>2. Mezclá la pasta hervida con la salsa verde tibia.<br>3. Cociná el bife a la plancha caliente 1.5 min por lado.<br>4. Serví enseguida el bife jugoso sobre la pasta."
    },
    lomo_saltado: {
      nombre: "Lomo salteado estilo criollo",
      imagen: "assets/imagenes/lomo-saltado.jpg",
      ingredientes: [
        { id: "carne", nombre: "Lomo / Lomo de res en tiras", cant: 180, unidad: "g", precioUnit: 14.0 },
        { id: "cebolla_tomate", nombre: "Cebolla y Tomate en tiras", cant: 180, unidad: "g", precioUnit: 2.5 },
        { id: "papa", nombre: "Papas fritas", cant: 200, unidad: "g", precioUnit: 1.2 },
        { id: "sillao", nombre: "Salsa de soja y Vinagre", cant: 30, unidad: "ml", precioUnit: 4.0 },
        { id: "arroz", nombre: "Arroz largo fino", cant: 100, unidad: "g", precioUnit: 1.8 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Tener las papas fritas crocantes hechas antes de encender el wok o sartén.",
      preparacion: "1. Calentá la sartén o wok al máximo con un hilo de aceite.<br>2. Salteá las tiras de carne bien sazonadas a fuego fuerte.<br>3. Agregá cebolla, tomate en gajos, un chorro de vinagre y salsa de soja.<br>4. Apagá el fuego, mezclá con las papas fritas caliente y perejil/cilantro. Serví con arroz blanco."
    },
    pollo_saltado: {
      nombre: "Pollo salteado con papas y arroz",
      imagen: "assets/imagenes/pollo-saltado.jpg",
      ingredientes: [
        { id: "pollo_pechuga", nombre: "Suprema en tiras", cant: 180, unidad: "g", precioUnit: 6.5 },
        { id: "cebolla_tomate", nombre: "Cebolla y Tomate en gajos", cant: 180, unidad: "g", precioUnit: 2.5 },
        { id: "papa", nombre: "Papas fritas", cant: 200, unidad: "g", precioUnit: 1.2 },
        { id: "sillao", nombre: "Salsa de soja y Vinagre", cant: 30, unidad: "ml", precioUnit: 4.0 },
        { id: "arroz", nombre: "Arroz largo fino", cant: 100, unidad: "g", precioUnit: 1.8 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Cortar la suprema en tiras gruesas y salpimentar previamente.",
      preparacion: "1. Salteá las tiras de pollo a fuego muy fuerte hasta dorar bien la superficie.<br>2. Agregá la cebolla roja en gajos y morrón/ají; salteá 1 minuto.<br>3. Sumá los tomates, salsa de soja y el chorrito de vinagre.<br>4. Mezclá con las papas fritas y serví con arroz blanco."
    },
    bistec_pobre: {
      nombre: "Bife a caballo con papas fritas y arroz",
      imagen: "assets/imagenes/bistec-pobre.jpg",
      ingredientes: [
        { id: "carne", nombre: "Bife de bola / Nalgas", cant: 160, unidad: "g", precioUnit: 12.0 },
        { id: "papa", nombre: "Papas fritas", cant: 200, unidad: "g", precioUnit: 1.2 },
        { id: "huevos", nombre: "Huevos", cant: 1, unidad: "unid", precioUnit: 250.0 },
        { id: "platano", nombre: "Plátano / Banana frita", cant: 1, unidad: "unid", precioUnit: 300.0 },
        { id: "arroz", nombre: "Arroz blanco", cant: 100, unidad: "g", precioUnit: 1.8 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Hacer las papas fritas primero para servirlas calientes.",
      preparacion: "1. Dora la banana en rodajas a lo largo en sartén hasta dorar.<br>2. Freí el huevo en aceite dejando la yema blanda.<br>3. Cociná el bife sazonado a la plancha caliente.<br>4. Serví el bife montado con el huevo frito encima, acompañado de papas fritas, arroz y la banana frita."
    },
    cau_cau_pollo: {
      nombre: "Guisillo de pollo con papas al palillo",
      imagen: "assets/imagenes/cau-cau-pollo.jpg",
      ingredientes: [
        { id: "pollo_pechuga", nombre: "Suprema en cubitos", cant: 180, unidad: "g", precioUnit: 6.5 },
        { id: "papa", nombre: "Papa en cubitos", cant: 200, unidad: "g", precioUnit: 1.2 },
        { id: "palillo_aji", nombre: "Cúrcuma/Palillo y Ají", cant: 30, unidad: "g", precioUnit: 3.0 },
        { id: "arroz", nombre: "Arroz largo fino", cant: 100, unidad: "g", precioUnit: 1.8 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Cortar el pollo y las papas en cubitos parejos.",
      preparacion: "1. Rehogá cebolla con ajo, morrón picado y cúrcuma hasta dorar.<br>2. Agregá el pollo en cubos y dorá 3 minutos.<br>3. Sumá las papas en cubitos, arvejas y cubrí con caldo caliente.<br>4. Cociná 15 min y serví espolvoreado con menta o hierbabuena picada con arroz blanco."
    },
    arroz_tapado: {
      nombre: "Arroz tapado con pino de carne",
      imagen: "assets/imagenes/arroz-tapado.jpg",
      ingredientes: [
        { id: "carne_molida", nombre: "Carne picada / molida", cant: 150, unidad: "g", precioUnit: 9.0 },
        { id: "cebolla_tomate", nombre: "Cebolla picada fina", cant: 60, unidad: "g", precioUnit: 2.0 },
        { id: "huevos", nombre: "Huevos duros y Pasas", cant: 0.5, unidad: "unid", precioUnit: 300.0 },
        { id: "arroz", nombre: "Arroz blanco", cant: 150, unidad: "g", precioUnit: 1.8 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Hervir los huevos duros y picarlos finos.",
      preparacion: "1. Dora la carne picada con cebolla, ajo, pimentón dulce, comino, pasas de uva y aceitunas picadas.<br>2. Añadí el huevo duro picado al apagar el fuego.<br>3. En una taza redonda enmantecada poné una capa de arroz cocido, el pino de carne al medio y otra capa de arroz haciendo presión.<br>4. Desmoldá en el plato y serví."
    },
    quinua_huevo: {
      nombre: "Guiso de Quinua con arroz y huevo frito",
      imagen: "assets/imagenes/quinua-arroz-huevo-montado.jpg",
      ingredientes: [
        { id: "quinua", nombre: "Quinoa", cant: 80, unidad: "g", precioUnit: 5.0 },
        { id: "huevos", nombre: "Huevos", cant: 1, unidad: "unid", precioUnit: 250.0 },
        { id: "queso_fresco", nombre: "Queso cremoso en cubos", cant: 40, unidad: "g", precioUnit: 8.0 },
        { id: "arroz", nombre: "Arroz blanco", cant: 100, unidad: "g", precioUnit: 1.8 }
      ],
      sugerenciaPrevia: "⚠️ Tarea previa: Enjuagar la quinoa con agua en colador fino varias veces antes de cocinar.",
      preparacion: "1. Dorá cebolla y ajo en la olla. Sumá la quinoa lavada, cubrí con agua/caldo y cociná 20 min.<br>2. Agregá cubos de queso cremoso al apagar el fuego mezclando despacio.<br>3. Freí el huevo dejando la yema jugosa.<br>4. Serví la quinoa cremosa con arroz y el huevo frito arriba."
    }
  };

  ngOnInit() {
    this.actualizarCatalogoPlatos();
  }

  obtenerCatalogoActual() {
    return this.paisActual === "PE" ? this.CatPlatosPeru : this.CatPlatosArgentina;
  }

  actualizarCatalogoPlatos() {
    const catalog = this.obtenerCatalogoActual();
    this.platosDisponibles = Object.keys(catalog).map(key => ({
      key: key,
      nombre: catalog[key].nombre
    }));
  }

  cambiarPais() {
    this.simboloMoneda = this.paisActual === "PE" ? "S/" : "$";
    this.actualizarCatalogoPlatos();
    
    // Asignar descanso/ninguno u opciones iniciales para asegurar que por defecto muestre descanso o selección válida
    this.menuSemanal = {
      lunes: 'lentejas_pescado',
      martes: 'carne_papas',
      miercoles: 'pollo_plancha',
      jueves: 'frejol_atun',
      viernes: 'pure_broaster',
      sabado: 'tallarin_verde',
      domingo: 'ninguno'
    };

    if (this.mostrarResultado) {
      this.generarPlanificacion();
    }
  }

  toggleSelectAll() {
    for (let key in this.despensa) {
      this.despensa[key] = this.selectAllChecked;
    }
  }

  actualizarEstadoSelectAll() {
    const todos = Object.values(this.despensa);
    this.selectAllChecked = todos.every(val => val);
  }

  seleccionarAleatorio() {
    const catalog = this.obtenerCatalogoActual();
    const opcionesValidas = Object.keys(catalog).filter(k => k !== 'ninguno');
    
    // Mezclar aleatoriamente asegurando cubrir todos los días
    const mezcla = [...opcionesValidas].sort(() => Math.random() - 0.5);
    
    this.menuSemanal = {
      lunes: mezcla[0] || 'ninguno',
      martes: mezcla[1] || 'ninguno',
      miercoles: mezcla[2] || 'ninguno',
      jueves: mezcla[3] || 'ninguno',
      viernes: mezcla[4] || 'ninguno',
      sabado: mezcla[5] || 'ninguno',
      domingo: mezcla[6] || 'ninguno'
    };
  }

  cambiarPersonas(delta: number) {
    this.personas += delta;
    if (this.personas < this.minPersonas) this.personas = this.minPersonas;
    if (this.personas > this.maxPersonas) this.personas = this.maxPersonas;
  }

  formatearCantidad(cant: number, unidad: string): string {
    if (cant >= 1000 && unidad === 'g') {
      return (cant / 1000).toFixed(2) + ' kg';
    }
    if (unidad === 'unid' || unidad === 'lata' || unidad === 'litro') {
      return (cant < 1 && unidad === 'litro' ? cant.toFixed(2) : Math.ceil(cant)) + ' ' + unidad;
    }
    return Math.round(cant) + ' ' + unidad;
  }

  ejecutarGeneracion() {
    this.mostrarResultado = false;
    this.cargando = true;

    setTimeout(() => {
      this.cargando = false;
      this.generarPlanificacion();
    }, 800);
  }

  generarPlanificacion() {
    const catalog = this.obtenerCatalogoActual();
    const ignorar: string[] = [];
    for (let key in this.despensa) {
      if (this.despensa[key]) ignorar.push(key);
    }

    const diasKeys = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    this.comprasGlobales = {};
    this.costoTotalGlobal = 0;
    let platosSeleccionados: any[] = [];

    diasKeys.forEach(diaKey => {
      const platoKey = (this.menuSemanal as any)[diaKey];
      if (platoKey && platoKey !== 'ninguno' && catalog[platoKey]) {
        const plato = catalog[platoKey];
        const nombreDiaFormateado = diaKey.charAt(0).toUpperCase() + diaKey.slice(1);
        platosSeleccionados.push({ dia: nombreDiaFormateado, ...plato });

        plato.ingredientes.forEach((ing: any) => {
          if (ignorar.includes(ing.id)) return;

          const cantidadTotal = ing.cant * this.personas;
          const costoIngrediente = cantidadTotal * ing.precioUnit;

          if (!this.comprasGlobales[ing.nombre]) {
            this.comprasGlobales[ing.nombre] = { cant: 0, unidad: ing.unidad, costo: 0 };
          }
          this.comprasGlobales[ing.nombre].cant += cantidadTotal;
          this.comprasGlobales[ing.nombre].costo += costoIngrediente;
          this.costoTotalGlobal += costoIngrediente;
        });
      }
    });

    // Renderizar Lista de Compras
    let htmlC = '<ul>';
    for (const [nombre, data] of Object.entries(this.comprasGlobales)) {
      htmlC += `<li><strong>${nombre}:</strong> ${this.formatearCantidad(data.cant, data.unidad)} — <em>${this.simboloMoneda} ${data.costo.toFixed(2)}</em></li>`;
    }
    htmlC += '</ul>';
    this.htmlCompras = htmlC;

    // Renderizar Sugerencias
let htmlS = '';
if (platosSeleccionados.length === 0) {
  htmlS = '<p style="text-align: center; color: #718096;">No has seleccionado ningún plato para la semana.</p>';
} else {
  platosSeleccionados.forEach(item => {
    let listaInsumosPlato = item.ingredientes.map((ing: any) => {
      let cantCalculada = ing.cant * this.personas;
      return `<b>${ing.nombre}:</b> ${this.formatearCantidad(cantCalculada, ing.unidad)}`;
    }).join(' • ');

    // Limpiar y formatear pasos en lista ordenada
    let pasosArray = item.preparacion ? item.preparacion.split(/\r?\n/).filter((p: string) => p.trim() !== '') : [];
    let pasosHtml = pasosArray.length > 0 
      ? `<ol>${pasosArray.map((paso: string) => `<li>${paso.replace(/^\d+[\.\)]\s*/, '')}</li>`).join('')}</ol>`
      : item.preparacion;

    htmlS += `
      <div class="prep-card">
        <div class="prep-day">📌 ${item.dia}</div>
        <div class="prep-dish">${item.nombre}</div>
        ${item.imagen ? `<img src="${item.imagen}" alt="${item.nombre}" class="dish-img" loading="lazy" onerror="this.style.display='none'">` : ''}
        
        <div class="prep-quantities">
          <strong>Insumos exactos para ${this.personas} personas:</strong><br>
          ${listaInsumosPlato}
        </div>

        ${item.sugerenciaPrevia ? `
          <div class="prep-pre">
            💡 <strong>Tarea previa:</strong> ${item.sugerenciaPrevia}
          </div>
        ` : ''}

        <div class="prep-desc">
          <strong>Pasos de Preparación:</strong>
          ${pasosHtml}
        </div>
      </div>
    `;
  });
}

this.htmlSugerencias = this.sanitizer.bypassSecurityTrustHtml(htmlS);
this.mostrarResultado = true;
  }

  enviarWhatsApp() {
    let texto = `🛒 *LISTA DE COMPRAS SEMANAL (${this.personas} personas)*\n\n`;

    for (const [nombre, data] of Object.entries(this.comprasGlobales)) {
      texto += `• *${nombre}:* ${this.formatearCantidad(data.cant, data.unidad)}\n`;
    }

    texto += `\n💰 *Estimado de Gastos:* ${this.simboloMoneda} ${this.costoTotalGlobal.toFixed(2)}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  }
}