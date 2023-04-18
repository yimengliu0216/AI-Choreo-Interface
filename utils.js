import {DragControls} from './DragControls.js';
import {OrbitControls} from './OrbitControls.js';
import {
	Group,
	Vector2,
	Color,
	Raycaster,
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	DirectionalLight,
	AmbientLight,
	MeshLambertMaterial,
	Mesh, 
	PlaneGeometry, 
	MeshPhongMaterial, 
	Clock, 
	SkeletonHelper, 
	AnimationMixer,
	Vector3,
	Uint8ClampedBufferAttribute
} from './three.module.js';
import {OBJLoader} from "./OBJLoader.js"; 
import {OBJExporter} from "./OBJExporter.js"; 
import {GLTFLoader} from './GLTFLoader.js';
import {GLTFExporter} from './GLTFExporter.js';
import {Detector} from "./Detector.js"
import Stats from "./stats.module.js"
import {GUI, Controller} from "./lil-gui.module.min.js"
import {FBXLoader} from "./FBXLoader.js"
import {SMPLJsonLoader} from './SMPLJsonLoader.js';

if (!Detector.webgl) {
	Detector.addGetWebGLMessage();
}

var container;

var camera, scene, renderer, controls, drag_controls;
var lighting, ambient, keyLight, fillLight, backLight;

const raycaster = new Raycaster();
const mouse = new Vector2();

var curTabName; 
var AAHead, AABody, AALeg, AATail, AAArm, head, body, tail, leg, arm, bodya, bodyh;

// var AAarray = new Array(4);  
// var AHarray = new Array(6); 
// var OOarray = new Array(3); 
var partArray = new Array(6);
var AAarray = partArray;
var AHarray = partArray;
var OOarray = partArray;
var assembled = false;
AAHead = undefined;
AABody = undefined;
AALeg = undefined;
AATail = undefined;
AAArm = undefined; 

let hybridModelList = []

let group;
let enableSelection = false;
const objects = [];

let AnimateBtnClicked = false; 
let stats;
let model, skeleton, mixer, clock;
let animations, pbtimeout;
const crossFadeControls = [];

let idleAction, walkAction, runAction;
let idleWeight, walkWeight, runWeight;
let actions, settings;

let singleStepMode = false;
let sizeOfNextStep = 0;

// let animateButton = document.getElementById("animateButton"); 
// animateButton.disabled = false; 


init();
// animate();

let scale_dict = {
	"camelHead": [0.7, 0.7, 0.7],
	"camelBody": [0.01, 0.01, 0.01],
	"camelLeg": [0.01, 0.01, 0.01],
	"camelTail": [0.7, 0.7, 0.7],
	"dinosaurHead": [0.5, 0.5, 0.5],
	"dinosaurBody": [0.007, 0.007, 0.007],
	"dinosaurLeg": [0.007, 0.007, 0.007],
	"dinosaurTail": [0.4, 0.4, 0.4],
	"rabbitHead": [0.55, 0.55, 0.55],
	"rabbitBody": [0.011, 0.011, 0.011],
	"rabbitLeg": [0.011, 0.011, 0.011],
	"rabbitTail": [0.7, 0.7, 0.7], 
	"wolfHead": [8, 8, 8],
	"wolfBody": [8, 8, 8],
	"wolfLeg": [8, 8, 8],
	"wolfTail": [8, 8, 8],
	"tigerHead": [8, 8, 8],
	"tigerBody": [8, 8, 8],
	"tigerLeg": [8, 8, 8],
	"tigerTail": [8, 8, 8],
	"horseHead": [8, 8, 8],
	"horseBody": [8, 8, 8],
	"horseLeg": [8, 8, 8],
	"horseTail": [8, 8, 8],
	"humanHead": [8, 8, 8],
	"humanBody": [8, 8, 8],
	"humanLeg": [8, 8, 8],
	"humanArm": [8, 8, 8], 
	"robotHead": [8, 8, 8],
	"robotBody": [8, 8, 8],
	"robotLeg": [8, 8, 8],
	"robotArm": [8, 8, 8], 
	"girlHead": [9, 9, 9],
	"girlBody": [9, 9, 9],
	"girlLeg": [9, 9, 9],
	"girlArm": [9, 9, 9], 
	"planeHead": [6, 6, 6], 
	"planeBody": [6, 6, 6], 
	"planeArm": [6, 6, 6], 
	"carHead": [6, 6, 6], 
	"carBody": [6, 6, 6], 
	"carArm": [6, 6, 6]
};

let position_dict = {
	"camelHead": [-6, 3, 0],
	"camelBody": [0, 0, 0],
	"camelLeg": [0, -4, 0],
	"camelTail": [5, -0.5, 0],
	"dinosaurHead": [-2, -0.5, 0.5], 
	"dinosaurBody": [-1, 0, 0],
	"dinosaurLeg": [-1.5, -4, 0],
	"dinosaurTail": [2, 3, 0],
	"rabbitHead": [-3, 1, 0],
	"rabbitBody": [0, 0, 0],
	"rabbitLeg": [-0.5, -4, 0],
	"rabbitTail": [-0.5, -0.5, 0],
	"wolfHead": [-2, -4, -1],
	"wolfBody": [-1, -4, 0],
	"wolfLeg": [-1, -4, 0],
	"wolfTail": [2, -3, 0.5],
	"tigerHead": [-1.5, -4, -1],
	"tigerBody": [-1, -4, -0.5],
	"tigerLeg": [-1, -5, 0.5],
	"tigerTail": [0, -4, 0],
	"horseHead": [-1.5, -5, -1],
	"horseBody": [-1, -5, -1],
	"horseLeg": [-1, -6, -0.5],
	"horseTail": [1.5, -4, 0],
	"humanHead": [-3, 0, 0],
	"humanBody": [-2.75, 0, 0],
	"humanLeg": [-2.75, 0, 0],
	"humanArm": [-2.75, 0, 0], 
	"robotHead": [-3, -0.5, 0],
	"robotBody": [-3, -0.5, 0],
	"robotLeg": [-3, -0.5, 0],
	"robotArm": [-3, -0.5, 0], 
	"girlHead": [-3, 0, -0.5],
	"girlBody": [-3, 0, -0.5],
	"girlLeg": [-3, 0, -0.5],
	"girlArm": [-3, 0, -0.5], 
	"planeHead": [0, 0, 0], 
	"planeBody": [0, 0, 0], 
	"planeArm": [0, 0, 0], 
	"carHead": [0, 0, 0], 
	"carBody": [0, 0, 0], 
	"carArm": [0, 0, 0]
}

let rotation_dict = {
	"humanHead": [0, 30, 0],
	"humanBody": [0, 30, 0],
	"humanLeg": [0, 30, 0],
	"humanArm": [0, 30, 0],
	"robotHead": [0, 30, 0],
	"robotBody": [0, 30, 0],
	"robotLeg": [0, 30, 0],
	"robotArm": [0, 30, 0],
	"girlHead": [0, 30, 0],
	"girlBody": [0, 30, 0],
	"girlLeg": [0, 30, 0],
	"girlArm": [0, 30, 0],
	"wolfHead": [0, 30, 0], 
	"wolfBody": [0, 30, 0], 
	"wolfLeg": [0, 30, 0], 
	"wolfTail": [0, 30, 0], 
	"tigerHead": [0, 30, 0], 
	"tigerBody": [0, 30, 0], 
	"tigerLeg": [0, 30, 0], 
	"tigerTail": [0, 30, 0], 
	"horseHead": [0, 30, 0],
	"horseBody": [0, 30, 0], 
	"horseLeg": [0, 30, 0], 
	"horseTail": [0, 30, 0],
	"planeHead": [0, 30, 0], 
	"planeBody": [0, 30, 0], 
	"planeArm": [0, 30, 0],  
	"carHead": [0, 30, 0], 
	"carBody": [0, 30, 0], 
	"carArm": [0, 30, 0]
}

let file_dict = {
	"camelHead": 'camel-head.obj',
	"camelBody": 'camel-body.obj',
	"camelLeg": 'camel-legs.obj',
	"camelTail": 'camel-tail.obj',
	"dinosaurHead": "dinosaur-head.obj",
	"dinosaurBody": "dinosaur-body.obj",
	"dinosaurLeg": "dinosaur-legs.obj",
	"dinosaurTail": "dinosaur-tail.obj",
	"rabbitHead": "rabbit-head.obj",
	"rabbitBody": "rabbit-body.obj",
	"rabbitLeg": "rabbit-legs.obj",
	"rabbitTail": "rabbit-tail.obj", 
	"wolfHead": "dog-head.obj",
	"wolfBody": "dog-body.obj",
	"wolfLeg": "dog-legs.obj",
	"wolfTail": "dog-tail.obj", 
	"tigerHead": "tiger-head.obj",
	"tigerBody": "tiger-body.obj",
	"tigerLeg": "tiger-legs.obj",
	"tigerTail": "tiger-tail.obj", 
	"horseHead": "horse-head.obj",
	"horseBody": "horse-body.obj",
	"horseLeg": "horse-legs.obj",
	"horseTail": "horse-tail.obj", 
	"humanHead": "human-head.obj",
	"humanBody": "human-body1.obj",
	"humanLeg": "human-legs.obj",
	"humanArm": "human-arms.obj", 
	"robotHead": "robot-head.obj",
	"robotBody": "robot-body.obj",
	"robotLeg": "robot-legs.obj",
	"robotArm": "robot-arms.obj", 
	"girlHead": "girl-head.obj",
	"girlBody": "girl-body.obj",
	"girlLeg": "girl-legs.obj",
	"girlArm": "girl-arms.obj", 
	"planeHead": "plane-head.obj", 
	"planeBody": "plane-body.obj", 
	"planeArm": "plane-arm.obj", 
	"carHead": "car-head.obj", 
	"carBody": "car-body.obj", 
	"carArm": "car-arm.obj"
}


