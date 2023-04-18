import {
	AnimationClip,
	FileLoader,
	Group,
	Loader,
	LoaderUtils,
	QuaternionKeyframeTrack,
	VectorKeyframeTrack
} from './three.module.js';

class SMPLJsonLoader extends Loader {

	constructor( manager ) {

		super( manager );

		this.dracoLoader = null;
		this.ktx2Loader = null;
		this.meshoptDecoder = null;

		this.pluginCallbacks = [];

	}

	load( url, onLoad, onProgress, onError ) {

		const scope = this;

		let resourcePath;

		if ( this.resourcePath !== '' ) {

			resourcePath = this.resourcePath;

		} else if ( this.path !== '' ) {

			resourcePath = this.path;

		} else {

			resourcePath = LoaderUtils.extractUrlBase( url );

		}

		let resourceName = url.substring( url.lastIndexOf('/')+1, url.length );

		// Tells the LoadingManager to track an extra item, which resolves after
		// the model is fully loaded. This means the count of items loaded will
		// be incorrect, but ensures manager.onLoad() does not fire early.
		this.manager.itemStart( url );

		const _onError = function ( e ) {

			if ( onError ) {

				onError( e );

			} else {

				console.error( e );

			}

			scope.manager.itemError( url );
			scope.manager.itemEnd( url );

		};

		const loader = new FileLoader( this.manager );

		loader.setPath( this.path );
		loader.setResponseType( 'arraybuffer' );
		loader.setRequestHeader( this.requestHeader );
		loader.setWithCredentials( this.withCredentials );

		loader.load( url, function ( data ) {

			try {

				scope.parse( data, resourcePath, resourceName, function ( gltf ) {

					onLoad( gltf );

					scope.manager.itemEnd( url );

				}, _onError );

			} catch ( e ) {

				_onError( e );

			}

		}, onProgress, _onError );

	}


	parse( data, path, filename, onLoad, onError ) {

		let content;
		const extensions = {};
		const plugins = {};

		if ( typeof data === 'string' ) {

			content = data;

		} else {

			content = LoaderUtils.decodeText( new Uint8Array( data ) );

		}

		const json = JSON.parse( content );

		const parser = new SMPLJsonParser( json, {

			path: path || this.resourcePath || '',
			name: filename,
			crossOrigin: this.crossOrigin,
			requestHeader: this.requestHeader,
			manager: this.manager

		} );

		parser.parse( onLoad, onError );

	}

	parseAsync( data, path ) {

		const scope = this;

		return new Promise( function ( resolve, reject ) {

			scope.parse( data, path, resolve, reject );

		} );

	}

}

const joints = [
"m_avg_Pelvis"
,"m_avg_L_Hip"
,"m_avg_R_Hip"
,"m_avg_Spine1"

,"m_avg_L_Knee"
,"m_avg_R_Knee"
,"m_avg_Spine2"

,"m_avg_L_Ankle"
,"m_avg_R_Ankle"
,"m_avg_Spine3"

,"m_avg_L_Foot"
,"m_avg_R_Foot"
,"m_avg_Neck"

,"m_avg_L_Collar"
,"m_avg_R_Collar"

,"m_avg_Head"
,"m_avg_L_Shoulder"
,"m_avg_R_Shoulder"

,"m_avg_L_Elbow"
,"m_avg_R_Elbow"
,"m_avg_L_Wrist"
,"m_avg_R_Wrist"
,"m_avg_L_Hand"
,"m_avg_R_Hand"]

/* GLTF PARSER */

class SMPLJsonParser {

	constructor( json = {}, options = {} ) {

		this.json = json;
		this.options = options;

	}

	parse( onLoad, onError ) {

		const parser = this;
		const json = this.json;

		try {
			let tracks = [];
			joints.forEach( function(name){
				let frameTrack = new QuaternionKeyframeTrack(
					name + '.quaternion',
					json.times,
					json[name]
				);
				tracks.push(frameTrack);
			});
			let frameTrack = new VectorKeyframeTrack(
				'm_avg_root' + '.position',
				json.times,
				json.position
			);
			tracks.push(frameTrack);

			let animations = [new AnimationClip(this.options.name, -1, tracks)];
			let results = new Group();
			results.animations = animations;
	
	
			onLoad(results);
		}
		catch (e) {
			onError(e);
		}



	}
}

export { SMPLJsonLoader };