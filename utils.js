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


function init() {

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

		if ( group.children.length === 0 ) {
			drag_controls.transformGroup = false;
			draggableObjects.push( ...objects );
		}
	}
	render();
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

	renderer.render( scene, camera );
}

container.addEventListener( 'mousemove', onMouseMove, false );
window.requestAnimationFrame(render);


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

	stats = new Stats();
	container.appendChild( stats.dom );
}

var panel, folder1, folder2, folder3;

function createPanel() {
	panel = new GUI( { width: 250 } );

	folder1 = panel.addFolder( 'Visibility' );
	folder2 = panel.addFolder( 'Quality Edit' );
	folder3 = panel.addFolder( 'Partial Body Edit' );

	settings = {
		'show model': true,
		'show skeleton': true,
		'partial body edit': partialBodyEdit,
		'light<>strong': 0.5,
		'free<>bound': 0.5,
		'happy<>sad': 0.5,
		'excited<>calm': 0.5,
		'upper body': ''
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

	folder1.open();
	folder2.open();
	folder3.open();
}

function partialBodyEdit () {

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



window.clickAnimateBtn = onClickAnimateBtn; 
window.clickDownloadBtn = onClickDownloadBtn; 
window.clickMotionBtn = onClickMotionBtn;
window.clickConnectBtn = onClickConnectBtn;
window.clickMinusBtn = onClickMinusBtn;
window.clickPlusBtn = onClickPlusBtn;
window.playPause = playPause;