function init() {

	// container = document.createElement('div');
	// container.id = "ModelingArea";
	// container.ondrop = drop;
	// container.ondragover = allowDrop;
	// document.getElementById("wrapper").appendChild(container);
	// container.style.flexGrow = 10;
	container = document.getElementById("ModelingArea");
	container.style.width="50%";
	container.style.padding = 0;
	container.style.margin = 0;
	
	// container.style.innerWidth = 100;
	// container.style.innerHeight = 100;

	/* Camera */

	camera = new PerspectiveCamera(45, container.offsetWidth / container.offsetHeight, 1, 10000);
	camera.position.z = 25;

	/* Scene */

	scene = new Scene();
	lighting = false;

	ambient = new AmbientLight(0xffffff, 1.0);
	scene.add(ambient);

	keyLight = new DirectionalLight(new Color('hsl(30, 100%, 75%)'), 1.0);
	keyLight.position.set(-100, 0, 100);

	fillLight = new DirectionalLight(new Color('hsl(240, 100%, 75%)'), 0.75);
	fillLight.position.set(100, 0, 100);

	backLight = new DirectionalLight(0xffffff, 1.0);
	backLight.position.set(100, 0, -100).normalize();

	ambient.intensity = 0.25;
	scene.add(keyLight);
	scene.add(fillLight);
	scene.add(backLight);

	group = new Group();
	scene.add( group );

	/* Model */

	// var mtlLoader = new THREE.MTLLoader();
	// mtlLoader.setBaseUrl('assets/');
	// mtlLoader.setPath('assets/');
	// mtlLoader.load('female-croupier-2013-03-26.mtl', function (materials) {

	//     materials.preload();

	//     materials.materials.default.map.magFilter = THREE.NearestFilter;
	//     materials.materials.default.map.minFilter = THREE.LinearFilter;

	//     var objLoader = new THREE.OBJLoader();
	//     objLoader.setMaterials(materials);
	//     objLoader.setPath('assets/');
	//     objLoader.load('female-croupier-2013-03-26.obj', function (object) {
	// 		object.position.set(2, 0, 0); 
	// 		object.scale.set(4, 4, 4);
	//         scene.add(object);
	//     });
	// });

	// // add a cube
	// const geometryc = new THREE.BoxBufferGeometry(2, 2, 2);
	// // create a default (white) Basic material
	// const materialc = new THREE.MeshBasicMaterial();
	// // create a Mesh containing the geometry and material
	// const cube = new THREE.Mesh(geometryc, materialc);
	// // add the mesh to the scene
	// scene.add(cube);


	// // add a female croupier
	// var objLoader = new THREE.OBJLoader();
	// objLoader.setPath('assets/');
	// objLoader.load('female-croupier-2013-03-26.obj', function (object) {
	// 	object = object.children[0];
	// 	object.position.set(4, 0, 0); 
	// 	object.scale.set(4, 4, 4);
	// 	object.material = new THREE.MeshBasicMaterial();
	// 	scene.add(object);
	// });


	/* Renderer */

	renderer = new WebGLRenderer();
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(container.offsetWidth, container.offsetHeight);
	renderer.setClearColor(new Color("hsl(0, 0%, 10%)"));

	container.insertBefore(renderer.domElement, container.children[0]);

	/* Controls */

	controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.dampingFactor = 0.25;
	controls.enableZoom = true;
	controls.enabled = true; 

	drag_controls = new DragControls( [ ... objects ], camera, renderer.domElement );
	drag_controls.enabled = false; 
	// drag_controls.addEventListener( 'drag', render );


	/* Events */

	window.addEventListener('resize', onWindowResize, false);
	// window.addEventListener('keydown', onKeyboardEvent, false);

	container.addEventListener( 'click', onClickMesh );
	window.addEventListener( 'keydown', onKeyDown );
	window.addEventListener( 'keyup', onKeyUp );


	/* components */
	head = undefined;
	body = undefined;
	bodya = undefined; 
	bodyh = undefined; 
	leg = undefined;
	tail = undefined;
	arm = undefined; 


	

	/* load smpl model */
	// blur the screen
	var blurDiv = document.createElement("div");
	blurDiv.id = "blurDiv";
	blurDiv.style.cssText = "position:absolute; top:0; right:0; width:" + screen.width + "px; height: 100" + "vh; background-color: #000000; opacity:0.5; filter:alpha(opacity=50)";
	document.getElementsByTagName("body")[0].appendChild(blurDiv);
	// add a loading icon
	var newImage = document.createElement("img");
	newImage.id = "load"
	newImage.src = "assets/loading_transparent.gif";
	newImage.style.cssText = "width:80px; height:80px; position:absolute; top:50%; left:50%; transform: translate(-50%, -50%);"
	document.getElementsByTagName("body")[0].appendChild(newImage);

	// add a ground
	var geo = new PlaneGeometry(2000, 2000, 8, 8);
	var mat = new MeshPhongMaterial({color: "darkgray", side: 2});
	var plane = new Mesh(geo, mat);
	plane.position.set(0, -6, 0); 
	plane.rotateX(-Math.PI / 2);
	// scene.add(plane);

	// load t-pose model and skeleton
	var fbxFileName = "SMPL_m_unityDoubleBlends_lbs_10_scale5_207_v1.0.0"
	const loader = new FBXLoader();
	loader.load('assets/'+fbxFileName+'.fbx', function(gltf) {
		model = gltf;
		mixer = new AnimationMixer(model);
		// load smpl mesh
		model.scale.set(0.05, 0.05, 0.05); 
		model.position.set(0, -6, 0); 
		scene.add(model);
		// console.log(model);

		model.traverse( function ( object ) {
			if ( object.isMesh ) object.castShadow = true;
		} );

		// load skeleton
		skeleton = new SkeletonHelper( model );
		skeleton.visible = true;
		// scene.add(skeleton);
		// console.log(skeleton);

		// unblur the screen
		blurDiv = document.getElementById("blurDiv");
		blurDiv.parentNode.removeChild(blurDiv);
		newImage = document.getElementById("load");
		newImage.parentNode.removeChild(newImage);
	});

	// createPanel();
}

function onWindowResize() {
	// console.log("new size " + container.offsetWidth.toString() + "x" + container.offsetHeight.toString());
	camera.aspect = container.offsetWidth / container.offsetHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(container.offsetWidth, container.offsetHeight);
}

function onKeyDown( event ) {
	// if (event.code === 'KeyL') {
	// 	switchLight();
	// }

	enableSelection = ( event.keyCode === 16 ) ? true : false;
	if ( enableSelection === true ) {
		drag_controls.enabled = true; 
		controls.enabled = false; 
	}
}

function onKeyUp() {
	enableSelection = false;

	drag_controls.enabled = false; 
	controls.enabled = true; 
}

function onClickMesh( event ) {
	event.preventDefault();

	if ( enableSelection === true ) {

		const draggableObjects = drag_controls.getObjects();
		draggableObjects.length = 0;

		var rect = event.target.getBoundingClientRect();
		var x = (event.clientX - rect.left) / (rect.right - rect.left); //x position within the element.
		var y = (event.clientY - rect.top) / (rect.bottom - rect.top);  //y position within the element.
		mouse.x = x * 2 - 1;
		mouse.y = y * 2 - 1;

		raycaster.setFromCamera( mouse, camera );
		const intersections = raycaster.intersectObjects( objects, true );

		// if ( intersections.length > 0 ) {
		// 	console.log("intersect!"); 

			// const object = intersections[ 0 ].object;

			// if ( group.children.includes( object ) === true ) {
			// 	object.material.emissive.set( 0x000000 );
			// 	scene.attach( object );
			// } else {
			// 	object.material.emissive.set( 0xaaaaaa );
			// 	group.attach( object );
			// }

		// 	drag_controls.transformGroup = true;
		// 	draggableObjects.push( group );
		// }

		if ( group.children.length === 0 ) {
			drag_controls.transformGroup = false;
			draggableObjects.push( ...objects );
		}
	}
	render();
}

// function onKeyboardEvent(e) {
// 	if (e.code === 'KeyL') {
// 		switchLight();
// 	}
// }

function switchLight(){
	lighting = !lighting;

	if (lighting) {

		ambient.intensity = 0.25;
		scene.add(keyLight);
		scene.add(fillLight);
		scene.add(backLight);

	} else {
		ambient.intensity = 1.0;
		scene.remove(keyLight);
		scene.remove(fillLight);
		scene.remove(backLight);
	}
}


function onMouseMove( event ) {
	var rect = event.target.getBoundingClientRect();
	var x = (event.clientX - rect.left) / (rect.right - rect.left); //x position within the element.
	var y = (event.clientY - rect.top) / (rect.bottom - rect.top);  //y position within the element.
	mouse.x = x * 2 - 1;
	mouse.y = y * 2 - 1;

	render();
}

function render() {
	// if (scene.children.length > 5) {
	// 	for ( let i = 5; i < scene.children.length; i ++ ) {
	// 	scene.children[ i ].material.color.set( 0xffffff );
	// 	}
	// }
	
	// raycaster.setFromCamera( mouse, camera );
	// const intersects = raycaster.intersectObjects( scene.children, true );

	// for ( let i = 0; i < intersects.length; i ++ ) {
	// 	console.log("mesh clicked."); 
	// 	intersects[ i ].object.material.color.set( 0x0000ff );
	// }

	renderer.render( scene, camera );
}

container.addEventListener( 'mousemove', onMouseMove, false );
window.requestAnimationFrame(render);

function clearHybridModels() {
	// for (let hybridName of hybridModelList) {
	// 	var objName = eval(hybridName);
	// 	if (objName !== undefined){
	// 		console.log(objName); 
	// 		var obj = scene.getObjectByName(objName);
	// 		scene.remove(obj);
	// 	}
	// }
	let objId = hybridModelList.pop(); 
	// console.log(objId); 
	var obj = scene.getObjectById(objId);
	scene.remove(obj);

	render(); 
}


function clearObjts() {
	for (let objclass of ["head", "body", "leg", "tail", "arm", "bodya", "bodyh"]) {
		var oldobjname = eval(objclass);
		if (oldobjname !== undefined){
			console.log(oldobjname); 
			var oldobj = scene.getObjectByName(oldobjname);
			scene.remove(oldobj);
		}
	}
	// render(); 

	clearHybridModels(); 

	// window.location.reload();
}

function openTab(evt, tabName) {
	clearObjts(); 

	curTabName = tabName; 

	var i, tabcontent, tablinks;
	tabcontent = document.getElementsByClassName("tabcontent");
	for (i = 0; i < tabcontent.length; i++) {
		tabcontent[i].style.display = "none";
	}
	tablinks = document.getElementsByClassName("tablinks");
	for (i = 0; i < tablinks.length; i++) {
		tablinks[i].className = tablinks[i].className.replace(" active", "");
	}
	document.getElementById(tabName).style.display = "block";
	evt.currentTarget.className += " active";
	setCamerabyTab();
}
function setCamerabyTab(){
	if (curTabName == "HH") {
		camera.position.set(-25, 2, 0);
		camera.rotation.set(0, -1.57, 0);
	}
	else if (curTabName == "AH") {
		camera.position.set(-18, 2, 18);
		camera.rotation.set(0, -0.85, 0);
	}
	else if (curTabName == "HO") {
		camera.position.set(-18, 2, 18);
		camera.rotation.set(0, -0.85, 0);
	}
	else{
		camera.position.set(0, 0, 25);
		camera.rotation.set(0, 0, 0);
	}
	console.log(camera.position);
	console.log(camera.rotation);
}

function openSubTab(evt, tabName) {
	var i, tabcontent, tablinks;
	tabcontent = document.getElementsByClassName("tabsubcontent");
	for (i = 0; i < tabcontent.length; i++) {
		tabcontent[i].style.display = "none";
	}
	tablinks = document.getElementsByClassName("subtablinks");
	for (i = 0; i < tablinks.length; i++) {
		tablinks[i].className = tablinks[i].className.replace(" active", "");
	}
	document.getElementById(tabName).style.display = "block";
	evt.currentTarget.className += " active";
}

let animatable_array = ["ghhg", "ggrg", "rggh", "hhhp", "phgp", "dccd"]; 


var coll = document.getElementsByClassName("collapsible");
var i;

for (i = 0; i < coll.length; i++) {
  coll[i].addEventListener("click", function() {
    this.classList.toggle("active");
    var content = this.nextElementSibling;
    if (content.style.maxHeight){
      content.style.maxHeight = null;
    } else {
      content.style.maxHeight = content.scrollHeight + "px";
    }
  });
}

function onClickMinusBtn(element) {
	const textPromptGroup = document.getElementById("text_prompt_group"); 
	if (textPromptGroup.getElementsByClassName("text_line").length > 1) {
		element.parentElement.remove();
	}

	// re-number all elements
	var allTextLines = textPromptGroup.getElementsByClassName("text_line");
	var numinput = allTextLines.length;
	for (let i = 0; i < numinput; i++) {
		allTextLines[i].id = "text" + String(i);
		allTextLines[i].getElementsByClassName("textinput")[0].id = "text_prompt" + String(i);
	}

	// when there is one text box, show plus button, remove connect button
	if (numinput == 1 && document.getElementById("connectbutton") != undefined) {
		// add plus button
		var plusBtn = document.createElement("button");
		plusBtn.id = "plusbutton";
		plusBtn.className = "fa fa-plus";
		plusBtn.style.cssText = "width: 30px; height: 30%; margin-left: 5%; margin-top: 1.5%;"
		plusBtn.setAttribute("onClick", "javascript: clickPlusBtn();");
		document.getElementById("text_prompt_group").appendChild(plusBtn);
		// remove connect button
		var connectBtn = document.getElementById("connectbutton");
		connectBtn.parentNode.removeChild(connectBtn);
	}
}

function onClickPlusBtn() {
	const textPromptGroup = document.getElementById("text_prompt_group"); 
	const textBoxGroup = document.getElementById("text0");
	// document.body.wrapper.appendChild(textBoxGroup);

	var numinput = textPromptGroup.getElementsByClassName("text_line").length;
	var clone = textBoxGroup.cloneNode(true);
	
	// remove preview buttons from the clone
	const preview_element = clone.getElementsByClassName("previewbutton")[0];
	while (preview_element.firstChild) {
		preview_element.removeChild(preview_element.lastChild);
	}

	clone.id = "text" + String(numinput);
	clone.getElementsByClassName("textinput")[0].id = "text_prompt" + String(numinput);
	clone.getElementsByClassName("textinput")[0].value = "";
	textPromptGroup.insertBefore(clone, textPromptGroup.children[numinput]);

	if (numinput+1 == 2) { // when there are two text boxes, remove plus button, show connect button
		// remove plus button
		var plusBtn = document.getElementById("plusbutton");
		plusBtn.parentNode.removeChild(plusBtn);
		// create connect button
		var connectBtn = document.createElement("button");
		connectBtn.id = "connectbutton"
		connectBtn.textContent = "Connect"
		connectBtn.style.cssText = "width: 100px; height: 3em; text-align: center; margin-top: 5%; margin-left: 42%;"
		document.getElementById("text_prompt_group").appendChild(connectBtn);
		connectBtn.disabled = true; 
	}
}

function playPause() { 
	const button = document.getElementById( "play" );
	if (actions == undefined) {
		return;
	}
	if (actions.paused) {
		actions.paused = false;
		button.innerHTML = "❙❙";
		pbtimeout = setTimeout(updateProgressBar, 0.05);
	}
	else {
		actions.paused = true;
		button.innerHTML = "►";
		clearTimeout(pbtimeout);
	}
}

function updateProgressBar() {
	clearTimeout(pbtimeout);
	const progress = document.getElementById("progress");
	// console.log(action);
	let currentTime = actions.time;
	let duration = actions._clip.duration;
	progress.value = Math.round((currentTime / duration) * 100);
	// console.log(duration);
	// console.log(typeof duration);

	// while (currentTime <= duration) {
	// // 	setInterval(function () {
	// // 	progress.value = Math.round((currentTime / duration) * 100);
	// //   });
	//   progress.value = Math.round((currentTime / duration) * 100);
	//   currentTime += 0.01;
	// }

	pbtimeout = setTimeout(updateProgressBar, 0.05);
	
}

function applyAnimation(url) {
	const loader2 = new SMPLJsonLoader();
	// let duration;
	loader2.load(url, 
		function(obj) {
			animations = obj.animations;
			model.animations = animations;

			mixer.stopAllAction();
			for (let i = 0; i < mixer._actions.length; i++) {
				mixer.uncacheClip(mixer._actions[i]._clip);
			}
			 
			clearTimeout(pbtimeout);

			console.log(mixer);

			actions = mixer.clipAction(animations[0]);
			actions.play(); 

			requestAnimationFrame(animate);
			controls.update();

			pbtimeout = setTimeout(updateProgressBar, 0.05);
		}, 
		null,
		function() {
			window.alert("Generating motion. Please try again later.");
		}
	);
}

function onClickConnectBtn(activePreviews) {
	// get selected motions from preview buttons
	var url1 = activePreviews[0].id; 
	var url2 = activePreviews[1].id;

	// send selected urls
	// fetch('cgi-bin/gen_mesh.py?url1=' + url1 + '&url2=' + url2)
	// 	// .then((response) => response.json())
	// 	// .then(function(data){
	// 	// 	for (let i = 0; i < 3; i++) {
	// 	// 		preview_element.children[i].firstChild.src = data[i] + ".png";
	// 	// 		preview_element.children[i].id = encodeURIComponent(data[i]);
	// 	// 	}
	// 	// })
	// 	.catch(console.error);
	
	let url = 'cgi-bin/gen_mesh.py?url1=' + url1 + '&url2=' + url2;
	applyAnimation(url);
}

var activePreviews;
function onClickMotionBtn() {
	// query json file for animation display
	if (this.id.startsWith("previewbutton")) {
		return;
	}
	let url = decodeURIComponent(this.id) + '.json';
	applyAnimation(url);

	// highlight the clicked motion preview button
	var elements = this.parentElement.children;
	for (let i = 0; i < elements.length;  i++) {
		let elem = elements[i];
		elem.className = "";
	}
	this.className = "previewbutton active";

	// if there is any selected motion, enable the edit panel
	// createPanel();

	// if there are two selected motions, enable the connect button
	activePreviews = document.getElementsByClassName("previewbutton active");
	var connectBtn = document.getElementById("connectbutton");
	if (activePreviews.length > 1) {
		connectBtn.disabled = false; 
		connectBtn.addEventListener("click", function(){
			onClickConnectBtn(activePreviews);
		}, false);
	}
}

function createPreviewBtn(preview_element) {
	while (preview_element.firstChild) {
		preview_element.removeChild(preview_element.lastChild);
	}

	for (let i = 0; i < 3; i++) {
		var newImage = document.createElement("img");
		newImage.src = "assets/loading.gif";
		var newButton = document.createElement("button");
		newButton.appendChild(newImage);
		newButton.id = "previewbutton" + String(i);
		preview_element.appendChild(newButton);

		newButton.onclick = onClickMotionBtn.bind(newButton);
	}
}

function onClickAnimateBtn(element) {
	AnimateBtnClicked = true; 
	clock = new Clock();

	// disable connect button
	var connectBtn = document.getElementById("connectbutton");
	if (connectBtn != undefined && connectBtn.disabled == false) {
		connectBtn.disabled = true;
	}

	// create preview buttons
	const text_prompt_group = element.parentElement; 
	const preview_element = text_prompt_group.getElementsByClassName("previewbutton")[0];
	createPreviewBtn(preview_element)

	// get and send text content
	var text_prompt_id = element.parentElement.getElementsByClassName("textinput")[0].id;
	var text_content = document.getElementById(text_prompt_id);
	
	fetch('cgi-bin/gen_mesh.py?text=' + encodeURIComponent(text_content.value))
		.then((response) => response.json())
		.then(function(data){
			for (let i = 0; i < 3; i++) {
				preview_element.children[i].firstChild.src = data[i] + ".png";
				preview_element.children[i].id = encodeURIComponent(data[i]);
			}
		})
		.catch(console.error);
	// // const loader = new GLTFLoader();
	// const loader = new FBXLoader();
	// loader.load('assets/'+fbxFileName+'.fbx', function (gltf) {
	// 	model = gltf;
	// 	// smpl mesh
	// 	model.scale.set(0.06, 0.06, 0.06); 
	// 	model.position.set(0, -7, 0); 
	// 	scene.add(model);
	// 	// console.log(model);

	// 	model.traverse( function ( object ) {
	// 		if ( object.isMesh ) object.castShadow = true;
	// 	} );

	// 	// skeleton
	// 	skeleton = new SkeletonHelper( model );
	// 	skeleton.visible = true;
	// 	scene.add(skeleton);
	// 	console.log(skeleton);
		
	// 	// createPanel();

	// 	// animation
	// 	const loader2 = new SMPLJsonLoader();
	// 	loader2.load('cgi-bin/gen_mesh.py?text=' + encodeURIComponent(text_content.value), function(obj) {
	// 	// loader2.load('assets/' + 'sample00_rep02_smpl_params.npy.json', function(obj) {
	// 		animations = obj.animations;
	// 		model.animations = animations;
	// 		// console.log(animations.length)
	// 		mixer = new AnimationMixer(model);
	// 		console.log(animations);

	// 		actions = mixer.clipAction(animations[0]);
			
	// 		actions.play(); 
	
	// 		requestAnimationFrame(animate);
	// 		controls.update();
	// 	})
	// } );

	stats = new Stats();
	container.appendChild( stats.dom );
}

var panel, folder1, folder2, folder3;

function createPanel() {
	panel = new GUI( { width: 250 } );

	folder1 = panel.addFolder( 'Visibility' );
	folder2 = panel.addFolder( 'Quality Edit' );
	folder3 = panel.addFolder( 'Partial Body Edit' );
	// const folder2 = panel.addFolder( 'Activation/Deactivation' );
	// const folder3 = panel.addFolder( 'Pausing/Stepping' );
	// const folder4 = panel.addFolder( 'Animators' );
	// const folder5 = panel.addFolder( 'Blend Weights' );
	// const folder6 = panel.addFolder( 'General Speed' );

	settings = {
		'show model': true,
		'show skeleton': true,
		// 'deactivate animations': deactivateAllActions,
		// 'activate animations': activateAllActions,
		// // 'pause/continue': pauseContinue,
		// // 'make a single step': toSingleStepMode,
		// // 'modify step size': 0.05,
		// 'from walk to idle': function () {
		// 	prepareCrossFade( walkAction, idleAction, 1.0 );
		// },
		// 'from idle to walk': function () {
		// 	prepareCrossFade( idleAction, walkAction, 0.5 );
		// },
		// 'from walk to run': function () {
		// 	prepareCrossFade( walkAction, runAction, 2.5 );
		// },
		// 'from run to walk': function () {
		// 	prepareCrossFade( runAction, walkAction, 5.0 );
		// },
		// 'use default duration': true,
		// // 'set custom duration': 3.5,
		'partial body edit': partialBodyEdit,
		'light<>strong': 0.5,
		'free<>bound': 0.5,
		'happy<>sad': 0.5,
		'excited<>calm': 0.5,
		'upper body': ''
		// 'modify time scale': 1.0
	};

	folder1.add( settings, 'show model' ).onChange( showModel );
	folder1.add( settings, 'show skeleton' ).onChange( showSkeleton );
	folder2.add( settings, 'light<>strong', 0.0, 1.0, 0.1 ).listen().onChange( function ( weight ) {
		setWeight( idleAction, weight );
	} );
	folder2.add( settings, 'free<>bound', 0.0, 1.0, 0.1 ).listen().onChange( function ( weight ) {
		setWeight( walkAction, weight );
	} );
	folder2.add( settings, 'happy<>sad', 0.0, 1.0, 0.1 ).listen().onChange( function ( weight ) {
		setWeight( runAction, weight );
	} );
	folder2.add( settings, 'excited<>calm', 0.0, 1.0, 0.1 ).listen().onChange( function ( weight ) {
		setWeight( runAction, weight );
	} );
	// folder3.add( settings, 'partial body edit' );
	var textline = folder3.add( settings, 'upper body' );
	var button = document.createElement('button');
	button.innerHTML = "edit";
	textline.$widget.appendChild(button);
	// folder3.add( settings, 'activate animations' );
	// folder3.add( settings, 'pause/continue' );
	// folder3.add( settings, 'make a single step' );
	// folder3.add( settings, 'modify step size', 0.01, 0.1, 0.001 );
	// crossFadeControls.push( folder4.add( settings, 'from walk to idle' ) );
	// crossFadeControls.push( folder4.add( settings, 'from idle to walk' ) );
	// crossFadeControls.push( folder4.add( settings, 'from walk to run' ) );
	// crossFadeControls.push( folder4.add( settings, 'from run to walk' ) );
	// folder4.add( settings, 'use default duration' );
	// folder4.add( settings, 'set custom duration', 0, 10, 0.01 );
	// folder5.add( settings, 'modify idle weight', 0.0, 1.0, 0.01 ).listen().onChange( function ( weight ) {
	// 	setWeight( idleAction, weight );
	// } );
	// folder5.add( settings, 'modify walk weight', 0.0, 1.0, 0.01 ).listen().onChange( function ( weight ) {
	// 	setWeight( walkAction, weight );
	// } );
	// folder5.add( settings, 'modify run weight', 0.0, 1.0, 0.01 ).listen().onChange( function ( weight ) {
	// 	setWeight( runAction, weight );
	// } );
	// folder6.add( settings, 'modify time scale', 0.0, 1.5, 0.01 ).onChange( modifyTimeScale );

	folder1.open();
	folder2.open();
	folder3.open();
	// folder4.open();
	// folder5.open();
	// folder6.open();
}

function partialBodyEdit () {
	// var button = document.getElementsByClassName('createbutton');
	// button.innerHTML = "edit";
	// folder3.appendChild(button);
	// folder3.add(document.getElementsByClassName('createbutton'));
	// folder3.add(document.getElementsByClassName('createbutton'));
}

function showModel( visibility ) {
	model.visible = visibility;
}

function showSkeleton( visibility ) {
	skeleton.visible = visibility;
}

function modifyTimeScale( speed ) {
	mixer.timeScale = speed;
}

function deactivateAllActions() {
	actions.forEach( function ( action ) {
		action.stop();
	} );
}

function activateAllActions() {
	// setWeight( idleAction, settings[ 'modify idle weight' ] );
	// setWeight( walkAction, settings[ 'modify walk weight' ] );
	// setWeight( runAction, settings[ 'modify run weight' ] );

	// actions.forEach( function ( action ) {
	// 	action.play();
	// } );
	setWeight( actions, 1.0 );
	actions.play(); 
}

function pauseContinue() {
	if ( singleStepMode ) {
		singleStepMode = false;
		unPauseAllActions();
	} 
	else {
		if ( idleAction.paused ) {
			unPauseAllActions();
		} else {
			pauseAllActions();
		}
	}
}

function pauseAllActions() {
	actions.forEach( function ( action ) {
		action.paused = true;
	} );
}

function unPauseAllActions() {
	actions.forEach( function ( action ) {
		action.paused = false;
	} );
}

function toSingleStepMode() {
	unPauseAllActions();

	singleStepMode = true;
	sizeOfNextStep = settings[ 'modify step size' ];
}

function prepareCrossFade( startAction, endAction, defaultDuration ) {
	// Switch default / custom crossfade duration (according to the user's choice)
	const duration = setCrossFadeDuration( defaultDuration );

	// Make sure that we don't go on in singleStepMode, and that all actions are unpaused
	singleStepMode = false;
	unPauseAllActions();

	// If the current action is 'idle' (duration 4 sec), execute the crossfade immediately;
	// else wait until the current action has finished its current loop
	if ( startAction === idleAction ) {
		executeCrossFade( startAction, endAction, duration );
	} else {
		synchronizeCrossFade( startAction, endAction, duration );
	}
}

function setCrossFadeDuration( defaultDuration ) {
	// Switch default crossfade duration <-> custom crossfade duration
	if ( settings[ 'use default duration' ] ) {
		return defaultDuration;
	} else {
		return settings[ 'set custom duration' ];
	}
}

function synchronizeCrossFade( startAction, endAction, duration ) {
	mixer.addEventListener( 'loop', onLoopFinished );

	function onLoopFinished( event ) {
		if ( event.action === startAction ) {
			mixer.removeEventListener( 'loop', onLoopFinished );

			executeCrossFade( startAction, endAction, duration );
		}
	}
}

function executeCrossFade( startAction, endAction, duration ) {
	// Not only the start action, but also the end action must get a weight of 1 before fading
	// (concerning the start action this is already guaranteed in this place)
	setWeight( endAction, 1 );
	endAction.time = 0;

	// Crossfade with warping - you can also try without warping by setting the third parameter to false
	startAction.crossFadeTo( endAction, duration, true );
}

// This function is needed, since animationAction.crossFadeTo() disables its start action and sets
// the start action's timeScale to ((start animation's duration) / (end animation's duration))
function setWeight( action, weight ) {
	action.enabled = true;
	action.setEffectiveTimeScale( 1 );
	action.setEffectiveWeight( weight );
}

// Called by the render loop
function updateWeightSliders() {
	settings[ 'modify idle weight' ] = idleWeight;
	settings[ 'modify walk weight' ] = walkWeight;
	settings[ 'modify run weight' ] = runWeight;
}

// Called by the render loop
function updateCrossFadeControls() {
	if ( idleWeight === 1 && walkWeight === 0 && runWeight === 0 ) {
		crossFadeControls[ 0 ].disable();
		crossFadeControls[ 1 ].enable();
		crossFadeControls[ 2 ].disable();
		crossFadeControls[ 3 ].disable();
	}

	if ( idleWeight === 0 && walkWeight === 1 && runWeight === 0 ) {
		crossFadeControls[ 0 ].enable();
		crossFadeControls[ 1 ].disable();
		crossFadeControls[ 2 ].enable();
		crossFadeControls[ 3 ].disable();
	}

	if ( idleWeight === 0 && walkWeight === 0 && runWeight === 1 ) {
		crossFadeControls[ 0 ].disable();
		crossFadeControls[ 1 ].disable();
		crossFadeControls[ 2 ].disable();
		crossFadeControls[ 3 ].enable();
	}
}

function animate() {
	requestAnimationFrame(animate);
	controls.update();


	// Get the time elapsed since the last frame, used for mixer update (if not in single step mode)
	let mixerUpdateDelta = clock.getDelta();

	// Update the animation mixer, the stats panel, and render this frame
	mixer.update( mixerUpdateDelta );
	stats.update();
	render();

	// Render loop
	// requestAnimationFrame( animate );

	// idleWeight = idleAction.getEffectiveWeight();
	// walkWeight = walkAction.getEffectiveWeight();
	// runWeight = runAction.getEffectiveWeight();

	// // Update the panel values if weights are modified from "outside" (by crossfadings)
	// updateWeightSliders();

	// // Enable/disable crossfade controls according to current weight values
	// updateCrossFadeControls();

	// // Get the time elapsed since the last frame, used for mixer update (if not in single step mode)
	// let mixerUpdateDelta = clock.getDelta();

	// // If in single step mode, make one step and then do nothing (until the user clicks again)
	// if ( singleStepMode ) {
	// 	mixerUpdateDelta = sizeOfNextStep;
	// 	sizeOfNextStep = 0;
	// }

	// // Update the animation mixer, the stats panel, and render this frame
	// mixer.update( mixerUpdateDelta );
	// stats.update();
	// renderer.render( scene, camera );
}


function onClickDownloadBtn() {
	if (AnimateBtnClicked == false) {
		const objExporter = new OBJExporter();
		const objString = objExporter.parse( scene );
		saveString( objString, objString.split('\n')[0].split(' ')[1] + '.obj' );
	}
	else {
		var HHInitials = AAarray[0][0] + AAarray[1][0] + AAarray[2][0] + AAarray[3][0]; // head, body, legs, arms

		const gltfExporter = new GLTFExporter();
		// const options = {
		// 	trs: params.trs,
		// 	onlyVisible: params.onlyVisible,
		// 	truncateDrawRange: params.truncateDrawRange,
		// 	binary: params.binary,
		// 	maxTextureSize: params.maxTextureSize
		// };
		gltfExporter.parse(
			scene,
			function ( result ) {
				if ( result instanceof ArrayBuffer ) {
					saveArrayBuffer( result, 'scene.glb' );
				} else {
					const output = JSON.stringify( result, null, 2 );
					// console.log( output );

					if (HHInitials == "ghhg") {
						saveString( output, 'Hgirl-Bman-Lman-Agirl.gltf' );
					}
					else if (HHInitials == "rggh") {
						saveString( output, 'Hrobot-Bgirl-Lgirl-Aman.gltf' );
					}
					else {
						saveString( output, 'scene.gltf' );
					}
				}
			}, 
			// options
		);
	}
}
const link = document.createElement( 'a' );
link.style.display = 'none';
document.body.appendChild( link );

function save( blob, filename ) {
	link.href = URL.createObjectURL( blob );
	link.download = filename;
	link.click();
}
function saveString( text, filename ) {
	save( new Blob( [ text ], { type: 'text/plain' } ), filename );
}
function saveArrayBuffer( buffer, filename ) {
	save( new Blob( [ buffer ], { type: 'application/octet-stream' } ), filename );
}



function allowDrop(ev) {
	ev.preventDefault();
}

function drag(ev) {
	// console.log(ev);
	ev.dataTransfer.setData("text", ev.target.id);
}

let objectsInClass = {
	"AA": ["Head", "Body", "Leg", "Tail"],
	"HH": ["Head", "Body", "Leg", "Arm"],
	"OO": ["Head", "Body", 'Arm'],
	"AH": ["Head", "Arm", "BodyH", "BodyA", "Leg", "Tail"], 
	"AO": ["Head", "Body", "Leg", "Tail"], 
	"HO": ["Head", "Body", "Leg", "Arm"]
};

function onClickPart(event, data) {
	// if have assembled, remove assembled model and re-place parts
	if (assembled == true) {
		assembled = false;
		clearHybridModels();
		setCamerabyTab();
		let objClassArray = objectsInClass[curTabName];
		for (let i = 0; i < objClassArray.length; i++) {
			if (data.endsWith( objClassArray[i])) {
				continue;
			}
			addPart(partArray[i] + objClassArray[i], false);
		}
	}

	let activeButton = event.currentTarget;
	activeButton.className = activeButton.className.replace(" active", "");
	var elements = document.getElementsByClassName(activeButton.className);
	for (let i = 0; i < elements.length;  i++) {
		let elem = elements[i];
		elem.className = elem.className.replace(" active", "");
	}
	activeButton.className += " active";
	
	addPart(data);
}

function addPart(data, needrender=true){
	var objclass = undefined;
	if (data.endsWith('Head')) {
		objclass = 'head'; 

		if (curTabName == "OO"){ 
			OOarray[0] = data.toString().substring(0, data.toString().indexOf("H")); 
		}
		else if (curTabName == "AH") {
			AHarray[0] = data.toString().substring(0, data.toString().indexOf("H")); 
		}
		else {
			AAHead = data.toString().substring(0, data.toString().indexOf("H")); 
			AAarray[0] = AAHead; 
		}
	}
	if (data.endsWith('Body')) {
		objclass = 'body';

		if (curTabName == "OO"){ 
			OOarray[1] = data.toString().substring(0, data.toString().indexOf("B")); 
		}
		else {
			AABody = data.toString().substring(0, data.toString().indexOf("B")); 
			AAarray[1] = AABody; 
		}
	}
	if (data.endsWith('Leg')) {
		objclass = 'leg';

		if (curTabName == "AH") {
			AHarray[4] = data.toString().substring(0, data.toString().indexOf("L")); 
		}
		else {
			AALeg = data.toString().substring(0, data.toString().indexOf("L"));
			AAarray[2] = AALeg;  
		}
	}
	if (data.endsWith('Tail')) {
		objclass = 'tail';

		if (curTabName == "AH") {
			AHarray[5] = data.toString().substring(0, data.toString().indexOf("T")); 
		}
		else {
			AATail = data.toString().substring(0, data.toString().indexOf("T")); 
			AAarray[3] = AATail; 
		}
	}
	if (data.endsWith('Arm')) {
		objclass = 'arm';

		if (curTabName == "OO"){ 
			OOarray[2] = data.toString().substring(0, data.toString().indexOf("A")); 
		} else if (curTabName == "AH") {
			AHarray[1] = data.toString().substring(0, data.toString().indexOf("A")); 
		}
		else {
			AAArm = data.toString().substring(0, data.toString().indexOf("A")); 
			AAarray[3] = AAArm;
		}
		 
	}
	if (data.endsWith('BodyH')) {
		objclass = 'bodyh';
		AHarray[2] = data.toString().substring(0, data.toString().indexOf("B")); 
	}
	if (data.endsWith('BodyA')) {
		objclass = 'bodya';
		AHarray[3] = data.toString().substring(0, data.toString().indexOf("B")); 
	}


	var oldobjname = eval(objclass);
	if (oldobjname !== undefined){
		var oldobj = scene.getObjectByName(oldobjname);
		scene.remove(oldobj);
	}
	eval(objclass + ' = data') ;

	var objLoader = new OBJLoader();
	objLoader.setPath('assets/pegasus_parts/');

	

	var file = undefined; 
	file = file_dict[data]; 
	if (file == undefined) {
		file = file_dict[data.slice(0, -1)];
	}

	
	objLoader.load(file, function (object){
		loadObjectSync(object, data, needrender);
	});
	
}

function loadObjectSync (object, data, needrender) {
	var scale = scale_dict[data];
	if (scale == undefined) {
		scale = scale_dict[data.slice(0, -1)];
	}
	if (scale == undefined) {
		scale = [1, 1, 1];
	}

	var position = position_dict[data];
	if (position == undefined) {
		position = position_dict[data.slice(0, -1)];
	}
	if (position == undefined) {
		position = [0, 0, 0];
	}

	var rotation = rotation_dict[data];
	if (rotation == undefined) {
		rotation = rotation_dict[data.slice(0, -1)];
	}
	if (rotation == undefined) {
		rotation = [0, 0, 0];
	}

	object = object.children[0];
	object.material = new MeshLambertMaterial({color: 0xffffff});
	object.scale.set(...scale);
	object.position.set(...position);
	object.rotation.set(...rotation);
	object.name = data;
	scene.add(object);

	objects.push( object );
	if (needrender){
		render();
	}
}

function drop(ev) {
	ev.preventDefault();
	var data = ev.dataTransfer.getData("text");
	// console.log(ev);
	onClickPart(ev, data);
}

function onClickAssembleBtn() {

	camera.position.set(0, 0, 25);
	camera.rotation.set(0, 0, 0);
	
	// test
	// var objLoader = new OBJLoader();
	// objLoader.setPath('assets/pegasus_models/');
	// objLoader.load('Hremy-Bbird-Lbird-Tbird.obj', function (object) {
	// 	object.scale.set(8, 8, 8);
	// 	object.position.set(-3, -2, 0);
	// 	object.rotation.set(0, 30, 0);
	// 	scene.add(object);
	// 	render(); 
		
	// 	hybridModelList.push(object.id); 
	// });


	// AH
	if (curTabName == "AH") {
		// sanity check
		if (AHarray.slice(0, 6).includes(undefined)) {
			window.alert("You need to pick all the needed components to assemble!"); 
			return; 
		}
		// clear components
		clearObjts(); 
		assembled = true;

		// activate the animate button
		// animateButton.disabled = false; 

		// load hybrid model
		var objLoader = new OBJLoader();
		objLoader.setPath('assets/pegasus_models/');

		var AHinitals = AHarray[0][0]+AHarray[1][0]+AHarray[2][0]+AHarray[3][0]+AHarray[4][0]+AHarray[5][0]; 
		// head, arm, bodyh, bodya, leg, tail

		if (AHinitals == "gggccc") {
			objLoader.load('Hgirl-Agirl-BHgirl-BAcamel-Lcamel-Tcamel.obj', function (object) {
				object.scale.set(8, 8, 8);
				object.position.set(-3, -2, 0);
				object.rotation.set(0, 30, 0);
				scene.add(object);
				render(); 
				
				hybridModelList.push(object.id); 
			});
		}
		if (AHinitals == "rhghcw") {
			objLoader.load('Hrobot-Ahuman-BHgirl-BAhorse-Lcamel-Twolf.obj', function (object) {
				object.scale.set(10, 10, 10);
				object.position.set(0, -6, 0);
				object.rotation.set(0, 30, 0);
				scene.add(object);
				render(); 
				
				hybridModelList.push(object.id); 
			});
		}
		if (AHinitals == "ggghhh") {
			objLoader.load('Hgranny-Agranny-Bgranny-Bhorse-Lhorse-Thorse.obj', function (object) {
				object.scale.set(10, 10, 10);
				object.position.set(0, -6, 0);
				object.rotation.set(0, 30, 0);
				scene.add(object);
				render(); 
				
				hybridModelList.push(object.id); 
			});
		}

		return; 
	}


	// OO
	if (curTabName == "OO") {
		// sanity check
		if (OOarray.slice(0, 3).includes(undefined)) {
			window.alert("You need to pick all the needed components to assemble!"); 
			return; 
		}
		// clear components
		clearObjts(); 
		assembled = true;

		// activate the animate button
		// animateButton.disabled = false; 

		// load hybrid model
		var objLoader = new OBJLoader();
		objLoader.setPath('assets/pegasus_models/');

		var OOinitals = OOarray[0][0]+OOarray[1][0]+OOarray[2][0]; // head, body, arm

		if (OOinitals == "ccp") {
			objLoader.load('Hcar-Bcar-Aplane.obj', function (object) {
				object.scale.set(8, 8, 8);
				scene.add(object);
				render(); 
				
				hybridModelList.push(object.id); 
			});
		}

		return; 
	}



	// sanity check
	if (AAarray.slice(0, 4).includes(undefined)) {
		window.alert("You need to pick all the needed components to assemble!"); 
		return; 
	}

	// clear components
	clearObjts(); 
	assembled = true;

	// load hybrid model
	var objLoader = new OBJLoader();
	objLoader.setPath('assets/pegasus_models/');

	var AAinitals = AAarray[0][0]+AAarray[1][0]+AAarray[2][0]+AAarray[3][0]; 
	if (animatable_array.includes(AAinitals)) {
		// activate the animate button
		animateButton.disabled = false; 
	}

	if (AAinitals == "cccc") {
		objLoader.load('Hcamel-Bcamel-Lcamel-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "cccd") {
		objLoader.load('Hcamel-Bcamel-Lcamel-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "cccr") {
		objLoader.load('Hcamel-Bcamel-Lcamel-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ccdc") {
		objLoader.load('Hcamel-Bcamel-Ldinosaur-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ccdd") {
		objLoader.load('Hcamel-Bcamel-Ldinosaur-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ccdr") {
		objLoader.load('Hcamel-Bcamel-Ldinosaur-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ccrc") {
		objLoader.load('Hcamel-Bcamel-Ldrabbit-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ccrd") {
		objLoader.load('Hcamel-Bcamel-Lrabbit-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ccrr") {
		objLoader.load('Hcamel-Bcamel-Lrabbit-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}

	if (AAinitals == "cdcc") {
		objLoader.load('Hcamel-Bdinosaur-Lcamel-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "cdcd") {
		objLoader.load('Hcamel-Bdinosaur-Lcamel-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "cdcr") {
		objLoader.load('Hcamel-Bdinosaur-Lcamel-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "cddc") {
		objLoader.load('Hcamel-Bdinosaur-Ldinosaur-Tcamel.obj', function (object) {
			object.scale.set(0.65, 0.65, 0.65);
			object.position.set(0, 1, 0.5);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "cddd") {
		objLoader.load('Hcamel-Bdinosaur-Ldinosaur-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "cddr") {
		objLoader.load('Hcamel-Bdinosaur-Ldinosaur-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "cdrc") {
		objLoader.load('Hcamel-Bdinosaur-Lrabbit-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "cdrd") {
		objLoader.load('Hcamel-Bdinosaur-Lrabbit-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "cdrr") {
		objLoader.load('Hcamel-Bdinosaur-Lrabbit-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "crcc") {
		objLoader.load('Hcamel-Brabbit-Lcamel-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "crcd") {
		objLoader.load('Hcamel-Brabbit-Lcamel-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "crcr") {
		objLoader.load('Hcamel-Brabbit-Lcamel-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "crdc") {
		objLoader.load('Hcamel-Brabbit-Ldinosaur-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "crdd") {
		objLoader.load('Hcamel-Brabbit-Ldinosaur-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "crdr") {
		objLoader.load('Hcamel-Brabbit-Ldinosaur-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "crrc") {
		objLoader.load('Hcamel-Brabbit-Lrabbit-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "crrd") {
		objLoader.load('Hcamel-Brabbit-Lrabbit-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "crrr") {
		objLoader.load('Hcamel-Brabbit-Lrabbit-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "cdwt") {
		objLoader.load('Hcamel-Bdinosaur-Lwolf-Ttiger.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hcdr") {
		objLoader.load('Hhorse-Bcamel-Ldinosaur-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hctd") {
		objLoader.load('Hhorse-Bcamel-Ltiger-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}


	if (AAinitals == "dccc") {
		objLoader.load('Hdinosaur-Bcamel-Lcamel-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "dccd") {
		objLoader.load('Hdinosaur-Bcamel-Lcamel-Tdinosaur.obj', function (object) {
			// object.scale.set(0.9, 0.9, 0.9);
			// object.position.set(-0.5, -1, 1);
			// scene.add(object);
			// render(); 
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "dccr") {
		objLoader.load('Hdinosaur-Bcamel-Lcamel-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "dcdc") {
		objLoader.load('Hdinosaur-Bcamel-Ldinosaur-Tcamel.obj', function (object) {
			// object.scale.set(0.6, 0.6, 0.6);
			// object.position.set(-0.5, -1.5, 0.5);
			// scene.add(object); 
			// render(); 
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "dcdd") {
		objLoader.load('Hdinosaur-Bcamel-Ldinosaur-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "dcdr") {
		objLoader.load('Hdinosaur-Bcamel-Ldinosaur-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "dcrc") {
		objLoader.load('Hdinosaur-Bcamel-Lrabbit-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "dcrd") {
		objLoader.load('Hdinosaur-Bcamel-Lrabbit-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "dcrr") {
		objLoader.load('Hdinosaur-Bcamel-Lrabbit-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ddcc") {
		objLoader.load('Hdinosaur-Bdinosaur-Lcamel-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ddcd") {
		objLoader.load('Hdinosaur-Bdinosaur-Lcamel-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ddcr") {
		objLoader.load('Hdinosaur-Bdinosaur-Lcamel-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "dddc") {
		objLoader.load('Hdinosaur-Bdinosaur-Ldinosaur-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "dddd") {
		objLoader.load('Hdinosaur-Bdinosaur-Ldinosaur-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "dddr") {
		objLoader.load('Hdinosaur-Bdinosaur-Ldinosaur-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ddrc") {
		objLoader.load('Hdinosaur-Bdinosaur-Lrabbit-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ddrd") {
		objLoader.load('Hdinosaur-Bdinosaur-Lrabbit-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ddrr") {
		objLoader.load('Hdinosaur-Bdinosaur-Lrabbit-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "drcc") {
		objLoader.load('Hdinosaur-Brabbit-Lcamel-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "drcd") {
		objLoader.load('Hdinosaur-Brabbit-Lcamel-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "drcr") {
		objLoader.load('Hdinosaur-Brabbit-Lcamel-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "drdc") {
		objLoader.load('Hdinosaur-Brabbit-Ldinosaur-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "drdd") {
		objLoader.load('Hdinosaur-Brabbit-Ldinosaur-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "drdr") {
		objLoader.load('Hdinosaur-Brabbit-Ldinosaur-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "drrc") {
		objLoader.load('Hdinosaur-Brabbit-Lrabbit-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "drrd") {
		objLoader.load('Hdinosaur-Brabbit-Lrabbit-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "drrr") {
		objLoader.load('Hdinosaur-Brabbit-Lrabbit-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}

	if (AAinitals == "rccc") {
		objLoader.load('Hrabbit-Bcamel-Lcamel-Tcamel.obj', function (object) {
			// object.scale.set(1.75, 1.75, 1.75);
			// object.position.set(-3, -1.5, -1.5);
			// scene.add(object);
			// render(); 
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rccd") {
		objLoader.load('Hrabbit-Bcamel-Lcamel-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rccr") {
		objLoader.load('Hrabbit-Bcamel-Lcamel-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rcdc") {
		objLoader.load('Hrabbit-Bcamel-Ldinosaur-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rcdd") {
		objLoader.load('Hrabbit-Bcamel-Ldinosaur-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rcdr") {
		objLoader.load('Hrabbit-Bcamel-Ldinosaur-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rcrc") {
		objLoader.load('Hrabbit-Bcamel-Lrabbit-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rcrd") {
		objLoader.load('Hrabbit-Bcamel-Lrabbit-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rcrr") {
		objLoader.load('Hrabbit-Bcamel-Lrabbit-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rdcc") {
		objLoader.load('Hrabbit-Bdinosaur-Lcamel-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rdcd") {
		objLoader.load('Hrabbit-Bdinosaur-Lcamel-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rdcr") {
		objLoader.load('Hrabbit-Bdinosaur-Lcamel-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rddc") {
		objLoader.load('Hrabbit-Bdinosaur-Ldinosaur-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rddd") {
		objLoader.load('Hrabbit-Bdinosaur-Ldinosaur-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rddr") {
		objLoader.load('Hrabbit-Bdinosaur-Ldinosaur-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rdrc") {
		objLoader.load('Hrabbit-Bdinosaur-Lrabbit-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rdrd") {
		objLoader.load('Hrabbit-Bdinosaur-Lrabbit-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rdrr") {
		objLoader.load('Hrabbit-Bdinosaur-Lrabbit-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rrcc") {
		objLoader.load('Hrabbit-Brabbit-Lcamel-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rrcd") {
		objLoader.load('Hrabbit-Brabbit-Lcamel-Tdinosaur.obj', function (object) {
			// scene.add(object);
			// render(); 
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rrcr") {
		objLoader.load('Hrabbit-Brabbit-Lcamel-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rrdc") {
		objLoader.load('Hrabbit-Brabbit-Ldinosaur-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rrdd") {
		objLoader.load('Hrabbit-Brabbit-Ldinosaur-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rrdr") {
		objLoader.load('Hrabbit-Brabbit-Ldinosaur-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rrrc") {
		objLoader.load('Hrabbit-Brabbit-Lrabbit-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rrrd") {
		objLoader.load('Hrabbit-Brabbit-Lrabbit-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rrrr") {
		if (AAarray[0] == "rabbit") {
			objLoader.load('Hrabbit-Brabbit-Lrabbit-Trabbit.obj', function (object) {
				object.scale.set(10, 10, 10);
				object.rotation.set(0, 30, 0);
				object.position.set(0, -5, 0);
				scene.add(object);
				render(); 
				
				hybridModelList.push(object.id); 
			});
		}
	}

	if (AAinitals == "wccc") {
		objLoader.load('Hwolf-Bcamel-Lcamel-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wccd") {
		objLoader.load('Hwolf-Bcamel-Lcamel-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wccr") {
		objLoader.load('Hwolf-Bcamel-Lcamel-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wcdc") {
		objLoader.load('Hwolf-Bcamel-Ldinosaur-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wcdd") {
		objLoader.load('Hwolf-Bcamel-Ldinosaur-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wcdr") {
		objLoader.load('Hwolf-Bcamel-Ldinosaur-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wcrc") {
		objLoader.load('Hwolf-Bcamel-Lrabbit-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wcrd") {
		objLoader.load('Hwolf-Bcamel-Lrabbit-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wcrr") {
		objLoader.load('Hwolf-Bcamel-Lrabbit-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wdcc") {
		objLoader.load('Hwolf-Bdinosaur-Lcamel-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wdcd") {
		objLoader.load('Hwolf-Bdinosaur-Lcamel-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wdcr") {
		objLoader.load('Hwolf-Bdinosaur-Lcamel-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wddc") {
		objLoader.load('Hwolf-Bdinosaur-Ldinosaur-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wddd") {
		objLoader.load('Hwolf-Bdinosaur-Ldinosaur-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wddr") {
		objLoader.load('Hwolf-Bdinosaur-Ldinosaur-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wdrc") {
		objLoader.load('Hwolf-Bdinosaur-Lrabbit-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wdrd") {
		objLoader.load('Hwolf-Bdinosaur-Lrabbit-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wdrr") {
		objLoader.load('Hwolf-Bdinosaur-Lrabbit-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wrcc") {
		objLoader.load('Hwolf-Brabbit-Lcamel-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wrcd") {
		objLoader.load('Hwolf-Brabbit-Lcamel-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wrcr") {
		objLoader.load('Hwolf-Brabbit-Lcamel-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wrdc") {
		objLoader.load('Hwolf-Brabbit-Ldinosaur-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wrdd") {
		objLoader.load('Hwolf-Brabbit-Ldinosaur-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wrdr") {
		objLoader.load('Hwolf-Brabbit-Ldinosaur-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wrrc") {
		objLoader.load('Hwolf-Brabbit-Lrabbit-Tcamel.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wrrd") {
		objLoader.load('Hwolf-Brabbit-Lrabbit-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "wrrr") {
		objLoader.load('Hwolf-Brabbit-Lrabbit-Trabbit.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.rotation.set(0, 30, 0);
			object.position.set(0, -5, 0);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}



	// hh hybrid
	if (AAinitals == "gggg") {
		objLoader.load('Hg-Bg-Lg-Ag.obj', function (object) {
			object.scale.set(9.5, 9.5, 9.5);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "gggh") {
		objLoader.load('Hg-Bg-Lg-Ah.obj', function (object) {
			object.scale.set(9.5, 9.5, 9.5);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "gggr") {
		objLoader.load('Hg-Bg-Lg-Ar.obj', function (object) {
			object.scale.set(9.5, 9.5, 9.5);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "gghg") {
		objLoader.load('Hg-Bg-Lh-Ag.obj', function (object) {
			object.scale.set(9.5, 9.5, 9.5);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "gghh") {
		objLoader.load('Hg-Bg-Lh-Ah.obj', function (object) {
			object.scale.set(9.5, 9.5, 9.5);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "gghr") {
		objLoader.load('Hg-Bg-Lh-Ar.obj', function (object) {
			object.scale.set(9.5, 9.5, 9.5);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ggrg") {
		objLoader.load('Hg-Bg-Lr-Ag.obj', function (object) {
			object.scale.set(9.5, 9.5, 9.5);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ggrh") {
		objLoader.load('Hg-Bg-Lr-Ah.obj', function (object) {
			object.scale.set(9.5, 9.5, 9.5);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ggrr") {
		objLoader.load('Hg-Bg-Lr-Ar.obj', function (object) {
			object.scale.set(9.5, 9.5, 9.5);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ghgg") {
		objLoader.load('Hg-Bh-Lg-Ag.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ghgh") {
		objLoader.load('Hg-Bh-Lg-Ah.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ghgr") {
		objLoader.load('Hg-Bh-Lg-Ar.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ghhg") {
		objLoader.load('Hg-Bh-Lh-Ag.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 

			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ghhh") {
		objLoader.load('Hg-Bh-Lh-Ah.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ghhr") {
		objLoader.load('Hg-Bh-Lh-Ar.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ghrg") {
		objLoader.load('Hg-Bh-Lr-Ag.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ghrh") {
		objLoader.load('Hg-Bh-Lr-Ah.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "ghrr") {
		objLoader.load('Hg-Bh-Lr-Ar.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "grgg") {
		objLoader.load('Hg-Br-Lg-Ag.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "grgh") {
		objLoader.load('Hg-Br-Lg-Ah.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "grgr") {
		objLoader.load('Hg-Br-Lg-Ar.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "grhg") {
		objLoader.load('Hg-Br-Lh-Ag.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "grhh") {
		objLoader.load('Hg-Br-Lh-Ah.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "grhr") {
		objLoader.load('Hg-Br-Lh-Ar.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "grrg") {
		objLoader.load('Hg-Br-Lr-Ag.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "grrh") {
		objLoader.load('Hg-Br-Lr-Ah.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "grrr") {
		objLoader.load('Hg-Br-Lr-Ar.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}

	if (AAinitals == "rggg") {
		objLoader.load('Hr-Bg-Lg-Ag.obj', function (object) {
			object.scale.set(9.5, 9.5, 9.5);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rggh") {
		objLoader.load('Hr-Bg-Lg-Ah.obj', function (object) {
			object.scale.set(9.5, 9.5, 9.5);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rggr") {
		objLoader.load('Hr-Bg-Lg-Ar.obj', function (object) {
			object.scale.set(9.5, 9.5, 9.5);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rghg") {
		objLoader.load('Hr-Bg-Lh-Ag.obj', function (object) {
			object.scale.set(9.5, 9.5, 9.5);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rghh") {
		objLoader.load('Hr-Bg-Lh-Ah.obj', function (object) {
			object.scale.set(9.5, 9.5, 9.5);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rghr") {
		objLoader.load('Hr-Bg-Lh-Ar.obj', function (object) {
			object.scale.set(9.5, 9.5, 9.5);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rgrg") {
		objLoader.load('Hr-Bg-Lr-Ag.obj', function (object) {
			object.scale.set(9.5, 9.5, 9.5);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rgrh") {
		objLoader.load('Hr-Bg-Lr-Ah.obj', function (object) {
			object.scale.set(9.5, 9.5, 9.5);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rgrr") {
		objLoader.load('Hr-Bg-Lr-Ar.obj', function (object) {
			object.scale.set(9.5, 9.5, 9.5);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rhgg") {
		objLoader.load('Hr-Bh-Lg-Ag.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rhgh") {
		objLoader.load('Hr-Bh-Lg-Ah.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rhgr") {
		objLoader.load('Hr-Bh-Lg-Ar.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rhhg") {
		objLoader.load('Hr-Bh-Lh-Ag.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rhhh") {
		objLoader.load('Hr-Bh-Lh-Ah.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rhhr") {
		objLoader.load('Hr-Bh-Lh-Ar.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rhrg") {
		objLoader.load('Hr-Bh-Lr-Ag.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rhrh") {
		objLoader.load('Hr-Bh-Lr-Ah.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rhrr") {
		objLoader.load('Hr-Bh-Lr-Ar.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rrgg") {
		objLoader.load('Hr-Br-Lg-Ag.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rrgh") {
		objLoader.load('Hr-Br-Lg-Ah.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rrgr") {
		objLoader.load('Hr-Br-Lg-Ar.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rrhg") {
		objLoader.load('Hr-Br-Lh-Ag.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rrhh") {
		objLoader.load('Hr-Br-Lh-Ah.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rrhr") {
		objLoader.load('Hr-Br-Lh-Ar.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rrrg") {
		objLoader.load('Hr-Br-Lr-Ag.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rrrh") {
		objLoader.load('Hr-Br-Lr-Ah.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "rrrr") {
		if (AAarray[0] == "robot") {
			objLoader.load('Hr-Br-Lr-Ar.obj', function (object) {
				object.scale.set(8, 8, 8);
				scene.add(object);
				render(); 
				
				hybridModelList.push(object.id); 
			});
		}
	}

	if (AAinitals == "hggg") {
		objLoader.load('Hh-Bg-Lg-Ag.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hggh") {
		objLoader.load('Hh-Bg-Lg-Ah.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hggr") {
		objLoader.load('Hh-Bg-Lg-Ar.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hghg") {
		objLoader.load('Hh-Bg-Lh-Ag.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hghh") {
		objLoader.load('Hh-Bg-Lh-Ah.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hghr") {
		objLoader.load('Hh-Bg-Lh-Ar.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hgrg") {
		objLoader.load('Hh-Bg-Lr-Ag.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hgrh") {
		objLoader.load('Hh-Bg-Lr-Ah.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hgrr") {
		objLoader.load('Hh-Bg-Lr-Ar.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hhgg") {
		objLoader.load('Hh-Bh-Lg-Ag.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hhgh") {
		objLoader.load('Hh-Bh-Lg-Ah.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hhgr") {
		objLoader.load('Hh-Bh-Lg-Ar.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hhhg") {
		objLoader.load('Hh-Bh-Lh-Ag.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hhhh") {
		objLoader.load('Hh-Bh-Lh-Ah.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hhhr") {
		objLoader.load('Hh-Bh-Lh-Ar.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hhrg") {
		objLoader.load('Hh-Bh-Lr-Ag.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hhrh") {
		objLoader.load('Hh-Bh-Lr-Ah.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hhrr") {
		objLoader.load('Hh-Bh-Lr-Ar.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hrgg") {
		objLoader.load('Hh-Br-Lg-Ag.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hrgh") {
		objLoader.load('Hh-Br-Lg-Ah.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hrgr") {
		objLoader.load('Hh-Br-Lg-Ar.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hrhg") {
		objLoader.load('Hh-Br-Lh-Ag.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hrhh") {
		objLoader.load('Hh-Br-Lh-Ah.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hrhr") {
		objLoader.load('Hh-Br-Lh-Ar.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hrrg") {
		objLoader.load('Hh-Br-Lr-Ag.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hrrh") {
		objLoader.load('Hh-Br-Lr-Ah.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "hrrr") {
		objLoader.load('Hh-Br-Lr-Ar.obj', function (object) {
			object.scale.set(8, 8, 8);
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}

	// AO
	if (AAinitals == "pcdr") {
		objLoader.load('Hplane-Bcamel-Ldinosaur-Trabbit.obj', function (object) {
			object.scale.set(9, 9, 9);
			object.position.set(0, -5, 0); 
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "pccd") {
		objLoader.load('Hplane-Bcamel-Lcamel-Tdinosaur.obj', function (object) {
			object.scale.set(10, 10, 10);
			object.position.set(0, -5, 0); 
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}

	// HO
	if (AAinitals == "hhhp") {
		objLoader.load('Hhuman-Bhuman-Lhuman-Aplane.obj', function (object) {
			object.scale.set(8, 8, 8);
			object.position.set(0, -7, 0); 
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
	if (AAinitals == "phgp") {
		objLoader.load('Hp-Bh-Lg-Ap.obj', function (object) {
			object.scale.set(8, 8, 8);
			object.position.set(0, -7, 0); 
			scene.add(object);
			render(); 
			
			hybridModelList.push(object.id); 
		});
	}
}

window.openTab = openTab;
window.openSubTab = openSubTab;
window.allowDrop = allowDrop;
window.ondrag = ondrag;
window.onClickPart = onClickPart;
window.drop = drop;
window.drag = drag;
window.clearObjts = clearObjts;
window.clickAssembleBtn = onClickAssembleBtn;
window.clickAnimateBtn = onClickAnimateBtn; 
window.clickDownloadBtn = onClickDownloadBtn; 
window.clickMotionBtn = onClickMotionBtn;
window.clickConnectBtn = onClickConnectBtn;
window.clickMinusBtn = onClickMinusBtn;
window.clickPlusBtn = onClickPlusBtn;
window.playPause = playPause;
